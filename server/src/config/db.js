import mongoose from 'mongoose';
import { MONGO_URI } from './env.js';
import User from '../models/User.js';
import Donation from '../models/Donation.js';
import Claim from '../models/Claim.js';

let memoryServer = null;

/**
 * Connects to MongoDB. When MONGO_URI is not set, an in-memory MongoDB is
 * started instead so the project runs with zero setup (data resets on restart).
 */
export async function connectDB(uri = MONGO_URI) {
  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri('foodshare');
  }
  await mongoose.connect(uri);
  // Make sure indexes (unique email, 2dsphere location) exist before serving requests
  await Promise.all([User.init(), Donation.init(), Claim.init()]);
  return { inMemory: Boolean(memoryServer) };
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
