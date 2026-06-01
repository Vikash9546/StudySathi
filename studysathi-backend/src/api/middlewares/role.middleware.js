import { ForbiddenError } from '../../common/errors.js';

export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.currentUser) {
      return next(new ForbiddenError('Access denied: Authentication required'));
    }

    // Basic admin check (if checking for ADMIN role, check by email or plan type)
    if (allowedRoles.includes('ADMIN') && req.currentUser.email !== 'admin@studysathi.com') {
      return next(new ForbiddenError('Access denied: Admin access only'));
    }

    next();
  };
}
