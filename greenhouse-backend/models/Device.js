const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
    deviceId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    name: { type: String, default: "Nhà kính thông minh" },
    
    // --- CẬP NHẬT: Thay đổi từ owner đơn lẻ sang mảng owners ---
    owners: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    }],
    // -----------------------------------------------------------

    config: {
        pumpMode: { type: String, default: "AUTO" },
        pumpState: { type: Boolean, default: false },
        fanMode: { type: String, default: "AUTO" },
        fanState: { type: Boolean, default: false },
        lightMode: { type: String, default: "AUTO" },
        lightState: { type: Boolean, default: false },
        
        soilAutoStart: { type: Number, default: 40 },
        soilAutoStop: { type: Number, default: 60 },
        fanAutoTemp: { type: Number, default: 30 },
        lightOnTime: { type: String, default: "18:00" },
        lightOffTime: { type: String, default: "06:00" }
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Device', DeviceSchema);