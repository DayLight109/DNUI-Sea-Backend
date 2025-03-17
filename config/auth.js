//认证配置
require('dotenv').config({ path: './db.env' });

module.exports = {
  SECRET_KEY: process.env.SECRET_KEY || 'default-secret-key',
  TOKEN_EXPIRE_TIME: '1h'
};