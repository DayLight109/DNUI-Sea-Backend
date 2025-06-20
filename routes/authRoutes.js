//认证路由
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { SECRET_KEY } = require('../config/auth');
const { verifyToken } = require('../middleware/auth');

// 注册接口
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // 打印请求数据进行调试
  console.log('Received register data:', { username, password });

  if (!username || !password) {
    return res.status(400).json({ message: '用户名和密码不能为空' });
  }

  try {
    // 检查用户名是否已存在
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length > 0) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    // 加密密码并存储新用户
    const hashedPassword = await bcrypt.hash(password, 8);
    await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);

    res.json({ message: '注册成功，请登录' });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ message: '注册失败' });
  }
});

// 登录接口
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // 检查用户名是否存在
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const user = rows[0];

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 创建并返回 JWT
    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, {
      expiresIn: '1h'
    });
    res.json({ message: '登录成功', token });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ message: '登录失败' });
  }
});

// 刷新Token接口
router.post('/refresh-token', verifyToken, (req, res) => {
  const newToken = jwt.sign({ id: req.user.id, username: req.user.username }, SECRET_KEY, {
    expiresIn: '1h'
  });

  res.json({ message: 'Token已刷新', token: newToken });
});

// 获取当前用户信息的接口
router.get('/user', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: '用户未找到' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ message: '获取用户信息失败' });
  }
});

// 测试保护接口
router.get('/protected', verifyToken, (req, res) => {
  res.json({ message: '欢迎访问受保护的内容', user: req.user });
});

module.exports = router;