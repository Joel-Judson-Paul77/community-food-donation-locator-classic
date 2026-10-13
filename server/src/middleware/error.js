import multer from 'multer';
import { HttpError, removeUpload } from '../utils/helpers.js';
import { publicUploadPath } from './upload.js';

export function notFound(req, _res, next) {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong';

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join('. ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    message = err.keyValue?.email ? 'An account with this email already exists' : 'Duplicate value';
  } else if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be smaller than 3 MB' : err.message;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  }

  // Don't keep an uploaded image if the request that carried it failed
  if (req.file) removeUpload(publicUploadPath(req.file));

  if (status >= 500) console.error(err);
  res.status(status).json({ message });
}
