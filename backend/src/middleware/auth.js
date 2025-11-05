const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  // Try both lowercase and original case for authorization header
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // Debug logging (remove in production if needed)
  if (!token) {
    console.log('Missing token. Headers:', Object.keys(req.headers));
    console.log('Authorization header:', req.headers['authorization'] || req.headers['Authorization']);
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Token verification error:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const requireUserType = (types) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!types.includes(req.user.user_type)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

module.exports = { authenticateToken, requireUserType };

