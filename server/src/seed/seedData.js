import User from '../models/User.js';
import Donation from '../models/Donation.js';
import Claim from '../models/Claim.js';

// Demo accounts — for local development only. Listed in the README.
export const DEMO_PASSWORD = 'Password@123';
const users = [
  { key: 'admin', name: 'Platform Admin', email: 'admin@foodshare.test', role: 'admin', phone: '9000000001' },
  {
    key: 'annapurna', name: 'Lakshmi Rao', email: 'annapurna@foodshare.test', role: 'donor',
    organization: 'Annapurna Kitchen', phone: '9000000002', address: 'Road No. 12, Banjara Hills, Hyderabad',
  },
  {
    key: 'freshmart', name: 'Arjun Mehta', email: 'freshmart@foodshare.test', role: 'donor',
    organization: 'FreshMart Supermarket', phone: '9000000003', address: 'Hitech City Road, Madhapur, Hyderabad',
  },
  {
    key: 'hope', name: 'Sister Mary Joseph', email: 'hope@foodshare.test', role: 'recipient',
    organization: 'Hope Shelter Home', phone: '9000000004', address: 'Ameerpet, Hyderabad',
  },
  {
    key: 'ravi', name: 'Ravi Kumar', email: 'ravi@foodshare.test', role: 'recipient',
    phone: '9000000005', address: 'Kukatpally, Hyderabad',
  },
];

const hours = (h) => new Date(Date.now() + h * 60 * 60 * 1000);

// [lng, lat] around Hyderabad
const donations = [
  {
    key: 'biryani', donor: 'annapurna', title: 'Veg biryani & raita (party leftovers)', category: 'cooked-meals',
    dietary: ['vegetarian'], quantity: 40, unit: 'servings', expiresAt: hours(5),
    address: 'Road No. 12, Banjara Hills, Hyderabad', coordinates: [78.4482, 17.4126],
    description: 'Freshly cooked for a corporate lunch that ended early. Packed in sealed foil trays.',
    pickupInstructions: 'Ask for Lakshmi at the back entrance.',
  },
  {
    key: 'bread', donor: 'freshmart', title: 'Bread loaves & buns (best before tomorrow)', category: 'bakery',
    dietary: ['vegetarian'], quantity: 25, unit: 'packets', expiresAt: hours(20),
    address: 'Hitech City Road, Madhapur, Hyderabad', coordinates: [78.3915, 17.4483],
    description: 'Unsold bakery stock, still fresh. Whole wheat and milk bread.',
  },
  {
    key: 'veggies', donor: 'freshmart', title: 'Tomatoes, onions & leafy greens', category: 'fruits-vegetables',
    dietary: ['vegan', 'vegetarian', 'gluten-free', 'jain'], quantity: 30, unit: 'kg', expiresAt: hours(30),
    address: 'Hitech City Road, Madhapur, Hyderabad', coordinates: [78.3915, 17.4483],
    description: 'Slightly blemished produce, perfectly good for cooking.',
  },
  {
    key: 'milk', donor: 'freshmart', title: 'Toned milk packets', category: 'dairy',
    dietary: ['vegetarian'], quantity: 24, unit: 'litres', expiresAt: hours(10),
    address: 'DLF Road, Gachibowli, Hyderabad', coordinates: [78.3489, 17.4401],
    description: 'Refrigerated. Please bring an insulated bag.',
  },
  {
    key: 'chapati', donor: 'annapurna', title: 'Chapati with dal & mixed veg curry', category: 'cooked-meals',
    dietary: ['vegetarian'], quantity: 60, unit: 'meals', expiresAt: hours(4),
    address: 'Prakash Nagar, Begumpet, Hyderabad', coordinates: [78.4664, 17.4447],
    description: 'Wedding catering surplus. Hot and packed in individual boxes.',
  },
  {
    key: 'rice', donor: 'annapurna', title: 'Rice & toor dal (sealed bags)', category: 'grains-staples',
    dietary: ['vegan', 'vegetarian', 'gluten-free'], quantity: 15, unit: 'kg', expiresAt: hours(24 * 6),
    address: 'Road No. 12, Banjara Hills, Hyderabad', coordinates: [78.4482, 17.4126],
    description: 'Extra stock from bulk purchase. Unopened.',
  },
  {
    key: 'chicken', donor: 'annapurna', title: 'Chicken curry & jeera rice', category: 'cooked-meals',
    dietary: ['non-vegetarian', 'halal'], quantity: 20, unit: 'servings', expiresAt: hours(3),
    address: 'SD Road, Secunderabad', coordinates: [78.4983, 17.4399],
  },
  {
    key: 'biscuits', donor: 'freshmart', title: 'Biscuits & snack packs (near expiry)', category: 'packaged',
    dietary: ['vegetarian'], quantity: 50, unit: 'packets', expiresAt: hours(24 * 3),
    address: 'Main Road, Dilsukhnagar, Hyderabad', coordinates: [78.5247, 17.3688],
  },
  {
    key: 'juice', donor: 'freshmart', title: 'Fruit juice tetra packs', category: 'beverages',
    dietary: ['vegan', 'vegetarian', 'gluten-free'], quantity: 36, unit: 'items', expiresAt: hours(24 * 2),
    address: 'KPHB Colony, Kukatpally, Hyderabad', coordinates: [78.4138, 17.4849],
  },
  {
    key: 'fruits', donor: 'freshmart', title: 'Bananas & apples', category: 'fruits-vegetables',
    dietary: ['vegan', 'vegetarian', 'gluten-free', 'jain'], quantity: 18, unit: 'kg', expiresAt: hours(16),
    address: 'Road No. 36, Jubilee Hills, Hyderabad', coordinates: [78.4071, 17.4325],
  },
  // History, so dashboards have something to show
  {
    key: 'sweets', donor: 'annapurna', title: 'Festival sweets boxes', category: 'other',
    dietary: ['vegetarian'], quantity: 10, unit: 'boxes', expiresAt: hours(-30), status: 'completed', quantityAvailable: 0,
    address: 'Road No. 12, Banjara Hills, Hyderabad', coordinates: [78.4482, 17.4126],
  },
  {
    key: 'curd', donor: 'freshmart', title: 'Curd cups', category: 'dairy',
    dietary: ['vegetarian'], quantity: 20, unit: 'items', expiresAt: hours(-5), status: 'expired',
    address: 'Ayyappa Society, Madhapur, Hyderabad', coordinates: [78.3915, 17.4483],
  },
];

