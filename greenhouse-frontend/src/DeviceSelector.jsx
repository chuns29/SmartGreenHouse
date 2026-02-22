import React from 'react';

function DeviceSelector({ devices, currentDeviceId, onSelect }) {
  // Kiểm tra an toàn: Nếu devices không tồn tại hoặc KHÔNG PHẢI LÀ MẢNG
  if (!devices || !Array.isArray(devices) || devices.length === 0) {
    return (
      <div className="device-selector" style={{justifyContent: 'center'}}>
        <span style={{color: '#666'}}>🚫 Bạn chưa có thiết bị nào.</span>
      </div>
    );
  }

  return (
    <div className="device-selector">
      <label style={{fontWeight: 'bold', color: '#333'}}>📡 Đang điều khiển:</label>
      <select 
        value={currentDeviceId || ''} 
        onChange={(e) => onSelect(e.target.value)}
        className="device-select-box"
      >
        {devices.map(dev => (
          <option key={dev.deviceId} value={dev.deviceId}>
            {dev.name} ({dev.deviceId})
          </option>
        ))}
      </select>
    </div>
  );
}

export default DeviceSelector;