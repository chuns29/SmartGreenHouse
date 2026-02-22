const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    // Mảng chứa danh sách thiết bị của user này
    devices: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Device' 
    }],
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('User', UserSchema);