// models/IceData.js
const { pool } = require('../config/db');

class IceData {
  // 获取所有数据（带分页、筛选和排序）
  static async find(query = {}, options = {}) {
    try {
      let sqlQuery = 'SELECT * FROM ice_data WHERE 1=1';
      const params = [];

      // 区域筛选
      if (query.region) {
        sqlQuery += ' AND region = ?';
        params.push(query.region);
      }

      // 时间范围筛选
      if (query.timestamp && query.timestamp.$gte) {
        let startDate = query.timestamp.$gte;
        // 处理日期格式
        if (startDate instanceof Date) {
          startDate = startDate.toISOString().slice(0, 19).replace('T', ' ');
        } else if (typeof startDate === 'string') {
          startDate = new Date(startDate).toISOString().slice(0, 19).replace('T', ' ');
        }
        sqlQuery += ' AND timestamp >= ?';
        params.push(startDate);
      }

      // 搜索功能
      if (query.$or) {
        const searchConditions = [];
        query.$or.forEach(condition => {
          for (const field in condition) {
            if (condition[field] instanceof RegExp) {
              const searchTerm = condition[field].source.replace(/[i]/g, '');
              searchConditions.push(`${field} LIKE ?`);
              params.push(`%${searchTerm}%`);
            }
          }
        });
        if (searchConditions.length > 0) {
          sqlQuery += ` AND (${searchConditions.join(' OR ')})`;
        }
      }

      // 排序
      const sortField = options.sort?.field || 'timestamp';
      const sortOrder = options.sort?.order || 'DESC';
      sqlQuery += ` ORDER BY ${sortField} ${sortOrder}`;

      // 分页
      if (options.skip !== undefined && options.limit !== undefined) {
        sqlQuery += ' LIMIT ? OFFSET ?';
        params.push(options.limit, options.skip);
      }

      const [rows] = await pool.query(sqlQuery, params);
      return rows;
    } catch (error) {
      console.error('查询数据失败:', error);
      throw error;
    }
  }

  // 获取数据总数
  static async countDocuments(query = {}) {
    try {
      let sqlQuery = 'SELECT COUNT(*) as count FROM ice_data WHERE 1=1';
      const params = [];

      // 区域筛选
      if (query.region) {
        sqlQuery += ' AND region = ?';
        params.push(query.region);
      }

      // 时间范围筛选
      if (query.timestamp && query.timestamp.$gte) {
        let startDate = query.timestamp.$gte;
        // 处理日期格式
        if (startDate instanceof Date) {
          startDate = startDate.toISOString().slice(0, 19).replace('T', ' ');
        } else if (typeof startDate === 'string') {
          startDate = new Date(startDate).toISOString().slice(0, 19).replace('T', ' ');
        }
        sqlQuery += ' AND timestamp >= ?';
        params.push(startDate);
      }

      // 搜索功能
      if (query.$or) {
        const searchConditions = [];
        query.$or.forEach(condition => {
          for (const field in condition) {
            if (condition[field] instanceof RegExp) {
              const searchTerm = condition[field].source.replace(/[i]/g, '');
              searchConditions.push(`${field} LIKE ?`);
              params.push(`%${searchTerm}%`);
            }
          }
        });
        if (searchConditions.length > 0) {
          sqlQuery += ` AND (${searchConditions.join(' OR ')})`;
        }
      }

      const [rows] = await pool.query(sqlQuery, params);
      return rows[0].count;
    } catch (error) {
      console.error('计算数据总数失败:', error);
      throw error;
    }
  }

