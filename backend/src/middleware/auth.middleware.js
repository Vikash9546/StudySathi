const jwt = require('jsonwebtoken');

/**
 * Verify JWT from the Authorization header and attach user to req.
 */
const authMiddleware = (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Access denied. No token provided.',
      });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Token expired. Please log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      data: null,
      message: 'Invalid token.',
    });
  }
};

module.exports = authMiddleware;
