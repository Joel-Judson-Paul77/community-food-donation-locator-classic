import Donation from '../models/Donation.js';
import Claim from '../models/Claim.js';
import { HttpError, escapeRegex, parsePaging, removeUpload } from '../utils/helpers.js';
import { publicUploadPath } from '../middleware/upload.js';

const TEXT_FIELDS = ['title', 'description', 'category', 'unit', 'address', 'pickupInstructions'];

/** Normalises JSON or multipart form input into Donation fields. */
function parseDonationInput(body) {
  const data = {};
  for (const key of TEXT_FIELDS) if (body[key] !== undefined) data[key] = String(body[key]).trim();
  if (body.quantity !== undefined) data.quantity = Number(body.quantity);
  if (body.expiresAt !== undefined) data.expiresAt = new Date(body.expiresAt);
  if (body.dietary !== undefined) {
    data.dietary = (Array.isArray(body.dietary) ? body.dietary : String(body.dietary).split(','))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (body.lat !== undefined || body.lng !== undefined) {
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw new HttpError(400, 'Please choose a valid pickup location on the map');
    }
    data.location = { type: 'Point', coordinates: [lng, lat] };
  }
  if (data.expiresAt && Number.isNaN(data.expiresAt.getTime())) {
    throw new HttpError(400, 'Invalid pickup-by time');
  }
  return data;
}

function assertOwnerOrAdmin(donation, user) {
  const ownerId = donation.donor._id ?? donation.donor;
  if (!ownerId.equals(user._id) && user.role !== 'admin') {
    throw new HttpError(403, 'You can only manage your own listings');
  }
}

