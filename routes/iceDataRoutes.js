// routes/iceDataRoutes.js
const express = require('express');
const router = express.Router();
const IceData = require('../models/IceData');
const { redisClient } = require('../config/redis');

// 缓存键前缀
const CACHE_PREFIX = 'ice_data:';

// 缓存过期时间（秒）
const CACHE_TTL = 300; // 5分钟

// 缓存中间件
const cacheMiddleware = async (req, res, next) => {
  try {
    // 构建缓存键
    const cacheKey = `${CACHE_PREFIX}${req.originalUrl}`;
    
    // 尝试从缓存获取数据
    const cachedData = await redisClient.get(cacheKey);
    
    if (cachedData) {
      console.log('从缓存返回数据:', cacheKey);
      return res.json(JSON.parse(cachedData));
    }
    
    // 如果没有缓存，继续处理请求
    // 保存原始的res.json方法
    const originalJson = res.json;
    
    // 重写res.json方法，在返回数据前缓存结果
    res.json = function(data) {
      // 保存数据到Redis缓存
      redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
      
      // 调用原始的json方法
      return originalJson.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('缓存中间件错误:', error);
    next(); // 出错时继续处理请求，不使用缓存
  }
};

// 清除缓存的辅助函数
const clearCache = async (pattern = `${CACHE_PREFIX}*`) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`已清除${keys.length}个缓存`);
    }
  } catch (error) {
    console.error('清除缓存失败:', error);
  }
};

// 获取数据列表（使用缓存）
router.get('/', cacheMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 10, region, timeRange, search, sortKey = 'timestamp', sortOrder = 'desc' } = req.query;
        const query = {};
        const options = {
            skip: (parseInt(page) - 1) * parseInt(limit),
            limit: parseInt(limit),
            sort: {
                field: sortKey,
                order: sortOrder.toUpperCase()
            }
        };

        // 区域筛选
        if (region) {
            query.region = region;
        }

        // 时间范围筛选
        if (timeRange) {
            const now = new Date();
            switch (timeRange) {
                case 'today':
                    query.timestamp = { $gte: new Date(now.setHours(0, 0, 0, 0)) };
                    break;
                case 'week':
                    query.timestamp = { $gte: new Date(now.setDate(now.getDate() - 7)) };
                    break;
                case 'month':
                    query.timestamp = { $gte: new Date(now.setDate(now.getDate() - 30)) };
                    break;
            }
        }

        // 搜索功能
        if (search) {
            query.$or = [
                { region: new RegExp(search, 'i') },
                { collector: new RegExp(search, 'i') }
            ];
        }

        const totalCount = await IceData.countDocuments(query);
        const data = await IceData.find(query, options);

        res.json({
            status: 'success',
            data,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(totalCount / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// 添加新数据
router.post('/', async (req, res) => {
    try {
        const savedData = await IceData.save(req.body);
        
        // 清除列表缓存
        await clearCache();
        
        res.status(201).json({
            status: 'success',
            data: savedData
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// 更新数据
router.put('/:id', async (req, res) => {
    try {
        const updatedData = await IceData.findByIdAndUpdate(
            req.params.id,
            req.body
        );
        
        if (!updatedData) {
            return res.status(404).json({
                status: 'error',
                message: '数据不存在'
            });
        }
        
        // 清除列表缓存和特定ID的缓存
        await clearCache();
        await clearCache(`${CACHE_PREFIX}*${req.params.id}*`);
        
        res.json({
            status: 'success',
            data: updatedData
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// 删除数据
router.delete('/:id', async (req, res) => {
    try {
        const deletedData = await IceData.findByIdAndDelete(req.params.id);
        
        if (!deletedData) {
            return res.status(404).json({
                status: 'error',
                message: '数据不存在'
            });
        }
        
        // 清除列表缓存和特定ID的缓存
        await clearCache();
        await clearCache(`${CACHE_PREFIX}*${req.params.id}*`);
        
        res.json({
            status: 'success',
            message: '删除成功'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// 批量导入数据
router.post('/batch', async (req, res) => {
    try {
        const { data } = req.body;
        if (!Array.isArray(data) || data.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: '无效的数据格式或空数据'
            });
        }

        // 限制单次导入的最大数量
        const IMPORT_LIMIT = 1000;
        if (data.length > IMPORT_LIMIT) {
            return res.status(413).json({
                status: 'error',
                message: `单次导入不能超过${IMPORT_LIMIT}条记录，请分批导入`
            });
        }

        const savedData = await IceData.insertMany(data);
        
        // 清除所有缓存
        await clearCache();

        res.status(201).json({
            status: 'success',
            message: `成功导入${savedData.length}条数据`,
            data: savedData
        });
    } catch (error) {
        // 处理验证错误
        if (error.message.includes('第')) {
            return res.status(400).json({
                status: 'error',
                message: '数据验证失败',
                details: error.message
            });
        }

        res.status(500).json({
            status: 'error',
            message: '导入数据失败',
            details: error.message
        });
    }
});

module.exports = router;