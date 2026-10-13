// Resets the database in MONGO_URI and loads demo data: npm run seed
import 'dotenv/config';
import { connectDB, disconnectDB } from '../config/db.js';
import { MONGO_URI } from '../config/env.js';
import { seedDatabase } from './seedData.js';

if (!MONGO_URI) {
  console.log('MONGO_URI is not set, so there is nothing to seed: the in-memory database seeds itself on start.');
  process.exit(0);
}

await connectDB();
const counts = await seedDatabase({ reset: true });
console.log(`Seeded ${counts.users} users, ${counts.donations} listings and ${counts.claims} requests.`);
await disconnectDB();
