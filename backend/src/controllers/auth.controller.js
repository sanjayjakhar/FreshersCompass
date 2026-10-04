import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

/**
 * Shared cookie attributes for every session cookie we issue.
 * `res.clearCookie` only removes a cookie when the attributes match the ones
 * used when it was set, so both the set and clear paths must use this object.
 */
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export const githubAuthCallback = async (req, res) => {
  try {
    // req.user will be populated by passport in a real scenario
    // For now, let's assume we create or find a user
    const { githubId, name, email, profilePic } = req.user || {
      githubId: 'mock123',
      name: 'Test User',
      email: 'test@example.com',
      profilePic: ''
    };

    let user = await User.findOne({ githubId });
    if (!user) {
      user = await User.create({ githubId, name, email, profilePic });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    res.cookie('token', token, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.redirect(process.env.CLIENT_URL || 'http://localhost:5173');
  } catch (error) {
    console.error('Auth Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const logout = (req, res) => {
  // Terminate the full session boundary: the JWT auth cookie AND the
  // fc_session_id isolation cookie. Leaving fc_session_id behind on shared
  // machines links the next visitor's guest telemetry, cached resumes and
  // applications to the previous visitor's session.
  res.clearCookie('token', SESSION_COOKIE_OPTIONS);
  res.clearCookie('fc_session_id', SESSION_COOKIE_OPTIONS);
  res.removeHeader('x-session-id');
  res.status(200).json({ message: 'Logged out successfully' });
};

export const me = async (req, res) => {
  try {
    // This assumes an authMiddleware is used that sets req.userId
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