  // 根据ID查找数据
  static async findById(id) {
    try {
      const [rows] = await pool.query('SELECT * FROM ice_data WHERE id = ?', [id]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('根据ID查找数据失败:', error);
      throw error;
    }
  }

  // 保存新数据
  static async save(data) {
    try {
      const { region, density, temperature, thickness, collector, timestamp = new Date() } = data;
      
      // 验证数据
      if (!region || !['A', 'B', 'C'].includes(region)) {
        throw new Error('监测区域必须是A、B或C');
      }
      if (typeof density !== 'number' || density <= 0) {
        throw new Error('密度必须是大于0的数字');
      }
      if (typeof thickness !== 'number' || thickness <= 0) {
        throw new Error('厚度必须是大于0的数字');
      }
      if (!collector) {
        throw new Error('采集人员不能为空');
      }

      // 处理日期格式，转换为 MySQL 兼容格式
      let formattedTimestamp;
      if (timestamp instanceof Date) {
        formattedTimestamp = timestamp.toISOString().slice(0, 19).replace('T', ' ');
      } else if (typeof timestamp === 'string') {
        // 将 ISO 字符串转换为 MySQL datetime 格式
        formattedTimestamp = new Date(timestamp).toISOString().slice(0, 19).replace('T', ' ');
      } else {
        formattedTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
      }

      const [result] = await pool.query(
        'INSERT INTO ice_data (region, density, temperature, thickness, collector, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [region, density, temperature, thickness, collector, formattedTimestamp]
      );

      // 返回插入的数据，包含ID
      return { id: result.insertId, region, density, temperature, thickness, collector, timestamp };
    } catch (error) {
      console.error('保存数据失败:', error);
      throw error;
    }
  }

  // 更新数据
  static async findByIdAndUpdate(id, data) {
    try {
      const { region, density, temperature, thickness, collector } = data;
      
      // 验证数据
      if (region && !['A', 'B', 'C'].includes(region)) {
        throw new Error('监测区域必须是A、B或C');
      }
      if (density !== undefined && (typeof density !== 'number' || density <= 0)) {
        throw new Error('密度必须是大于0的数字');
      }
      if (thickness !== undefined && (typeof thickness !== 'number' || thickness <= 0)) {
        throw new Error('厚度必须是大于0的数字');
      }

      // 构建更新字段
      const updates = [];
      const params = [];
      
      if (region) {
        updates.push('region = ?');
        params.push(region);
      }
      if (density !== undefined) {
        updates.push('density = ?');
        params.push(density);
      }
      if (temperature !== undefined) {
        updates.push('temperature = ?');
        params.push(temperature);
      }
      if (thickness !== undefined) {
        updates.push('thickness = ?');
        params.push(thickness);
      }
      if (collector) {
        updates.push('collector = ?');
        params.push(collector);
      }
      
      // 添加更新时间
      updates.push('updated_at = ?');
      // 处理日期格式，转换为 MySQL 兼容格式
      const now = new Date();
      const formattedDate = now.toISOString().slice(0, 19).replace('T', ' ');
      params.push(formattedDate);
      
      // 添加ID
      params.push(id);

      if (updates.length === 0) {
        throw new Error('没有提供要更新的字段');
      }

      await pool.query(
        `UPDATE ice_data SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      // 返回更新后的数据
      return this.findById(id);
    } catch (error) {
      console.error('更新数据失败:', error);
      throw error;
    }
  }

  // 删除数据
  static async findByIdAndDelete(id) {
    try {
      // 先查找数据，确保存在
      const data = await this.findById(id);
      if (!data) {
        return null;
      }

      // 删除数据
      await pool.query('DELETE FROM ice_data WHERE id = ?', [id]);
      return data;
    } catch (error) {
      console.error('删除数据失败:', error);
      throw error;
    }
  }

  // 批量插入数据
  static async insertMany(dataArray) {
    try {
      // 验证数据
      dataArray.forEach((item, index) => {
        if (!item.region || !['A', 'B', 'C'].includes(item.region)) {
          throw new Error(`第${index + 1}行: 监测区域必须是A、B或C`);
        }
        if (typeof item.density !== 'number' || item.density <= 0) {
          throw new Error(`第${index + 1}行: 密度必须是大于0的数字`);
        }
        if (typeof item.thickness !== 'number' || item.thickness <= 0) {
          throw new Error(`第${index + 1}行: 厚度必须是大于0的数字`);
        }
        if (!item.collector) {
          throw new Error(`第${index + 1}行: 采集人员不能为空`);
        }
      });

      // 批量插入
      const values = dataArray.map(item => {
        // 处理日期格式，转换为 MySQL 兼容格式
        let timestamp = item.timestamp || new Date();
        let formattedTimestamp;
        
        if (timestamp instanceof Date) {
          formattedTimestamp = timestamp.toISOString().slice(0, 19).replace('T', ' ');
        } else if (typeof timestamp === 'string') {
          // 将 ISO 字符串转换为 MySQL datetime 格式
          formattedTimestamp = new Date(timestamp).toISOString().slice(0, 19).replace('T', ' ');
        } else {
          formattedTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        }
        
        return [
          item.region,
          item.density,
          item.temperature,
          item.thickness,
          item.collector,
          formattedTimestamp
        ];
      });

      const [result] = await pool.query(
        'INSERT INTO ice_data (region, density, temperature, thickness, collector, timestamp) VALUES ?',
        [values]
      );

      // 返回插入的数据数量
      return dataArray.map((item, index) => ({
        ...item,
        id: result.insertId + index
      }));
    } catch (error) {
      console.error('批量插入数据失败:', error);
      throw error;
    }
  }
}

module.exports = IceData;