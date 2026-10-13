import Claim from '../models/Claim.js';
import Donation from '../models/Donation.js';
import { HttpError } from '../utils/helpers.js';

const CONTACT_VISIBLE = ['approved', 'collected'];

async function loadClaim(id) {
  const claim = await Claim.findById(id);
  if (!claim) throw new HttpError(404, 'Request not found');
  return claim;
}

function assertDonor(claim, user) {
  if (!claim.donor.equals(user._id)) throw new HttpError(403, 'Only the donor of this listing can do this');
}

/** Atomically moves a claim between states so two clicks can't both succeed. */
async function transition(claim, from, update) {
  const updated = await Claim.findOneAndUpdate({ _id: claim._id, status: from }, update, { new: true });
  if (!updated) throw new HttpError(409, 'This request was updated by someone else. Please refresh.');
  return updated;
}

// POST /api/claims  (recipient)  body: { donationId, quantity, message }
export async function createClaim(req, res) {
  const { donationId, message } = req.body;
  const quantity = Number(req.body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) throw new HttpError(400, 'Enter a whole quantity of at least 1');

  const donation = await Donation.findById(donationId);
  if (!donation) throw new HttpError(404, 'Listing not found');
  if (donation.status !== 'available' || donation.expiresAt <= new Date()) {
    throw new HttpError(400, 'This listing is no longer available');
  }
  if (quantity > donation.quantityAvailable) {
    throw new HttpError(400, `Only ${donation.quantityAvailable} ${donation.unit} left`);
  }

  const active = await Claim.exists({
    donation: donation._id,
    recipient: req.user._id,
    status: { $in: ['pending', 'approved'] },
  });
  if (active) throw new HttpError(409, 'You already have an active request for this listing');

  const claim = await Claim.create({
    donation: donation._id,
    donor: donation.donor,
    recipient: req.user._id,
    quantity,
    message,
  });
  res.status(201).json(claim);
}

// GET /api/claims/mine  (recipient)
export async function myClaims(req, res) {
  const filter = { recipient: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const claims = await Claim.find(filter)
    .sort('-createdAt')
    .populate('donation', 'title address unit image expiresAt status location category')
    .populate('donor', 'name organization phone')
    .lean();

  for (const c of claims) if (c.donor && !CONTACT_VISIBLE.includes(c.status)) delete c.donor.phone;
  res.json(claims);
}

// GET /api/claims/incoming  (donor)  query: status, donation
export async function incomingClaims(req, res) {
  const filter = { donor: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.donation) filter.donation = req.query.donation;

  const claims = await Claim.find(filter)
    .sort('-createdAt')
    .populate('donation', 'title unit quantity quantityAvailable status')
    .populate('recipient', 'name organization phone email');
  res.json(claims);
}

// PATCH /api/claims/:id/approve  (donor)  body: { note }
export async function approveClaim(req, res) {
  const claim = await loadClaim(req.params.id);
  assertDonor(claim, req.user);
  if (claim.status !== 'pending') throw new HttpError(400, `This request is already ${claim.status}`);

  // Reserve the quantity only if enough is still available
  const donation = await Donation.findOneAndUpdate(
    {
      _id: claim.donation,
      status: 'available',
      expiresAt: { $gt: new Date() },
      quantityAvailable: { $gte: claim.quantity },
    },
    { $inc: { quantityAvailable: -claim.quantity } },
    { new: true }
  );
  if (!donation) {
    throw new HttpError(409, 'Not enough quantity left (or the listing is no longer open) to approve this request');
  }

  let updated;
  try {
    updated = await transition(claim, 'pending', { status: 'approved', donorNote: req.body.note, respondedAt: new Date() });
  } catch (err) {
    await Donation.updateOne({ _id: donation._id }, { $inc: { quantityAvailable: claim.quantity } });
    throw err;
  }

  if (donation.quantityAvailable === 0) {
    await Donation.updateOne({ _id: donation._id, status: 'available' }, { status: 'reserved' });
    await Claim.updateMany(
      { donation: donation._id, status: 'pending' },
      { status: 'rejected', donorNote: 'All items have been claimed', respondedAt: new Date() }
    );
  }
  res.json(updated);
}

// PATCH /api/claims/:id/reject  (donor)  body: { note }
export async function rejectClaim(req, res) {
  const claim = await loadClaim(req.params.id);
  assertDonor(claim, req.user);
  if (claim.status !== 'pending') throw new HttpError(400, `This request is already ${claim.status}`);

  const updated = await transition(claim, 'pending', { status: 'rejected', donorNote: req.body.note, respondedAt: new Date() });
  res.json(updated);
}

// PATCH /api/claims/:id/collect  (donor) — food has been handed over
export async function collectClaim(req, res) {
  const claim = await loadClaim(req.params.id);
  assertDonor(claim, req.user);
  if (claim.status !== 'approved') throw new HttpError(400, 'Only approved requests can be marked as collected');

  const updated = await transition(claim, 'approved', { status: 'collected', collectedAt: new Date() });

  // Close the listing once everything has been handed over
  const donation = await Donation.findById(claim.donation);
  if (donation && donation.quantityAvailable === 0 && donation.status === 'reserved') {
    const outstanding = await Claim.exists({ donation: donation._id, status: 'approved' });
    if (!outstanding) {
      donation.status = 'completed';
      await donation.save();
    }
  }
  res.json(updated);
}

// PATCH /api/claims/:id/cancel  (recipient)
export async function cancelClaim(req, res) {
  const claim = await loadClaim(req.params.id);
  if (!claim.recipient.equals(req.user._id)) throw new HttpError(403, 'You can only cancel your own requests');
  if (!['pending', 'approved'].includes(claim.status)) {
    throw new HttpError(400, `This request is already ${claim.status}`);
  }

  const wasApproved = claim.status === 'approved';
  const updated = await transition(claim, claim.status, { status: 'cancelled' });

  if (wasApproved) {
    // Give the reserved quantity back to the listing
    const donation = await Donation.findByIdAndUpdate(
      claim.donation,
      { $inc: { quantityAvailable: claim.quantity } },
      { new: true }
    );
    if (donation?.status === 'reserved' && donation.expiresAt > new Date()) {
      donation.status = 'available';
      await donation.save();
    }
  }
  res.json(updated);
}
