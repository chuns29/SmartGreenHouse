const mongoose = require('mongoose');

const SensorDataSchema = new mongoose.Schema({
    deviceId: { 
        type: String, 
        required: true, 
        index: true 
    },
    temperature: Number,
    soil: Number,
    pump: Boolean,
    fan: Boolean,
    light: Boolean,
    createdAt: { 
        type: Date, 
        default: Date.now,
        index: true 
    }
});

// 🔥 QUAN TRỌNG: Tạo Index TTL (Time To Live)
// Dữ liệu sẽ tự động bị xóa sau 7 ngày (604800 giây)
// Nếu muốn 2 ngày thì sửa thành 172800
SensorDataSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('SensorData', SensorDataSchema);