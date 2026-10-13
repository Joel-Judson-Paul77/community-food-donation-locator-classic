import User from '../models/User.js';
import { HttpError, signToken } from '../utils/helpers.js';

const PROFILE_FIELDS = ['name', 'phone', 'organization', 'address'];

function pick(body, fields) {
  const out = {};
  for (const f of fields) if (body[f] !== undefined) out[f] = String(body[f]).trim();
  return out;
}

// POST /api/auth/register
export async function register(req, res) {
  const { email, password, role = 'recipient' } = req.body;
  if (!['donor', 'recipient'].includes(role)) {
    throw new HttpError(400, 'You can register as a donor or a recipient');
  }
  const user = await User.create({ ...pick(req.body, PROFILE_FIELDS), email, password, role });
  res.status(201).json({ token: signToken(user), user });
}

// POST /api/auth/login
export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) throw new HttpError(400, 'Email and password are required');

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  if (!user.isActive) throw new HttpError(403, 'Your account has been suspended. Contact an administrator.');

  res.json({ token: signToken(user), user });
}

// GET /api/auth/me
export async function me(req, res) {
  res.json({ user: req.user });
}

// PUT /api/auth/me
export async function updateProfile(req, res) {
  const user = await User.findById(req.user._id).select('+password');
  Object.assign(user, pick(req.body, PROFILE_FIELDS));

  if (req.body.newPassword) {
    if (!req.body.currentPassword || !(await user.matchPassword(req.body.currentPassword))) {
      throw new HttpError(400, 'Current password is incorrect');
    }
    user.password = req.body.newPassword;
  }

  await user.save();
  res.json({ user });
}
