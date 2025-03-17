# DNUI-Sea-Backend
-- 创建数据库
CREATE DATABASE IF NOT EXISTS sea CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE sea;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建数据库用户并授权（如果需要）
-- CREATE USER IF NOT EXISTS 'root'@'localhost' IDENTIFIED BY 'root';
-- GRANT ALL PRIVILEGES ON sea.* TO 'root'@'localhost';
-- FLUSH PRIVILEGES;

//新增海冰数据
CREATE TABLE IF NOT EXISTS arctic_ice_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    date DATETIME NOT NULL,
    location VARCHAR(100) NOT NULL,
    temperature DECIMAL(5,2) NOT NULL,
    thickness DECIMAL(5,2) NOT NULL,
    density DECIMAL(6,2) NOT NULL,
    wind_speed DECIMAL(5,2) NOT NULL,
    salinity DECIMAL(5,2) NOT NULL,
    snow_cover DECIMAL(5,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_date (date),
    INDEX idx_location (location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
