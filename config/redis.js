// config/redis.js
const Redis = require('ioredis');
require('dotenv').config({ path: './db.env' });

// Redis 配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || '',
  db: process.env.REDIS_DB || 0,
  retryStrategy: (times) => {
    // 重试策略: 最多重试5次，每次间隔2秒
    if (times > 5) {
      console.error('Redis连接失败，已达到最大重试次数');
      return null;
    }
    return 2000;
  }
};

// 创建Redis客户端
const redisClient = new Redis(redisConfig);

// 监听连接事件
redisClient.on('connect', () => {
  console.log('Redis连接成功');
});

redisClient.on('error', (err) => {
  console.error('Redis连接错误:', err);
});

// 测试Redis连接
const testRedisConnection = async () => {
  try {
    await redisClient.ping();
    console.log('Redis连接测试成功');
    return true;
  } catch (error) {
    console.error('Redis连接测试失败:', error);
    return false;
  }
};

module.exports = { redisClient, testRedisConnection }; 