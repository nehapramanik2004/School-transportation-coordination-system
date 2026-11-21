import { HttpError } from './errors.js';
import { readSession } from '../auth/session.js';

export function requireSession(req, res, next) {
  const user = readSession(req);
  if (!user) return next(new HttpError(401, 'Please sign in to continue.'));
  req.user = user;
  next();
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new HttpError(403, 'This account does not have access to that feature.'));
    next();
  };
}
