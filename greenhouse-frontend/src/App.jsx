import { useState, useEffect, useRef } from "react";
import "./index.css";
import Auth from "./Auth";
import DeviceSelector from "./DeviceSelector";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [userId, setUserId] = useState(localStorage.getItem("userId"));

  const [devices, setDevices] = useState([]);
  const [currentDeviceId, setCurrentDeviceId] = useState(null);

  const [activeTab, setActiveTab] = useState("overview");
  const wsRef = useRef(null);

  // Form states
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDevice, setNewDevice] = useState({ id: "", name: "" });
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");

  const [data, setData] = useState({
    temperature: 0,
    soil: 0,
    pump: false,
    fan: false,
    light: false,
    time: "--:--",
  });

  const [chartHistory, setChartHistory] = useState({
    labels: [],
    tempData: [],
    soilData: [],
    pumpData: [],
  });

  const [historyTable, setHistoryTable] = useState([]);

  // State bộ lọc thời gian
  const [filterType, setFilterType] = useState("range");
  const [timeRange, setTimeRange] = useState("1h");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // --- REFS ĐỂ SỬA LỖI SOCKET (MỚI) ---
  // Dùng Ref để lưu trạng thái bộ lọc, giúp Socket đọc được giá trị mới nhất
  const filterTypeRef = useRef("range");
  const timeRangeRef = useRef("1h");

  // Cập nhật Ref mỗi khi State thay đổi
  useEffect(() => {
    filterTypeRef.current = filterType;
    timeRangeRef.current = timeRange;
  }, [filterType, timeRange]);
  // ------------------------------------

  const [control, setControl] = useState({
    pumpMode: "AUTO",
    pumpState: false,
    fanMode: "AUTO",
    fanState: false,
    lightMode: "AUTO",
    lightState: false,
    soilAutoStart: 40,
    soilAutoStop: 60,
    lightOnTime: "18:00",
    lightOffTime: "06:00",
    fanAutoTemp: 30,
  });

  const [tempSettings, setTempSettings] = useState({});

  const handleLoginSuccess = (newToken, newUserId) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("userId", newUserId);
    setToken(newToken);
    setUserId(newUserId);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    setToken(null);
    setUserId(null);
    setDevices([]);
    setCurrentDeviceId(null);
  };

  const fetchDevices = () => {
    if (token && userId) {
      fetch(`http://localhost:3000/api/devices?userId=${userId}`)
        .then((res) => res.json())
        .then((devs) => {
          setDevices(devs);
          if (!currentDeviceId && devs.length > 0) {
            setCurrentDeviceId(devs[0].deviceId);
          }
        })
        .catch((err) => console.error("Lỗi lấy devices:", err));
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [token, userId]);

  const handleAddDevice = async () => {
    if (!newDevice.id || !newDevice.name) {
      alert("Vui lòng nhập đầy đủ Mã và Tên thiết bị!");
      return;
    }
    try {
      const res = await fetch("http://localhost:3000/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          deviceId: newDevice.id,
          name: newDevice.name,
        }),
      });
      if (res.ok) {
        alert("✅ Thêm thiết bị thành công!");
        setShowAddDevice(false);
        setNewDevice({ id: "", name: "" });
        fetchDevices();
      } else {
        const err = await res.json();
        alert("❌ Lỗi: " + (err.message || "Không thể thêm thiết bị"));
      }
    } catch (error) {
      console.error(error);
      alert("❌ Lỗi kết nối Server");
    }
  };

  const handleRenameDevice = async () => {
    if (!editName.trim()) return alert("Tên không được để trống!");
    try {
      const res = await fetch(
        `http://localhost:3000/api/devices/${currentDeviceId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, name: editName }),
        }
      );
      if (res.ok) {
        alert("✅ Đổi tên thành công!");
        setIsEditingName(false);
        fetchDevices();
      } else {
        alert("❌ Lỗi đổi tên!");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDevice = async () => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa thiết bị ${currentDeviceId} không?`
      )
    )
      return;
    try {
      const res = await fetch(
        `http://localhost:3000/api/devices/${currentDeviceId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        }
      );
      if (res.ok) {
        alert("🗑️ Đã xóa thiết bị!");
        setCurrentDeviceId(null);
        fetchDevices();
      } else {
        alert("❌ Lỗi khi xóa!");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHistory = () => {
    if (!currentDeviceId) return;

    let url = `http://localhost:3000/api/history/${currentDeviceId}`;

    if (filterType === "date") {
      url += `?date=${selectedDate}`;
    } else {
      url += `?range=${timeRange}`;
    }

    fetch(url)
      .then((res) => res.json())
      .then((history) => {
        if (history && history.length > 0) {
          setHistoryTable([...history].reverse());

          const labels = history.map((h) => {
            const d = new Date(h.createdAt);
            return filterType === "date" || timeRange !== "1h"
              ? `${d.getHours()}:${d.getMinutes()}`
              : d.toLocaleTimeString();
          });
          const tempData = history.map((h) => h.temperature);
          const soilData = history.map((h) => h.soil);
          const pumpData = history.map((h) => (h.pump ? 1 : 0));

          setChartHistory({ labels, tempData, soilData, pumpData });

          if (filterType === "range" && timeRange === "1h") {
            const lastRecord = history[history.length - 1];
            setData((prev) => ({
              ...prev,
              ...lastRecord,
              time: new Date(lastRecord.createdAt).toLocaleTimeString(),
            }));
          }
        } else {
          setChartHistory({
            labels: [],
            tempData: [],
            soilData: [],
            pumpData: [],
          });
          setHistoryTable([]);
        }
      })
      .catch((e) => console.error("Lỗi tải lịch sử:", e));
  };

  // --- LOGIC CHÍNH: SOCKET & INIT ---
  useEffect(() => {
    if (!currentDeviceId) return;

    setData({
      temperature: 0,
      soil: 0,
      pump: false,
      fan: false,
      light: false,
      time: "--:--",
    });
    setChartHistory({ labels: [], tempData: [], soilData: [], pumpData: [] });
    setHistoryTable([]);

    const currentDev = devices.find((d) => d.deviceId === currentDeviceId);
    if (currentDev) setEditName(currentDev.name);

    fetch(`http://localhost:3000/api/control/${currentDeviceId}`)
      .then((res) => res.json())
      .then((config) => {
        setControl(config);
        setTempSettings(config);
      })
      .catch((e) => console.error(e));

    fetchHistory();

    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(`ws://localhost:3000?deviceId=${currentDeviceId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.temperature !== undefined) {
          // Luôn cập nhật số hiển thị Realtime (Cards)
          setData((prev) => ({ ...prev, ...msg }));

          // Chỉ update biểu đồ/bảng lịch sử nếu đang xem Realtime (1h)
          if (
            filterTypeRef.current === "range" &&
            timeRangeRef.current === "1h"
          ) {
            setChartHistory((prev) => {
              const newLabels = [...prev.labels, msg.time].slice(-50);
              const newTempData = [...prev.tempData, msg.temperature].slice(
                -50
              );
              const newSoilData = [...prev.soilData, msg.soil].slice(-50);
              const newPumpData = [...prev.pumpData, msg.pump ? 1 : 0].slice(
                -50
              );
              return {
                labels: newLabels,
                tempData: newTempData,
                soilData: newSoilData,
                pumpData: newPumpData,
              };
            });

            setHistoryTable((prev) =>
              [{ ...msg, createdAt: new Date().toISOString() }, ...prev].slice(
                0,
                50
              )
            );
          }
        }
      } catch (e) {}
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [currentDeviceId, devices]);

  useEffect(() => {
    fetchHistory();
  }, [timeRange, selectedDate, filterType]);

  const sendControlToServer = (payload) => {
    if (!currentDeviceId) return;
    fetch(`http://localhost:3000/api/control/${currentDeviceId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) => console.error("Lỗi gửi lệnh:", err));
  };

  const updateControlDirect = (key, value) => {
    const newControl = { ...control, [key]: value };
    setControl(newControl);
    sendControlToServer(newControl);
  };

  const saveSettings = () => {
    if (tempSettings.soilAutoStart >= tempSettings.soilAutoStop) {
      alert("Lỗi: Ngưỡng Bắt đầu phải nhỏ hơn ngưỡng Dừng!");
      return;
    }
    const newControl = { ...control, ...tempSettings };
    setControl(newControl);
    sendControlToServer(newControl);
    alert("✅ Đã lưu cấu hình cho " + currentDeviceId);
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" } },
    scales: { y: { beginAtZero: true } },
    elements: { line: { tension: 0.4 } },
  };
  const pumpOptions = {
    ...commonOptions,
    elements: { line: { tension: 0, stepped: true } },
    scales: {
      y: {
        min: 0,
        max: 1.2,
        ticks: {
          stepSize: 1,
          callback: (v) => (v === 1 ? "ON" : v === 0 ? "OFF" : ""),
        },
      },
    },
  };
  const tempChartData = {
    labels: chartHistory.labels,
    datasets: [
      {
        label: "Nhiệt độ (°C)",
        data: chartHistory.tempData,
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        fill: true,
      },
    ],
  };
  const soilChartData = {
    labels: chartHistory.labels,
    datasets: [
      {
        label: "Độ ẩm đất (%)",
        data: chartHistory.soilData,
        borderColor: "rgb(53, 162, 235)",
        backgroundColor: "rgba(53, 162, 235, 0.2)",
        fill: true,
      },
    ],
  };
  const pumpChartData = {
    labels: chartHistory.labels,
    datasets: [
      {
        label: "Trạng thái Bơm",
        data: chartHistory.pumpData,
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        fill: true,
      },
    ],
  };

  if (!token) return <Auth onLoginSuccess={handleLoginSuccess} />;

  return (
    <div className="container">
      <aside className="sidebar">
        <h2 className="logo">IOT SYSTEM</h2>
        <ul>
          <li
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => setActiveTab("overview")}
          >
            Tổng quan
          </li>
          <li
            className={activeTab === "statistics" ? "active" : ""}
            onClick={() => setActiveTab("statistics")}
          >
            Thống kê
          </li>
          <li
            className={activeTab === "devices" ? "active" : ""}
            onClick={() => setActiveTab("devices")}
          >
            Thiết bị
          </li>
          <li
            className={activeTab === "settings" ? "active" : ""}
            onClick={() => setActiveTab("settings")}
          >
            Cài đặt
          </li>
          <button className="btn-logout" onClick={handleLogout}>
            Đăng xuất
          </button>
        </ul>
      </aside>

      <main className="main">
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: "300px" }}>
            <DeviceSelector
              devices={devices}
              currentDeviceId={currentDeviceId}
              onSelect={setCurrentDeviceId}
            />
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setShowAddDevice(!showAddDevice)}
              style={{
                height: "42px",
                padding: "0 15px",
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              {showAddDevice ? "Hủy" : "+ Thêm"}
            </button>
            {currentDeviceId && (
              <>
                <button
                  onClick={() => setIsEditingName(!isEditingName)}
                  style={{
                    height: "42px",
                    padding: "0 15px",
                    background: "#f59e0b",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  ✏️ Đổi Tên
                </button>
                <button
                  onClick={handleDeleteDevice}
                  style={{
                    height: "42px",
                    padding: "0 15px",
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  🗑️ Xóa
                </button>
              </>
            )}
          </div>
        </div>

        {isEditingName && (
          <div
            style={{
              background: "#fff",
              padding: "15px",
              borderRadius: "8px",
              marginBottom: "20px",
              borderLeft: "5px solid #f59e0b",
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            />
            <button
              onClick={handleRenameDevice}
              style={{
                padding: "8px 15px",
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Lưu Tên
            </button>
          </div>
        )}

        {showAddDevice && (
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "10px",
              marginBottom: "20px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              borderLeft: "5px solid #2563eb",
            }}
          >
            <h3>✨ Thêm thiết bị mới</h3>
            <div style={{ display: "flex", gap: "15px", marginTop: "15px" }}>
              <input
                type="text"
                placeholder="Mã thiết bị (VD: ESP32_01)"
                value={newDevice.id}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, id: e.target.value })
                }
                style={{
                  padding: "10px",
                  borderRadius: "5px",
                  border: "1px solid #ddd",
                  flex: 1,
                }}
              />
              <input
                type="text"
                placeholder="Tên gợi nhớ (VD: Vườn sau nhà)"
                value={newDevice.name}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, name: e.target.value })
                }
                style={{
                  padding: "10px",
                  borderRadius: "5px",
                  border: "1px solid #ddd",
                  flex: 1,
                }}
              />
              <button
                onClick={handleAddDevice}
                style={{
                  padding: "10px 20px",
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Lưu
              </button>
            </div>
          </div>
        )}

        {currentDeviceId ? (
          <>
            {activeTab === "overview" && (
              <div className="tab-content active">
                <h1 style={{ marginBottom: "20px" }}>
                  {devices.find((d) => d.deviceId === currentDeviceId)?.name}{" "}
                  <span
                    style={{
                      fontSize: "16px",
                      color: "#666",
                      marginLeft: "10px",
                    }}
                  >
                    ({currentDeviceId})
                  </span>
                </h1>
                <div className="cards">
                  <div className="card">
                    <h3>Nhiệt độ (°C)</h3>
                    <p
                      className="value"
                      style={{
                        color:
                          data.temperature > control.fanAutoTemp
                            ? "red"
                            : "black",
                      }}
                    >
                      {data.temperature
                        ? parseFloat(data.temperature).toFixed(1)
                        : "--"}
                    </p>
                    <span>
                      {data.temperature > control.fanAutoTemp
                        ? "⚠️ Quá nhiệt"
                        : "Ổn định"}
                    </span>
                  </div>
                  <div className="card">
                    <h3>Độ ẩm đất (%)</h3>
                    <p
                      className="value"
                      style={{
                        color:
                          data.soil < control.soilAutoStart ? "red" : "black",
                      }}
                    >
                      {data.soil} %
                    </p>
                    <span>
                      {data.soil < control.soilAutoStart
                        ? "⚠️ Đất khô"
                        : "Đủ ẩm"}
                    </span>
                  </div>
                  <div className="card">
                    <h3>Thời gian</h3>
                    <p className="value">{data.time}</p>
                    <span>Realtime</span>
                  </div>
                  <div className="card">
                    <h3>Quạt (Làm mát)</h3>
                    <p
                      className="value"
                      style={{ color: data.fan ? "green" : "red" }}
                    >
                      {data.fan ? "ON" : "OFF"}
                    </p>
                    <span>{data.fan ? "Đang quay" : "Đã tắt"}</span>
                  </div>
                  <div className="card">
                    <h3>Máy bơm (Tưới nước)</h3>
                    <p
                      className="value"
                      style={{ color: data.pump ? "green" : "red" }}
                    >
                      {data.pump ? "ON" : "OFF"}
                    </p>
                    <span>{data.pump ? "Đang chạy" : "Đã tắt"}</span>
                  </div>
                  <div className="card">
                    <h3>Đèn</h3>
                    <p
                      className="value"
                      style={{ color: data.light ? "green" : "red" }}
                    >
                      {data.light ? "ON" : "OFF"}
                    </p>
                    <span>{data.light ? "Đang sáng" : "Đã tắt"}</span>
                  </div>
                </div>

                <div className="table-box">
                  <h3>Trạng thái thiết bị chi tiết</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Thiết bị</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Máy bơm</td>
                        <td className={data.pump ? "on" : "off"}>
                          {data.pump ? "Hoạt động" : "OFF"}
                        </td>
                      </tr>
                      <tr>
                        <td>Quạt làm mát</td>
                        <td className={data.fan ? "on" : "off"}>
                          {data.fan ? "Hoạt động" : "OFF"}
                        </td>
                      </tr>
                      <tr>
                        <td>Đèn chiếu sáng</td>
                        <td className={data.light ? "on" : "off"}>
                          {data.light ? "Hoạt động" : "OFF"}
                        </td>
                      </tr>
                      <tr>
                        <td>Cảm biến nhiệt (DHT22)</td>
                        <td className={data.temperature ? "on" : "off"}>
                          {data.temperature ? "Hoạt động" : "Chờ dữ liệu..."}
                        </td>
                      </tr>
                      <tr>
                        <td>Cảm biến độ ẩm đất</td>
                        <td className={data.soil ? "on" : "off"}>
                          {data.soil ? "Hoạt động" : "Chờ dữ liệu..."}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {(data.temperature > control.fanAutoTemp ||
                  data.soil < control.soilAutoStart) && (
                  <div className="alert-box">
                    <h3 className="alert-title">⚠️ CẢNH BÁO</h3>
                    <ul>
                      {data.temperature > control.fanAutoTemp && (
                        <li>
                          Nhiệt độ cao hơn mức cài đặt ({control.fanAutoTemp}
                          °C)!
                        </li>
                      )}
                      {data.soil < control.soilAutoStart && (
                        <li>Đất khô dưới mức cho phép!</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === "statistics" && (
              <div className="tab-content active">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <h1>Biểu đồ ({currentDeviceId})</h1>

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      alignItems: "center",
                      background: "white",
                      padding: "10px",
                      borderRadius: "8px",
                    }}
                  >
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      style={{
                        padding: "8px",
                        borderRadius: "5px",
                        border: "1px solid #ccc",
                        cursor: "pointer",
                      }}
                    >
                      <option value="range">Khoảng thời gian (Gần đây)</option>
                      <option value="date">Theo ngày cụ thể</option>
                    </select>

                    {filterType === "range" && (
                      <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        style={{
                          padding: "8px",
                          borderRadius: "5px",
                          border: "1px solid #ccc",
                          cursor: "pointer",
                        }}
                      >
                        <option value="1h">1 Giờ qua</option>
                        <option value="24h">24 Giờ qua</option>
                        <option value="48h">48 Giờ qua</option>
                      </select>
                    )}

                    {filterType === "date" && (
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        style={{
                          padding: "7px",
                          borderRadius: "5px",
                          border: "1px solid #ccc",
                          cursor: "pointer",
                        }}
                      />
                    )}
                  </div>
                </div>

                <div
                  className="charts-container"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "20px",
                    marginBottom: "30px",
                  }}
                >
                  <div
                    className="chart-box"
                    style={{
                      background: "white",
                      padding: "15px",
                      borderRadius: "10px",
                      height: "350px",
                    }}
                  >
                    <Line options={commonOptions} data={tempChartData} />
                  </div>
                  <div
                    className="chart-box"
                    style={{
                      background: "white",
                      padding: "15px",
                      borderRadius: "10px",
                      height: "350px",
                    }}
                  >
                    <Line options={commonOptions} data={soilChartData} />
                  </div>
                  <div
                    className="chart-box"
                    style={{
                      background: "white",
                      padding: "15px",
                      borderRadius: "10px",
                      height: "350px",
                      gridColumn: "span 2",
                    }}
                  >
                    <Line options={pumpOptions} data={pumpChartData} />
                  </div>
                </div>

                <div className="table-box">
                  <h3>
                    📜 Lịch sử hoạt động{" "}
                    {filterType === "date"
                      ? `(Ngày ${new Date(selectedDate).toLocaleDateString(
                          "vi-VN"
                        )})`
                      : "(Gần nhất)"}
                  </h3>
                  <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Thời gian</th>
                          <th>Nhiệt độ</th>
                          <th>Độ ẩm đất</th>
                          <th>Bơm</th>
                          <th>Quạt</th>
                          <th>Đèn</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyTable.map((record, index) => (
                          <tr key={index}>
                            <td>
                              {new Date(record.createdAt).toLocaleString(
                                "vi-VN"
                              )}
                            </td>
                            <td>{record.temperature}°C</td>
                            <td>{record.soil}%</td>
                            <td
                              style={{
                                color: record.pump ? "green" : "#999",
                                fontWeight: "bold",
                              }}
                            >
                              {record.pump ? "ON" : "OFF"}
                            </td>
                            <td
                              style={{
                                color: record.fan ? "green" : "#999",
                                fontWeight: "bold",
                              }}
                            >
                              {record.fan ? "ON" : "OFF"}
                            </td>
                            <td
                              style={{
                                color: record.light ? "green" : "#999",
                                fontWeight: "bold",
                              }}
                            >
                              {record.light ? "ON" : "OFF"}
                            </td>
                          </tr>
                        ))}
                        {historyTable.length === 0 && (
                          <tr>
                            <td
                              colSpan="6"
                              style={{ textAlign: "center", color: "#999" }}
                            >
                              Chưa có dữ liệu lịch sử
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "devices" && (
              <div className="tab-content active">
                <h1>Điều khiển ({currentDeviceId})</h1>
                <div className="devices-grid">
                  <div className="device-card">
                    <h3>💧 Máy Bơm Nước</h3>
                    <div className="control-group">
                      <label>Chế độ:</label>
                      <select
                        value={control.pumpMode}
                        onChange={(e) =>
                          updateControlDirect("pumpMode", e.target.value)
                        }
                      >
                        <option value="AUTO">
                          Tự động (Chạy khi &lt; {control.soilAutoStart}% - Dừng
                          khi &gt; {control.soilAutoStop}%)
                        </option>
                        <option value="MANUAL">Thủ công</option>
                      </select>
                    </div>
                    <div className="control-group">
                      <label>Trạng thái:</label>
                      <div className="toggle-container">
                        <label
                          className={`switch ${
                            control.pumpMode === "AUTO" ? "disabled" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={control.pumpState}
                            disabled={control.pumpMode === "AUTO"}
                            onChange={(e) =>
                              updateControlDirect("pumpState", e.target.checked)
                            }
                          />
                          <span className="slider"></span>
                        </label>
                        <span
                          className="status-text"
                          style={{
                            color: control.pumpState ? "#22c55e" : "#999",
                          }}
                        >
                          {control.pumpState ? "ON" : "OFF"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="device-card">
                    <h3>💡 Đèn Chiếu Sáng</h3>
                    <div className="control-group">
                      <label>Chế độ:</label>
                      <select
                        value={control.lightMode}
                        onChange={(e) =>
                          updateControlDirect("lightMode", e.target.value)
                        }
                      >
                        <option value="AUTO">
                          Tự động (Bật {control.lightOnTime} - Tắt{" "}
                          {control.lightOffTime})
                        </option>
                        <option value="MANUAL">Thủ công</option>
                      </select>
                    </div>
                    <div className="control-group">
                      <label>Trạng thái:</label>
                      <div className="toggle-container">
                        <label
                          className={`switch ${
                            control.lightMode === "AUTO" ? "disabled" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={control.lightState}
                            disabled={control.lightMode === "AUTO"}
                            onChange={(e) =>
                              updateControlDirect(
                                "lightState",
                                e.target.checked
                              )
                            }
                          />
                          <span className="slider"></span>
                        </label>
                        <span
                          className="status-text"
                          style={{
                            color: control.lightState ? "#22c55e" : "#999",
                          }}
                        >
                          {control.lightState ? "ON" : "OFF"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="device-card">
                    <h3>💨 Quạt Làm Mát</h3>
                    <div className="control-group">
                      <label>Chế độ:</label>
                      <select
                        value={control.fanMode}
                        onChange={(e) =>
                          updateControlDirect("fanMode", e.target.value)
                        }
                      >
                        <option value="AUTO">
                          Tự động (Bật khi &gt; {control.fanAutoTemp}°C)
                        </option>
                        <option value="MANUAL">Thủ công</option>
                      </select>
                    </div>
                    <div className="control-group">
                      <label>Trạng thái:</label>
                      <div className="toggle-container">
                        <label
                          className={`switch ${
                            control.fanMode === "AUTO" ? "disabled" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={control.fanState}
                            disabled={control.fanMode === "AUTO"}
                            onChange={(e) =>
                              updateControlDirect("fanState", e.target.checked)
                            }
                          />
                          <span className="slider"></span>
                        </label>
                        <span
                          className="status-text"
                          style={{
                            color: control.fanState ? "#22c55e" : "#999",
                          }}
                        >
                          {control.fanState ? "ON" : "OFF"}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="tab-content active">
                <h1>Cấu hình ({currentDeviceId})</h1>
                <div className="devices-grid">
                  <div className="device-card">
                    <h3>🌱 Cấu hình Tưới Tự Động</h3>
                    <div className="control-group">
                      <label>Bắt đầu bơm khi ẩm &lt; (%):</label>
                      <input
                        type="number"
                        style={{ width: "80px" }}
                        value={tempSettings.soilAutoStart}
                        onChange={(e) =>
                          setTempSettings({
                            ...tempSettings,
                            soilAutoStart: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="control-group">
                      <label>Dừng bơm khi ẩm &gt; (%):</label>
                      <input
                        type="number"
                        style={{ width: "80px" }}
                        value={tempSettings.soilAutoStop}
                        onChange={(e) =>
                          setTempSettings({
                            ...tempSettings,
                            soilAutoStop: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="device-card">
                    <h3>💨 Cấu hình Quạt</h3>
                    <div className="control-group">
                      <label>Bật khi nhiệt độ &gt; (°C):</label>
                      <input
                        type="number"
                        style={{ width: "80px" }}
                        value={tempSettings.fanAutoTemp}
                        onChange={(e) =>
                          setTempSettings({
                            ...tempSettings,
                            fanAutoTemp: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="device-card">
                    <h3>💡 Cấu hình Đèn</h3>
                    <div className="control-group">
                      <label>Giờ Bật:</label>
                      <input
                        type="time"
                        value={tempSettings.lightOnTime}
                        onChange={(e) =>
                          setTempSettings({
                            ...tempSettings,
                            lightOnTime: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="control-group">
                      <label>Giờ Tắt:</label>
                      <input
                        type="time"
                        value={tempSettings.lightOffTime}
                        onChange={(e) =>
                          setTempSettings({
                            ...tempSettings,
                            lightOffTime: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: "20px", textAlign: "right" }}>
                  <button
                    onClick={saveSettings}
                    style={{
                      padding: "12px 25px",
                      backgroundColor: "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "16px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    💾 LƯU CẤU HÌNH
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h2>👋 Chào mừng bạn!</h2>
            <p>Vui lòng thêm thiết bị để bắt đầu theo dõi.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
