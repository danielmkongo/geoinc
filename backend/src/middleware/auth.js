import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../db/connection.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check the session is still valid (not logged out / revoked)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = await db.query(
      'SELECT id FROM sessions WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP',
      [tokenHash]
    );
    if (session.rows.length === 0) {
      return res.status(401).json({ error: 'Session expired or logged out' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const optionalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }
    next();
  } catch (error) {
    next();
  }
};
