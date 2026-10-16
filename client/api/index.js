// Vercel serverless entry: runs the Express API from ../server as one function.
// The project's Root Directory is "client", so this file is served at /api and
// vercel.json rewrites every /api/* and /uploads/* request to it. Express sees
// the original URL and routes as usual.

let ready = null;
let refresh = null;
let lastRefresh = 0;
const REFRESH_EVERY_MS = 15 * 60 * 1000;

async function init() {
  if (!process.env.MONGO_URI) {
    throw Object.assign(new Error('MONGO_URI is not set. Add your MongoDB Atlas connection string in the Vercel project environment variables.'), { expose: true });
  }
  if (!process.env.JWT_SECRET) {
    throw Object.assign(new Error('JWT_SECRET is not set. Add it in the Vercel project environment variables.'), { expose: true });
  }
  const { default: app } = await import('../../server/src/app.js');
  const { connectDB } = await import('../../server/src/config/db.js');
  const { seedDatabase, refreshDemoListings } = await import('../../server/src/seed/seedData.js');
  const { default: User } = await import('../../server/src/models/User.js');

  await connectDB();
  // Fresh database: load the demo data once so the site isn't empty
  if ((await User.estimatedDocumentCount()) === 0) await seedDatabase();
  refresh = refreshDemoListings;
  return app;
}

export default async function handler(req, res) {
  try {
    ready ??= init();
    const app = await ready;
    // Re-open expired demo listings (cheap; at most every 15 minutes per instance)
    if (refresh && Date.now() - lastRefresh > REFRESH_EVERY_MS) {
      lastRefresh = Date.now();
      await refresh().catch((e) => console.error('Demo refresh failed:', e.message));
    }
    return app(req, res);
  } catch (err) {
    ready = null; // retry on the next request
    console.error('API startup failed:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    // Never leak driver errors (they can echo parts of the connection string)
    res.end(JSON.stringify({ message: err.expose ? err.message : 'Database connection failed. Check MONGO_URI in the Vercel environment variables and the Vercel function logs.' }));
  }
}
