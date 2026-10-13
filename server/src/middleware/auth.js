import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { JWT_SECRET } from '../config/env.js';
import { HttpError } from '../utils/helpers.js';

function readToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

async function userFromToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    throw new HttpError(401, 'Your session has expired. Please log in again.');
  }
  const user = await User.findById(payload.id);
  if (!user) throw new HttpError(401, 'Account no longer exists');
  if (!user.isActive) throw new HttpError(403, 'Your account has been suspended. Contact an administrator.');
  return user;
}

/** Requires a valid login token; sets req.user. */
export async function protect(req, _res, next) {
  const token = readToken(req);
  if (!token) throw new HttpError(401, 'Please log in to continue');
  req.user = await userFromToken(token);
  next();
}

/** Sets req.user when a valid token is present, but never blocks the request. */
export async function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (token) {
    try {
      req.user = await userFromToken(token);
    } catch {
      req.user = undefined;
    }
  }
  next();
}

/** Restricts a route to the given roles. Use after protect. */
export function authorize(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, `Only ${roles.join(' or ')} accounts can do this`));
    }
    next();
  };
}
