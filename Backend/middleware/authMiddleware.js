const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1]; // Extract token from header

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, 'your_jwt_secret'); // Verify token
    req.user = decoded; // Attach user data to request
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid token.' });
  }
};

module.exports = authenticateJWT;
