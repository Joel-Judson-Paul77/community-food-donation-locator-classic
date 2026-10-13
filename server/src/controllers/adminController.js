import User, { ROLES } from '../models/User.js';
import Donation from '../models/Donation.js';
import Claim from '../models/Claim.js';
import { HttpError, escapeRegex, parsePaging, removeUpload } from '../utils/helpers.js';

const groupCount = (Model, field, match = {}) =>
  Model.aggregate([{ $match: match }, { $group: { _id: `$${field}`, n: { $sum: 1 } } }]).then((rows) =>
    Object.fromEntries(rows.map((r) => [r._id, r.n]))
  );

// GET /api/admin/stats
export async function adminStats(_req, res) {
  await Donation.expireStale();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [usersByRole, blockedUsers, donationsByStatus, donationsByCategory, claimsByStatus, collected, newUsers, newDonations] =
    await Promise.all([
      groupCount(User, 'role'),
      User.countDocuments({ isActive: false }),
      groupCount(Donation, 'status'),
      groupCount(Donation, 'category'),
      groupCount(Claim, 'status'),
      Claim.aggregate([{ $match: { status: 'collected' } }, { $group: { _id: null, q: { $sum: '$quantity' } } }]),
      User.countDocuments({ createdAt: { $gte: since } }),
      Donation.countDocuments({ createdAt: { $gte: since } }),
    ]);

  res.json({
    usersByRole,
    blockedUsers,
    donationsByStatus,
    donationsByCategory,
    claimsByStatus,
    itemsShared: collected[0]?.q || 0,
    last7Days: { newUsers, newDonations },
  });
}

// GET /api/admin/users  query: q, role, status (active|blocked), page, limit
export async function listUsers(req, res) {
  const { q, role, status } = req.query;
  const { page, limit, skip } = parsePaging(req.query, 20);
  const filter = {};
  if (q?.trim()) {
    const rx = new RegExp(escapeRegex(q.trim()), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { organization: rx }];
  }
  if (role) filter.role = role;
  if (status === 'active') filter.isActive = true;
  if (status === 'blocked') filter.isActive = false;

  const [items, total] = await Promise.all([
    User.find(filter).sort('-createdAt').skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}

// PATCH /api/admin/users/:id  body: { role?, isActive? }
export async function updateUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');
  if (user._id.equals(req.user._id)) throw new HttpError(400, "You can't change your own role or status");

  if (req.body.role !== undefined) {
    if (!ROLES.includes(req.body.role)) throw new HttpError(400, 'Invalid role');
    user.role = req.body.role;
  }
  if (req.body.isActive !== undefined) user.isActive = Boolean(req.body.isActive);

  await user.save();
  res.json(user);
}

// DELETE /api/admin/users/:id — removes the user with their listings and requests
export async function deleteUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');
  if (user._id.equals(req.user._id)) throw new HttpError(400, "You can't delete your own account");

  const donations = await Donation.find({ donor: user._id }, 'image');
  donations.forEach((d) => removeUpload(d.image));

  // Return quantities this recipient had reserved to other donors' listings
  const approved = await Claim.find({ recipient: user._id, status: 'approved' });
  for (const c of approved) {
    await Donation.updateOne({ _id: c.donation }, { $inc: { quantityAvailable: c.quantity } });
    await Donation.updateOne(
      { _id: c.donation, status: 'reserved', quantityAvailable: { $gt: 0 }, expiresAt: { $gt: new Date() } },
      { status: 'available' }
    );
  }

  await Promise.all([
    Claim.deleteMany({ $or: [{ recipient: user._id }, { donor: user._id }] }),
    Donation.deleteMany({ donor: user._id }),
  ]);
  await user.deleteOne();
  res.status(204).end();
}

// GET /api/admin/donations  query: q, status, page, limit
export async function listAllDonations(req, res) {
  await Donation.expireStale();
  const { q, status } = req.query;
  const { page, limit, skip } = parsePaging(req.query, 20);
  const filter = {};
  if (status) filter.status = status;
  if (q?.trim()) {
    const rx = new RegExp(escapeRegex(q.trim()), 'i');
    filter.$or = [{ title: rx }, { address: rx }];
  }

  const [items, total] = await Promise.all([
    Donation.find(filter).sort('-createdAt').skip(skip).limit(limit).populate('donor', 'name email organization'),
    Donation.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}

// DELETE /api/admin/donations/:id — permanently removes an inappropriate listing
export async function deleteDonation(req, res) {
  const donation = await Donation.findById(req.params.id);
  if (!donation) throw new HttpError(404, 'Listing not found');
  removeUpload(donation.image);
  await Claim.deleteMany({ donation: donation._id });
  await donation.deleteOne();
  res.status(204).end();
}

// GET /api/admin/claims  query: status, page, limit
export async function listAllClaims(req, res) {
  const { page, limit, skip } = parsePaging(req.query, 20);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    Claim.find(filter)
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .populate('donation', 'title unit')
      .populate('donor', 'name organization')
      .populate('recipient', 'name organization'),
    Claim.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}
