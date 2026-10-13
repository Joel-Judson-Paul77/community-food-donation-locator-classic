import fs from 'node:fs';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN, UPLOAD_DIR } from '../config/env.js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function signToken(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parsePaging(query, defaultLimit = 12, maxLimit = 100) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

/** Deletes a file previously saved by the upload middleware (e.g. "/uploads/abc.jpg"). */
export function removeUpload(publicPath) {
  if (!publicPath?.startsWith('/uploads/')) return;
  const file = path.join(UPLOAD_DIR, path.basename(publicPath));
  fs.promises.unlink(file).catch(() => {});
}
