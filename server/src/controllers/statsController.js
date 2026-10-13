import User from '../models/User.js';
import Donation from '../models/Donation.js';
import Claim from '../models/Claim.js';

function countBy(rows) {
  return Object.fromEntries(rows.map((r) => [r._id, r.n]));
}

async function collectedTotals(match) {
  const [row] = await Claim.aggregate([
    { $match: { ...match, status: 'collected' } },
    { $group: { _id: null, quantity: { $sum: '$quantity' }, pickups: { $sum: 1 }, people: { $addToSet: '$recipient' } } },
  ]);
  return { quantity: row?.quantity || 0, pickups: row?.pickups || 0, people: row?.people.length || 0 };
}

// GET /api/stats/public — impact numbers for the home page
export async function publicStats(_req, res) {
  await Donation.expireStale();
  const [donors, recipients, totalDonations, availableNow, collected] = await Promise.all([
    User.countDocuments({ role: 'donor', isActive: true }),
    User.countDocuments({ role: 'recipient', isActive: true }),
    Donation.countDocuments({ status: { $ne: 'cancelled' } }),
    Donation.countDocuments({ status: 'available', expiresAt: { $gt: new Date() } }),
    collectedTotals({}),
  ]);
  res.json({
    donors,
    recipients,
    totalDonations,
    availableNow,
    itemsShared: collected.quantity,
    pickups: collected.pickups,
  });
}

// GET /api/stats/me — numbers for the signed-in user's dashboard
export async function myStats(req, res) {
  const id = req.user._id;

  if (req.user.role === 'donor') {
    await Donation.expireStale();
    const [listings, requests, collected] = await Promise.all([
      Donation.aggregate([{ $match: { donor: id } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
      Claim.aggregate([{ $match: { donor: id } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
      collectedTotals({ donor: id }),
    ]);
    const byStatus = countBy(listings);
    return res.json({
      role: 'donor',
      totalListings: Object.values(byStatus).reduce((a, b) => a + b, 0),
      listings: byStatus,
      requests: countBy(requests),
      itemsShared: collected.quantity,
      peopleHelped: collected.people,
    });
  }

  if (req.user.role === 'recipient') {
    const [requests, collected] = await Promise.all([
      Claim.aggregate([{ $match: { recipient: id } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
      collectedTotals({ recipient: id }),
    ]);
    return res.json({
      role: 'recipient',
      requests: countBy(requests),
      itemsReceived: collected.quantity,
      pickups: collected.pickups,
    });
  }

  res.json({ role: req.user.role });
}