// GET /api/donations  — public search with optional location filter
// Query: q, category, dietary, lat, lng, radius (km), sort (newest|expiring|distance|quantity), page, limit
export async function listDonations(req, res) {
  await Donation.expireStale();
  const { q, category, dietary, sort = 'newest' } = req.query;
  const { page, limit, skip } = parsePaging(req.query);

  const match = { status: 'available', quantityAvailable: { $gt: 0 }, expiresAt: { $gt: new Date() } };
  if (q?.trim()) {
    const rx = new RegExp(escapeRegex(q.trim()), 'i');
    match.$or = [{ title: rx }, { description: rx }, { address: rx }];
  }
  if (category) match.category = { $in: String(category).split(',') };
  if (dietary) match.dietary = { $all: String(dietary).split(',') };

  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radiusKm = parseFloat(req.query.radius);
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);

  const pipeline = [];
  if (hasPoint) {
    const geoNear = {
      near: { type: 'Point', coordinates: [lng, lat] },
      distanceField: 'distance',
      spherical: true,
      query: match,
    };
    if (radiusKm > 0) geoNear.maxDistance = radiusKm * 1000;
    pipeline.push({ $geoNear: geoNear });
  } else {
    pipeline.push({ $match: match });
  }

  const sorts = {
    newest: { createdAt: -1 },
    expiring: { expiresAt: 1 },
    quantity: { quantityAvailable: -1 },
    distance: hasPoint ? { distance: 1 } : { createdAt: -1 },
  };
  pipeline.push({ $sort: { ...(sorts[sort] || sorts.newest), _id: 1 } });

  const itemStages = [
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'donor',
        foreignField: '_id',
        as: 'donor',
        pipeline: [{ $project: { name: 1, organization: 1 } }],
      },
    },
    { $unwind: '$donor' },
    { $project: { __v: 0 } },
  ];
  if (hasPoint) itemStages.push({ $addFields: { distanceKm: { $round: [{ $divide: ['$distance', 1000] }, 2] } } });

  pipeline.push({ $facet: { items: itemStages, total: [{ $count: 'count' }] } });

  const [result] = await Donation.aggregate(pipeline);
  const total = result.total[0]?.count || 0;
  res.json({ items: result.items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}

// GET /api/donations/:id
export async function getDonation(req, res) {
  const donation = await Donation.findById(req.params.id).populate('donor', 'name organization phone');
  if (!donation) throw new HttpError(404, 'Listing not found');

  if (donation.status === 'available' && donation.expiresAt <= new Date()) {
    donation.status = 'expired';
    await donation.save();
  }

  const user = req.user;
  const isOwner = Boolean(user && donation.donor._id.equals(user._id));
  let myClaim = null;
  if (user?.role === 'recipient') {
    myClaim = await Claim.findOne({ donation: donation._id, recipient: user._id }).sort('-createdAt');
  }

  // Donor phone number is only shared once a request has been approved
  const canSeeContact = isOwner || user?.role === 'admin' || ['approved', 'collected'].includes(myClaim?.status);
  const out = donation.toJSON();
  if (!canSeeContact) delete out.donor.phone;

  res.json({ donation: out, myClaim, isOwner });
}

// GET /api/donations/mine  (donor)
export async function myDonations(req, res) {
  await Donation.expireStale();
  const filter = { donor: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const donations = await Donation.find(filter).sort('-createdAt').lean();
  const counts = await Claim.aggregate([
    { $match: { donor: req.user._id } },
    { $group: { _id: { donation: '$donation', status: '$status' }, n: { $sum: 1 } } },
  ]);

  const byDonation = {};
  for (const { _id, n } of counts) {
    const key = _id.donation.toString();
    byDonation[key] ??= {};
    byDonation[key][_id.status] = n;
  }
  res.json(donations.map((d) => ({ ...d, claimCounts: byDonation[d._id.toString()] || {} })));
}

// POST /api/donations  (donor)
export async function createDonation(req, res) {
  const data = parseDonationInput(req.body);
  if (!data.location) throw new HttpError(400, 'Please choose the pickup location on the map');
  if (!(data.expiresAt > new Date())) throw new HttpError(400, 'Pickup-by time must be in the future');
  if (req.file) data.image = publicUploadPath(req.file);

  const donation = await Donation.create({ ...data, donor: req.user._id });
  res.status(201).json(donation);
}

// PUT /api/donations/:id  (owner or admin)
export async function updateDonation(req, res) {
  const donation = await Donation.findById(req.params.id);
  if (!donation) throw new HttpError(404, 'Listing not found');
  assertOwnerOrAdmin(donation, req.user);
  if (!['available', 'reserved', 'expired'].includes(donation.status)) {
    throw new HttpError(400, `A ${donation.status} listing can no longer be edited`);
  }

  const data = parseDonationInput(req.body);
  if (data.quantity !== undefined) {
    const committed = donation.quantity - donation.quantityAvailable;
    if (data.quantity < committed) {
      throw new HttpError(400, `Quantity can't be lower than the ${committed} ${donation.unit} already promised to recipients`);
    }
    donation.quantityAvailable = data.quantity - committed;
  }
  if (data.expiresAt && !(data.expiresAt > new Date())) {
    throw new HttpError(400, 'Pickup-by time must be in the future');
  }

  Object.assign(donation, data);
  if (req.file) {
    removeUpload(donation.image);
    donation.image = publicUploadPath(req.file);
  } else if (req.body.removeImage === 'true' || req.body.removeImage === true) {
    removeUpload(donation.image);
    donation.image = undefined;
  }

  // Re-open an expired/reserved listing if it now has time and quantity left
  if (donation.expiresAt > new Date()) {
    donation.status = donation.quantityAvailable > 0 ? 'available' : 'reserved';
  }

  await donation.save();
  res.json(donation);
}

// PATCH /api/donations/:id/cancel  (owner or admin) — withdraws the listing
export async function cancelDonation(req, res) {
  const donation = await Donation.findById(req.params.id);
  if (!donation) throw new HttpError(404, 'Listing not found');
  assertOwnerOrAdmin(donation, req.user);
  if (['completed', 'cancelled'].includes(donation.status)) {
    throw new HttpError(400, `This listing is already ${donation.status}`);
  }

  donation.status = 'cancelled';
  await donation.save();
  const note = 'The donor withdrew this listing';
  await Claim.updateMany({ donation: donation._id, status: 'pending' }, { status: 'rejected', donorNote: note, respondedAt: new Date() });
  await Claim.updateMany({ donation: donation._id, status: 'approved' }, { status: 'cancelled', donorNote: note });
  res.json(donation);
}

// PATCH /api/donations/:id/complete  (owner) — closes the listing, nothing more to give
export async function completeDonation(req, res) {
  const donation = await Donation.findById(req.params.id);
  if (!donation) throw new HttpError(404, 'Listing not found');
  assertOwnerOrAdmin(donation, req.user);
  if (['completed', 'cancelled'].includes(donation.status)) {
    throw new HttpError(400, `This listing is already ${donation.status}`);
  }

  donation.status = 'completed';
  await donation.save();
  await Claim.updateMany(
    { donation: donation._id, status: 'pending' },
    { status: 'rejected', donorNote: 'The listing was closed by the donor', respondedAt: new Date() }
  );
  res.json(donation);
}
