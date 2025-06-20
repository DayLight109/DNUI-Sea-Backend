
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db'); // 假设你的数据库配置在这个文件
const { SECRET_KEY } = require('../config/auth'); // 假设你的认证配置在这个文件

// JWT验证中间件
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

/**
 * @route POST /api/arctic-ice/data
 * @desc 添加海冰数据
 * @access Private
 */
router.post('/data', verifyToken, async (req, res) => {
  const {
    date,
    location,
    temperature,
    thickness,
    density,
    windSpeed,
    salinity,
    snowCover,
    notes
  } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO arctic_ice_data 
      (user_id, date, location, temperature, thickness, density, wind_speed, salinity, snow_cover, notes) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, date, location, temperature, thickness, density, windSpeed, salinity, snowCover, notes]
    );

    res.json({
      message: '数据添加成功',
      id: result.insertId
    });
  } catch (error) {
    console.error('添加数据失败:', error);
    res.status(500).json({ message: '添加数据失败' });
  }
});

/**
 * @route GET /api/arctic-ice/data
 * @desc 获取海冰数据列表
 * @access Private
 */
router.get('/data', verifyToken, async (req, res) => {
  const { startDate, endDate, location } = req.query;
  let query = 'SELECT * FROM arctic_ice_data WHERE 1=1';
  const params = [];

  if (startDate && endDate) {
    query += ' AND date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  if (location) {
    query += ' AND location LIKE ?';
    params.push(`%${location}%`);
  }

  query += ' ORDER BY date DESC';

  try {
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('获取数据失败:', error);
    res.status(500).json({ message: '获取数据失败' });
  }
});

/**
 * @route GET /api/arctic-ice/data/:id
 * @desc 获取单条海冰数据
 * @access Private
 */
router.get('/data/:id', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM arctic_ice_data WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: '数据不存在' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('获取数据失败:', error);
    res.status(500).json({ message: '获取数据失败' });
  }
});

/**
 * @route PUT /api/arctic-ice/data/:id
 * @desc 更新海冰数据
 * @access Private
 */
router.put('/data/:id', verifyToken, async (req, res) => {
  const {
    date,
    location,
    temperature,
    thickness,
    density,
    windSpeed,
    salinity,
    snowCover,
    notes
  } = req.body;

  try {
    const [existingData] = await pool.query(
      'SELECT * FROM arctic_ice_data WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (existingData.length === 0) {
      return res.status(404).json({ message: '数据不存在或无权限修改' });
    }

    await pool.query(
      `UPDATE arctic_ice_data SET 
      date = ?, 
      location = ?, 
      temperature = ?, 
      thickness = ?, 
      density = ?, 
      wind_speed = ?, 
      salinity = ?, 
      snow_cover = ?, 
      notes = ? 
      WHERE id = ? AND user_id = ?`,
      [date, location, temperature, thickness, density, windSpeed, salinity, snowCover, notes, req.params.id, req.user.id]
    );

    res.json({ message: '数据更新成功' });
  } catch (error) {
    console.error('更新数据失败:', error);
    res.status(500).json({ message: '更新数据失败' });
  }
});

/**
 * @route DELETE /api/arctic-ice/data/:id
 * @desc 删除海冰数据
 * @access Private
 */
router.delete('/data/:id', verifyToken, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM arctic_ice_data WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '数据不存在或无权限删除' });
    }

    res.json({ message: '数据删除成功' });
  } catch (error) {
    console.error('删除数据失败:', error);
    res.status(500).json({ message: '删除数据失败' });
  }
});

/**
 * @route GET /api/arctic-ice/stats
 * @desc 获取数据统计信息
 * @access Private
 */
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as totalRecords,
        AVG(temperature) as avgTemperature,
        AVG(thickness) as avgThickness,
        AVG(density) as avgDensity,
        MIN(date) as earliestRecord,
        MAX(date) as latestRecord
      FROM arctic_ice_data
      WHERE user_id = ?
    `, [req.user.id]);

    res.json(stats[0]);
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({ message: '获取统计信息失败' });
  }
});

module.exports = router;