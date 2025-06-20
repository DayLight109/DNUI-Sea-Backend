//认证中间件
const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config/auth');

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ message: '未提供token' });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: '无效的token' });
    }
    req.user = decoded;
    next();
  });
};

module.exports = { verifyToken };