const claims = [
  { donation: 'biryani', recipient: 'hope', quantity: 25, status: 'pending', message: 'For 25 residents at our shelter tonight. We can pick up by 7pm.' },
  { donation: 'chapati', recipient: 'hope', quantity: 30, status: 'approved', message: 'Dinner for our residents.', donorNote: 'Ready at the counter.' },
  { donation: 'bread', recipient: 'ravi', quantity: 5, status: 'pending', message: 'For families in my lane.' },
  { donation: 'sweets', recipient: 'hope', quantity: 6, status: 'collected', message: 'For the children.' },
  { donation: 'sweets', recipient: 'ravi', quantity: 4, status: 'collected' },
  { donation: 'milk', recipient: 'ravi', quantity: 4, status: 'rejected', donorNote: 'Sorry, reserved for a shelter already.' },
];

export async function seedDatabase({ reset = false } = {}) {
  if (reset) {
    await Promise.all([User.deleteMany({}), Donation.deleteMany({}), Claim.deleteMany({})]);
  }

  const userDocs = {};
  for (const { key, ...data } of users) {
    userDocs[key] = await User.create({ ...data, password: DEMO_PASSWORD });
  }

  const donationDocs = {};
  for (const { key, donor, coordinates, ...data } of donations) {
    donationDocs[key] = await Donation.create({
      ...data,
      donor: userDocs[donor]._id,
      location: { type: 'Point', coordinates },
    });
  }

  for (const c of claims) {
    const donation = donationDocs[c.donation];
    await Claim.create({
      ...c,
      donation: donation._id,
      donor: donation.donor,
      recipient: userDocs[c.recipient]._id,
      respondedAt: c.status === 'pending' ? undefined : new Date(),
      collectedAt: c.status === 'collected' ? new Date() : undefined,
    });
    if (c.status === 'approved') {
      await Donation.updateOne({ _id: donation._id }, { $inc: { quantityAvailable: -c.quantity } });
    }
  }

  return { users: users.length, donations: donations.length, claims: claims.length };
}
