// models/IceData.js
const mongoose = require('mongoose');

const iceDataSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  region: {
    type: String,
    required: true,
    enum: ['A', 'B', 'C']
  },
  density: {
    type: Number,
    required: true,
    min: 0
  },
  temperature: {
    type: Number,
    required: true
  },
  thickness: {
    type: Number,
    required: true,
    min: 0
  },
  collector: {
    type: String,
    required: true
  }
}, {
  timestamps: true // 添加 createdAt 和 updatedAt 字段
});

module.exports = mongoose.model('IceData', iceDataSchema);