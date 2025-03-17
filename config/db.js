//数据库Config文件
const mysql = require('mysql2/promise');
require('dotenv').config({ path: './db.env' });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// 测试数据库连接
const testConnection = async () => {
  try {
    await pool.getConnection();
    console.log("数据库连接成功");
  } catch (err) {
    console.error("数据库连接失败:", err);
    process.exit(1);
  }
};

module.exports = { pool, testConnection };