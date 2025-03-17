// routes/iceDataRoutes.js
const express = require('express');
const router = express.Router();
const IceData = require('../models/IceData');

// 获取数据列表
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, region, timeRange, search } = req.query;
        const query = {};

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
        const data = await IceData.find(query)
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.json({
            status: 'success',
            data,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// 添加新数据
router.post('/', async (req, res) => {
    try {
        const iceData = new IceData(req.body);
        const savedData = await iceData.save();
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
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedData) {
            return res.status(404).json({
                status: 'error',
                message: '数据不存在'
            });
        }
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
        if (!Array.isArray(data)) {
            return res.status(400).json({
                status: 'error',
                message: '数据格式错误'
            });
        }

        const savedData = await IceData.insertMany(data);
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

module.exports = router;