console.log("api.js loaded");

// ================= 1. CẤU HÌNH CHART =================
function createChart(id, label, color, isStepped = false) {
    const ctx = document.getElementById(id).getContext("2d");
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: label,
                data: [],
                borderColor: color,
                backgroundColor: color.replace('1)', '0.2)'),
                fill: true,
                tension: isStepped ? 0 : 0.4,
                stepped: isStepped,
                borderWidth: 2,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            scales: {
                x: { display: true, ticks: { maxTicksLimit: 8 } }, 
                y: {
                    beginAtZero: true,
                    ticks: isStepped ? {
                        stepSize: 1,
                        callback: function(val) { return val === 1 ? 'ON' : (val === 0 ? 'OFF' : ''); }
                    } : {} 
                }
            },
            plugins: { legend: { labels: { boxWidth: 12, padding: 10 } } }
        }
    });
}

// Khởi tạo 3 biểu đồ
const tempChart = createChart('tempChart', 'Nhiệt độ', 'rgba(255, 99, 132, 1)');
const soilChart = createChart('soilChart', 'Độ ẩm', 'rgba(54, 162, 235, 1)');
const pumpChart = createChart('pumpChart', 'Bơm hoạt động', 'rgba(75, 192, 192, 1)', true);

// ================= 2. KẾT NỐI WEBSOCKET (ĐÃ SỬA) =================
// Dùng localhost:3000 để đảm bảo chạy được kể cả khi dùng Live Server
const ws = new WebSocket("ws://localhost:3000");

ws.onopen = () => console.log("🟢 Đã kết nối tới Server!");

ws.onmessage = (event) => {
    // 1. Parse dữ liệu
    let msg;
    try {
        msg = JSON.parse(event.data);
    } catch (e) {
        console.error("Lỗi dữ liệu JSON:", event.data);
        return;
    }
    
    // 2. Nhận diện loại dữ liệu (Sensor hay Control)
    let data = null;
    if (msg.type === "SENSOR_DATA") data = msg.sensor;
    else if (!msg.type) data = msg; // Hỗ trợ format cũ

    if(data && data.temperature !== undefined) {
        
        // --- A. CẬP NHẬT CARDS ---
        if(document.getElementById("tempValue")) {
            document.getElementById("tempValue").innerText = parseFloat(data.temperature).toFixed(1);
            document.getElementById("soilValue").innerText = data.soil + " %";
            document.getElementById("timeValue").innerText = data.time;

            // Bơm
            updateCardStatus("pumpValue", "pumpStatus", data.pump, "Đang chạy", "Đã tắt");
            // Quạt
            updateCardStatus("fanValue", "fanStatus", data.fan, "Đang làm mát", "Đã tắt");
            // Đèn
            updateCardStatus("lightValue", "lightStatus", data.light, "Đang sáng", "Đã tắt");
        }

        // --- B. CẬP NHẬT BẢNG ---
        updateTableStatus("pumpTable", data.pump);
        updateTableStatus("fanTable", data.fan);
        updateTableStatus("lightTable", data.light);

        // --- C. CẢNH BÁO ---
        checkSystemAlerts(data);
        
        // --- D. BIỂU ĐỒ ---
        updateChart(tempChart, data.time, data.temperature);
        updateChart(soilChart, data.time, data.soil);
        updateChart(pumpChart, data.time, data.pump ? 1 : 0);
    }
};

ws.onerror = (err) => {
    console.error("🔴 Lỗi kết nối WebSocket:", err);
    alert("Không thể kết nối Server! Hãy kiểm tra xem 'node server.js' đã chạy chưa?");
};

ws.onclose = () => {
    console.warn("⚠️ Mất kết nối Server");
};

// ================= HÀM HỖ TRỢ =================

function checkSystemAlerts(data) {
    const alertBox = document.getElementById("systemAlert");
    const alertContent = document.getElementById("alertContent");
    let warnings = [];

    // Lấy thời gian từ dữ liệu cảm biến (hoặc thời gian hiện tại)
    const timeNow = data.time || new Date().toLocaleTimeString();

    // 1. Kiểm tra Độ ẩm đất thấp
    if (data.soil < 40) {
        // Thêm thẻ <span> cho thời gian để dễ chỉnh màu
        warnings.push(`<span class="alert-time">[${timeNow}]</span> Đất khô (${data.soil}%)! Cây thiếu nước, cần bật Bơm.`);
    }

    // 2. Kiểm tra Nhiệt độ cao
    if (data.temperature > 35) {
        warnings.push(`<span class="alert-time">[${timeNow}]</span> Nhiệt độ cao (${data.temperature.toFixed(1)}°C)! Cần bật Quạt.`);
    }

    // 3. Hiển thị hoặc Ẩn
    if (warnings.length > 0) {
        alertBox.style.display = "block";
        alertContent.innerHTML = warnings.map(text => `<li>${text}</li>`).join("");
    } else {
        alertBox.style.display = "none";
    }
}

function updateCardStatus(valId, statusId, state, onText, offText) {
    const valEl = document.getElementById(valId);
    const statusEl = document.getElementById(statusId);
    if(valEl) {
        valEl.innerText = state ? "ON" : "OFF";
        valEl.style.color = state ? "green" : "red";
    }
    if(statusEl) statusEl.innerText = state ? onText : offText;
}

function updateTableStatus(elementId, status) {
    const el = document.getElementById(elementId);
    if(el) {
        el.innerText = status ? "ON" : "OFF";
        el.className = status ? "on" : "off";
    }
}

function updateChart(chart, label, val) {
    if (chart.data.labels.length > 100) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }
    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(val);
    chart.update('none');
}