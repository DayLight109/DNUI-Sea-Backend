// app.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { testConnection } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const arcticIceRoutes = require('./routes/arcticIceRoutes');
const iceDataRoutes = require('./routes/iceDataRoutes');  // 新增数据管理路由

// 初始化 Express 应用
const app = express();

// 中间件配置
app.use(bodyParser.json({ limit: '50mb' }));  // 增加限制以处理大型数据集
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',  // 配置允许的前端源
  credentials: true
}));

// 基础路由
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: '服务器运行正常' });
});

// API 路由
app.use('/api', authRoutes);
app.use('/api/arctic-ice', arcticIceRoutes);
app.use('/api/ice-data', iceDataRoutes);  // 新增数据管理路由

// 数据库连接检测
testConnection().catch(error => {
  console.error('数据库连接失败:', error);
  process.exit(1);  // 如果数据库连接失败，终止应用
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('错误详情:', err);
  
  // 区分不同类型的错误
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: '数据验证失败',
      details: err.message
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      status: 'error',
      message: '未授权访问'
    });
  }

  // 默认服务器错误响应
  res.status(500).json({
    status: 'error',
    message: '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// 处理未找到的路由
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: '请求的资源不存在'
  });
});

// 服务器启动配置
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`服务器正在运行 http://localhost:${PORT}`);
  console.log(`当前运行环境: ${process.env.NODE_ENV || 'development'}`);
});

// 优雅关闭服务器
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，准备关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

module.exports = app;  // 导出应用实例，方便测试