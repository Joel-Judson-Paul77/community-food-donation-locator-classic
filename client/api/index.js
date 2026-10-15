// Vercel serverless entry: runs the Express API from ../server as one function.
// The project's Root Directory is "client", so this file is served at /api and
// vercel.json rewrites every /api/* and /uploads/* request to it. Express sees
// the original URL and routes as usual.

let ready = null;

async function init() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set. Add your MongoDB Atlas connection string in the Vercel project environment variables.');
  }
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set. Add it in the Vercel project environment variables.');
  }
  const { default: app } = await import('../../server/src/app.js');
  const { connectDB } = await import('../../server/src/config/db.js');
  const { seedDatabase } = await import('../../server/src/seed/seedData.js');
  const { default: User } = await import('../../server/src/models/User.js');

  await connectDB();
  // Fresh database: load the demo data once so the site isn't empty
  if ((await User.estimatedDocumentCount()) === 0) await seedDatabase();
  return app;
}

export default async function handler(req, res) {
  try {
    ready ??= init();
    const app = await ready;
    return app(req, res);
  } catch (err) {
    ready = null; // retry on the next request
    console.error('API startup failed:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: err.message || 'API failed to start' }));
  }
}
