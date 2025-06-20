//数据库Config文件
const mysql = require('mysql2/promise');
require('dotenv').config({ path: './db.env' });

// 显示连接信息（不包含密码）
console.log("数据库连接信息:", {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME
});

// 创建连接池配置
const poolConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // 增加连接超时时间
  connectTimeout: 10000,
  // 增加获取连接超时时间
  acquireTimeout: 10000
};

const pool = mysql.createPool(poolConfig);

// 测试数据库连接
const testConnection = async () => {
  try {
    console.log("正在测试数据库连接...");
    const connection = await pool.getConnection();
    console.log("数据库连接成功");
    
    // 测试数据库查询
    try {
      const [rows] = await connection.query('SELECT 1 as test');
      console.log("数据库查询测试成功:", rows);
    } catch (queryErr) {
      console.error("数据库查询测试失败:", queryErr);
    }
    
    // 释放连接
    connection.release();
    return true;
  } catch (err) {
    console.error("数据库连接失败:", err);
    
    // 提供更详细的错误信息
    if (err.code === 'ECONNREFUSED') {
      console.error("无法连接到MySQL服务器，请确保MySQL服务已启动");
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error("MySQL用户名或密码错误");
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.error("数据库不存在:", process.env.DB_NAME);
      console.log("请先创建数据库，可使用以下命令:");
      console.log(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME};`);
    }
    
    return false;
  }
};

module.exports = { pool, testConnection };