import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * Strict authentication middleware: requires a valid JWT session.
 */
export const authMiddleware = (req, res, next) => {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Authentication required. No session token provided.' });
    }

    const secret = process.env.JWT_SECRET || 'fc_jwt_secret_dev_key_fallback';
    const decoded = jwt.verify(token, secret);

    req.userId = decoded.id;
    req.user = decoded;
    req.isGuest = false;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid authentication token.' });
  }
};

/**
 * Session isolation middleware: ensures EVERY request (authenticated or guest visitor)
 * has an isolated, unique session identifier instead of colliding on a single 'default_user'.
 */
export const sessionIsolationMiddleware = (req, res, next) => {
  try {
    // 1. Try JWT
    let token = req.cookies?.token;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const secret = process.env.JWT_SECRET || 'fc_jwt_secret_dev_key_fallback';
        const decoded = jwt.verify(token, secret);
        req.userId = decoded.id;
        req.user = decoded;
        req.isGuest = false;
        return next();
      } catch (jwtErr) {
        // Token invalid/expired: fall through to guest isolation
      }
    }

    // 2. Check for existing guest session cookie or header
    let guestId = req.cookies?.fc_session_id || req.headers['x-session-id'];

    if (!guestId || typeof guestId !== 'string' || guestId.trim().length < 8) {
      guestId = `guest_${crypto.randomUUID()}`;
    } else {
      guestId = guestId.trim();
    }

    // Set cookie on response so browser persists this user's sandbox across requests
    res.cookie('fc_session_id', guestId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: process.env.NODE_ENV === 'production',
    });
    res.setHeader('x-session-id', guestId);

    req.userId = guestId;
    req.user = { id: guestId, isGuest: true };
    req.isGuest = true;

    next();
  } catch (err) {
    console.error('Session isolation middleware error:', err);
    next();
  }
};

/**
 * Utility helper for controllers to obtain the session-isolated user identifier.
 */
export const getEffectiveUserId = (req) => {
  return req.userId || req.user?.id || req.cookies?.fc_session_id || 'guest_sandbox_default';
};

export default authMiddleware;
