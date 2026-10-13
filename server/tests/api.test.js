// End-to-end API tests against a throwaway in-memory MongoDB: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.NODE_ENV = 'test';
const { default: app } = await import('../src/app.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { default: User } = await import('../src/models/User.js');

const api = request(app);
let donorToken, recipientToken, adminToken, donationId, claimId;

before(async () => {
  await connectDB('');
  await User.create({ name: 'Admin', email: 'admin@test.local', password: 'secret123', role: 'admin' });
});
after(disconnectDB);

const auth = (token) => ({ Authorization: `Bearer ${token}` });

test('registers donor and recipient, rejects admin self-signup', async () => {
  const donor = await api.post('/api/auth/register').send({
    name: 'Donor', email: 'donor@test.local', password: 'secret123', role: 'donor', organization: 'Cafe',
  });
  assert.equal(donor.status, 201);
  assert.equal(donor.body.user.password, undefined);
  donorToken = donor.body.token;

  const recipient = await api.post('/api/auth/register').send({
    name: 'Recipient', email: 'recipient@test.local', password: 'secret123', role: 'recipient',
  });
  assert.equal(recipient.status, 201);
  recipientToken = recipient.body.token;

  const sneaky = await api.post('/api/auth/register').send({
    name: 'X', email: 'x@test.local', password: 'secret123', role: 'admin',
  });
  assert.equal(sneaky.status, 400);

  const dupe = await api.post('/api/auth/register').send({ name: 'D', email: 'donor@test.local', password: 'secret123' });
  assert.equal(dupe.status, 409);
});

test('logs in and rejects bad passwords', async () => {
  const bad = await api.post('/api/auth/login').send({ email: 'admin@test.local', password: 'nope' });
  assert.equal(bad.status, 401);
  const ok = await api.post('/api/auth/login').send({ email: 'ADMIN@test.local', password: 'secret123' });
  assert.equal(ok.status, 200);
  adminToken = ok.body.token;
});

test('only donors can post food', async () => {
  const body = {
    title: 'Veg pulao', category: 'cooked-meals', quantity: 10, unit: 'servings',
    expiresAt: new Date(Date.now() + 3600e3).toISOString(), address: 'Somewhere',
    lat: 17.4, lng: 78.45, dietary: 'vegetarian,jain',
  };
  const denied = await api.post('/api/donations').set(auth(recipientToken)).send(body);
  assert.equal(denied.status, 403);

  const created = await api.post('/api/donations').set(auth(donorToken)).send(body);
  assert.equal(created.status, 201, created.body.message);
  assert.equal(created.body.quantityAvailable, 10);
  assert.deepEqual(created.body.dietary, ['vegetarian', 'jain']);
  donationId = created.body._id;

  const past = await api.post('/api/donations').set(auth(donorToken)).send({ ...body, expiresAt: '2000-01-01' });
  assert.equal(past.status, 400);
});

test('search finds listings by text and distance', async () => {
  const near = await api.get('/api/donations').query({ lat: 17.41, lng: 78.45, radius: 5, q: 'pulao' });
  assert.equal(near.status, 200);
  assert.equal(near.body.total, 1);
  assert.ok(near.body.items[0].distanceKm < 5);
  assert.equal(near.body.items[0].donor.name, 'Donor');

  const far = await api.get('/api/donations').query({ lat: 28.61, lng: 77.2, radius: 10 });
  assert.equal(far.body.total, 0);
});

test('claim flow: request → approve → collect', async () => {
  const tooMuch = await api.post('/api/claims').set(auth(recipientToken)).send({ donationId, quantity: 11 });
  assert.equal(tooMuch.status, 400);

  const claim = await api.post('/api/claims').set(auth(recipientToken)).send({ donationId, quantity: 10, message: 'Thanks' });
  assert.equal(claim.status, 201);
  claimId = claim.body._id;

  const dupe = await api.post('/api/claims').set(auth(recipientToken)).send({ donationId, quantity: 1 });
  assert.equal(dupe.status, 409);

  // Donor phone hidden until approval
  const before = await api.get(`/api/donations/${donationId}`).set(auth(recipientToken));
  assert.equal(before.body.myClaim.status, 'pending');

  const approved = await api.patch(`/api/claims/${claimId}/approve`).set(auth(donorToken)).send({});
  assert.equal(approved.status, 200);
  assert.equal(approved.body.status, 'approved');

  const listing = await api.get(`/api/donations/${donationId}`);
  assert.equal(listing.body.donation.status, 'reserved');
  assert.equal(listing.body.donation.quantityAvailable, 0);

  const collected = await api.patch(`/api/claims/${claimId}/collect`).set(auth(donorToken));
  assert.equal(collected.body.status, 'collected');

  const done = await api.get(`/api/donations/${donationId}`);
  assert.equal(done.body.donation.status, 'completed');

  const stats = await api.get('/api/stats/me').set(auth(donorToken));
  assert.equal(stats.body.itemsShared, 10);
  assert.equal(stats.body.peopleHelped, 1);
});

test('admin routes are admin-only and can block users', async () => {
  const denied = await api.get('/api/admin/stats').set(auth(donorToken));
  assert.equal(denied.status, 403);

  const users = await api.get('/api/admin/users').set(auth(adminToken)).query({ role: 'recipient' });
  assert.equal(users.body.total, 1);

  const blocked = await api.patch(`/api/admin/users/${users.body.items[0]._id}`).set(auth(adminToken)).send({ isActive: false });
  assert.equal(blocked.body.isActive, false);

  const locked = await api.get('/api/auth/me').set(auth(recipientToken));
  assert.equal(locked.status, 403);
});
