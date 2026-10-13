import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';
import { CLIENT_URL, CLIENT_DIST, NODE_ENV, UPLOAD_DIR } from './config/env.js';

const app = express();

app.use(cors({ origin: CLIENT_URL.split(',').map((s) => s.trim()) }));
app.use(express.json({ limit: '1mb' }));
if (NODE_ENV === 'development') app.use(morgan('dev'));

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use('/api', routes);

// In production, serve the built React app from the same server
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

export default app;
