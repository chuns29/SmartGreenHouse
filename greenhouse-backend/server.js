const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const WebSocket = require("ws");
const mongoose = require("mongoose");
const mqtt = require("mqtt");
const path = require("path");

// Models
const Device = require('./models/Device');
const User = require('./models/User');
const SensorData = require('./models/SensorData'); 

// Routes
const authRoutes = require("./routes/auth");

// ===== INIT =====
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use("/api/auth", authRoutes);

// ===== DATABASE =====
const mongoURI = "mongodb://127.0.0.1:27017/greenhouse_db";
mongoose.connect(mongoURI)
  .then(() => console.log("🟢 Đã kết nối MongoDB"))
  .catch(err => console.log("⚠️ Lỗi kết nối MongoDB:", err));

// ================= MQTT =================
const MQTT_BROKER = "mqtt://broker.hivemq.com"; 
const TOPIC_PATTERN = "greenhouse/+/data"; 

const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on("connect", () => {
  console.log("📡 Đã kết nối MQTT Broker");
  mqttClient.subscribe(TOPIC_PATTERN);
});

let devicesRealtimeData = {};

mqttClient.on("message", async (topic, message) => {
  try {
    const parts = topic.split('/');
    if (parts.length === 3 && parts[2] === 'data') {
        const deviceId = parts[1];
        const rawData = JSON.parse(message.toString());
        
        // 1. Lưu vào RAM (cho Realtime)
        devicesRealtimeData[deviceId] = {
            ...rawData,
            time: new Date().toLocaleTimeString()
        };

        // 2. Gửi qua WebSocket
        broadcastToWeb(deviceId, devicesRealtimeData[deviceId]);

        // 3. LƯU VÀO DATABASE
        // Chỉ lưu khi có dữ liệu cảm biến hợp lệ
        if (rawData.temperature !== undefined) {
            await SensorData.create({
                deviceId: deviceId,
                temperature: rawData.temperature,
                soil: rawData.soil,
                pump: rawData.pump,
                fan: rawData.fan,
                light: rawData.light
            });
            // console.log(`💾 Saved data for ${deviceId}`);
        }
    }
  } catch (e) {
    console.error("MQTT/DB Error:", e);
  }
});

// ================= WEBSOCKET =================
const server = app.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws, req) => {
  const urlParams = new URLSearchParams(req.url.replace('/?', ''));
  const deviceId = urlParams.get('deviceId');

  if (deviceId) {
      ws.deviceId = deviceId;
      if (devicesRealtimeData[deviceId]) {
          ws.send(JSON.stringify(devicesRealtimeData[deviceId]));
      }
  }
});

function broadcastToWeb(deviceId, data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client.deviceId === deviceId) {
            client.send(JSON.stringify(data));
        }
    });
}

// ================= API =================

// API Lấy Lịch Sử 
// Gọi: /api/history/ESP32_01?range=1h (hoặc 24h, 48h)
app.get("/api/history/:deviceId", async (req, res) => {
    const { deviceId } = req.params;
    const { range, date } = req.query; // Lấy thêm tham số date

    let startTime = new Date();
    let endTime = new Date(); // Mặc định là hiện tại
    let limit = 100; 

    // TRƯỜNG HỢP 1: Lọc theo ngày cụ thể (Nếu có tham số date)
    if (date) {
        // date dạng "YYYY-MM-DD"
        startTime = new Date(date);
        startTime.setHours(0, 0, 0, 0); // Bắt đầu ngày (00:00:00)
        
        endTime = new Date(date);
        endTime.setHours(23, 59, 59, 999); // Kết thúc ngày (23:59:59)
        
        limit = 50000; // Lấy tối đa có thể trong ngày
    } 
    // TRƯỜNG HỢP 2: Lọc theo khoảng thời gian gần nhất (range)
    else if (range === '48h') {
        startTime.setHours(startTime.getHours() - 48);
        limit = 50000;
    } else if (range === '24h') {
        startTime.setHours(startTime.getHours() - 24);
        limit = 30000;
    } else {
        // Mặc định 1 giờ
        startTime.setHours(startTime.getHours() - 1);
        limit = 1000;
    }

    try {
        // Query điều kiện
        let query = {
            deviceId,
            createdAt: { $gte: startTime } 
        };

        // Nếu lọc theo ngày thì thêm điều kiện <= endTime
        if (date) {
            query.createdAt = { $gte: startTime, $lte: endTime };
        }

        const rawHistory = await SensorData.find(query).sort({ createdAt: 1 });

        // THUẬT TOÁN LÀM MỎNG DỮ LIỆU (Downsampling)
        // Để biểu đồ không bị lag khi vẽ cả ngày
        const totalPoints = rawHistory.length;
        const maxDisplayPoints = 200;
        
        let finalHistory = [];

        if (totalPoints > maxDisplayPoints) {
            const step = Math.ceil(totalPoints / maxDisplayPoints);
            for (let i = 0; i < totalPoints; i += step) {
                finalHistory.push(rawHistory[i]);
            }
        } else {
            finalHistory = rawHistory;
        }

        res.json(finalHistory);

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Lỗi lấy lịch sử" });
    }
});

