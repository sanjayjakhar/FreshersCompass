import jwt from 'jsonwebtoken';

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

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid authentication token.' });
  }
};

export default authMiddleware;
