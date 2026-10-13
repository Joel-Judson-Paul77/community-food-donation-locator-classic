import 'dotenv/config';
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { PORT } from './config/env.js';
import { seedDatabase } from './seed/seedData.js';
import User from './models/User.js';

const { inMemory } = await connectDB();

if (inMemory) {
  await seedDatabase();
  console.log('⚠  No MONGO_URI set: using a temporary in-memory MongoDB seeded with demo data.');
  console.log('   Data resets on every restart. Set MONGO_URI in server/.env to keep data.');
} else if ((await User.estimatedDocumentCount()) === 0) {
  console.log('ℹ  Database is empty. Run "npm run seed" to load demo data.');
}

const server = app.listen(PORT, () => {
  console.log(`✔  API ready on http://localhost:${PORT}/api`);
});

async function shutdown() {
  server.close();
  await disconnectDB();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
