🌿 Smart Greenhouse IoT System

Một hệ thống IoT hỗ trợ giám sát và điều khiển nhà kính thông minh. Dự án giúp theo dõi sát sao các chỉ số môi trường theo thời gian thực và quản lý thiết bị từ xa thông qua bảng điều khiển web (Web Dashboard).

🚀 Chức năng nổi bật (Features)

Giám sát thời gian thực: Thu thập và hiển thị dữ liệu nhiệt độ, độ ẩm liên tục lên trang Dashboard.

Lưu trữ & Tra cứu lịch sử: Hệ thống tự động lưu trữ dữ liệu môi trường và lịch sử trạng thái hoạt động của thiết bị (lưu trữ trong vòng 2 ngày).

Bộ lọc thông minh: Cho phép người dùng lọc và xem lại dữ liệu lịch sử theo từng ngày cụ thể.

Điều khiển từ xa: Gửi tín hiệu và luồng dữ liệu điều khiển trực tiếp đến các thiết bị phần cứng trong nhà kính (ví dụ: bật/tắt máy bơm, quạt).

🛠️ Phần cứng & Linh kiện (Hardware)

Vi điều khiển trung tâm: ESP32

Cảm biến nhiệt độ và độ ẩm (Ví dụ: DHT11 / DHT22 / AHT20)


💻 Công nghệ sử dụng (Tech Stack)

Phần mềm nhúng (Firmware): C/C++ (Lập trình trên nền tảng Arduino IDE / PlatformIO).

Backend: Node.js / Express (Xử lý API, lưu trữ dữ liệu và giao tiếp với phần cứng).

Frontend: React (Xây dựng giao diện Web Dashboard trực quan, tương tác thời gian thực).

Cơ sở dữ liệu: MongoDB

Giao thức truyền thông: Wi-Fi, HTTP / MQTT.

⚙️ Hướng dẫn cài đặt (Installation & Setup)

Để chạy toàn bộ hệ thống này trên máy tính cục bộ, hãy làm theo các bước sau:

1. Tải dự án

git clone [https://github.com/chuns29/Smart-Greenhouse.git](https://github.com/chuns29/Smart-Greenhouse.git)


2. Thiết lập Web Dashboard (Node.js & React)

Khởi chạy Backend Server:

cd backend        # Di chuyển vào thư mục backend (thay đổi tên thư mục cho đúng thực tế)
npm install       # Cài đặt các thư viện cần thiết
npm start         # Chạy server


Khởi chạy Frontend (Giao diện người dùng):

cd frontend       # Di chuyển vào thư mục frontend
npm install       # Cài đặt các thư viện React
npm start         # Mở giao diện web trên trình duyệt


3. Thiết lập Phần cứng (ESP32)

Mở thư mục chứa mã nguồn nhúng bằng Arduino IDE.

Cài đặt các thư viện cần thiết cho cảm biến.

Mở file mã nguồn chính và cập nhật thông tin:

WIFI_SSID: Tên mạng Wi-Fi của bạn.

WIFI_PASSWORD: Mật khẩu mạng Wi-Fi.

Cập nhật địa chỉ IP của server Node.js đang chạy để ESP32 có thể gửi dữ liệu đến.

Kết nối board mạch ESP32 với máy tính qua cáp USB và bấm Upload.

👤 Tác giả (Author)

Tên: Dương Quang Chung

Email: chungduong10@outlook.com

GitHub: @chuns29