// API Quản Lý Thiết Bị
// Lấy danh sách thiết bị của user
app.get("/api/devices", async (req, res) => {
    const { userId } = req.query;
    if (!userId || userId === "undefined") return res.json([]);
    try {
        const devices = await Device.find({ owners: userId });
        res.json(devices);
    } catch (e) { res.status(500).json({ message: "Error" }); }
});
// Thêm thiết bị mới
app.post("/api/devices", async (req, res) => {
    const { userId, deviceId, name } = req.body;
    try {
        let device = await Device.findOne({ deviceId });
        if (device) {
            if (device.owners.includes(userId)) return res.status(400).json({ message: "Đã tồn tại" });
            device.owners.push(userId);
            await device.save();
        } else {
            device = new Device({ deviceId, name, owners: [userId] });
            await device.save();
        }
        await User.findByIdAndUpdate(userId, { $addToSet: { devices: device._id } });
        res.status(201).json(device);
    } catch (e) { res.status(500).json({ message: "Error" }); }
});
// Lấy cấu hình thiết bị
app.get("/api/control/:deviceId", async (req, res) => {
    try {
        const device = await Device.findOne({ deviceId: req.params.deviceId });
        if(device) res.json(device.config);
        else res.status(404).json({ message: "Not found" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// Cập nhật cấu hình thiết bị
app.post("/api/control/:deviceId", async (req, res) => {
    try {
        const device = await Device.findOneAndUpdate(
            { deviceId: req.params.deviceId }, 
            { $set: { config: req.body } },
            { new: true }
        );
        if (device) {
            mqttClient.publish(`greenhouse/${req.params.deviceId}/control`, JSON.stringify(req.body));
            res.json({ success: true });
        } else res.status(404).json({ message: "Not found" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// 5. Đổi tên thiết bị (Update)
app.put("/api/devices/:deviceId", async (req, res) => {
    const { deviceId } = req.params;
    const { name, userId } = req.body; // Cần userId để đảm bảo quyền sở hữu

    try {
        // Tìm thiết bị có deviceId và userId nằm trong danh sách owners
        const device = await Device.findOne({ deviceId, owners: userId });

        if (!device) {
            return res.status(404).json({ message: "Không tìm thấy thiết bị hoặc bạn không có quyền." });
        }

        device.name = name;
        await device.save();

        res.json({ success: true, message: "Đổi tên thành công!", device });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 6. Xóa thiết bị (Delete)
app.delete("/api/devices/:deviceId", async (req, res) => {
    const { deviceId } = req.params;
    const { userId } = req.body; // Lấy userId từ body gửi lên (axios.delete data)

    try {
        const device = await Device.findOne({ deviceId });

        if (!device) {
            return res.status(404).json({ message: "Thiết bị không tồn tại." });
        }

        // 1. Xóa userId khỏi danh sách owners của Device
        device.owners = device.owners.filter(id => id.toString() !== userId);
        
        if (device.owners.length === 0) {
            // Nếu không còn ai sở hữu -> Xóa hẳn thiết bị khỏi DB
            await Device.deleteOne({ deviceId });
            console.log(`🗑️ Đã xóa vĩnh viễn thiết bị ${deviceId}`);
        } else {
            // Nếu vẫn còn người khác dùng -> Chỉ cập nhật mảng owners
            await device.save();
            console.log(`🔗 Đã gỡ quyền sở hữu thiết bị ${deviceId} của User ${userId}`);
        }

        // 2. Xóa deviceId khỏi danh sách devices của User
        await User.findByIdAndUpdate(userId, { $pull: { devices: device._id } });

        res.json({ success: true, message: "Đã xóa thiết bị thành công." });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});