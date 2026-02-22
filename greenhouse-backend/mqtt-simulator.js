const mqtt = require('mqtt');

// Kết nối tới cùng Broker với Server
const client = mqtt.connect('mqtt://broker.hivemq.com');
const TOPIC = 'greenhouse/data/test';

client.on('connect', () => {
    console.log('✅ Simulator connected to MQTT Broker');
    
    // Bắt đầu gửi dữ liệu giả lập mỗi 3 giây
    setInterval(() => {
        sendFakeData();
    }, 3000);
});

function sendFakeData() {
    // 1. Tạo số liệu ngẫu nhiên
    // Nhiệt độ từ 28 đến 38 độ
    const temp = (28 + Math.random() * 10).toFixed(1); 
    
    // Độ ẩm đất từ 30% đến 90%
    const soil = Math.floor(30 + Math.random() * 60);
    
    // Random trạng thái thiết bị (để test giao diện nhấp nháy)
    const pump = Math.random() > 0.5 ? 1 : 0;
    const fan = temp > 35 ? 1 : 0; // Logic giả: Nóng quá thì bật quạt
    const light = Math.random() > 0.5 ? 1 : 0;

    // 2. Đóng gói JSON giống hệt cấu trúc ESP32 thật
    const data = {
        temperature: parseFloat(temp),
        soil: soil,
        pump: pump,
        fan: fan,
        light: light
    };

    // 3. Gửi lên MQTT
    client.publish(TOPIC, JSON.stringify(data));
    console.log(`📤 Sent: Temp=${temp}, Soil=${soil}%, Pump=${pump}`);
}
