const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Dùng để mã hóa mật khẩu
const jwt = require('jsonwebtoken'); // Dùng để tạo token
const User = require('../models/User'); // Gọi khuôn mẫu User vào để dùng

// KHÓA BÍ MẬT (Để ký tên vào token - Trong thực tế nên để vào file .env)
const JWT_SECRET = 'day_la_khoa_bi_mat_cua_greenhouse_123456'; 

// ================= API ĐĂNG KÝ =================
// Đường dẫn: POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Kiểm tra xem user này đã tồn tại chưa
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: "Tài khoản đã tồn tại!" });
        }

        // 2. Mã hóa mật khẩu (Băm nát mật khẩu ra thành chuỗi ký tự loằng ngoằng)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Tạo user mới
        const newUser = new User({
            username,
            password: hashedPassword // Lưu mật khẩu đã mã hóa, KHÔNG lưu mật khẩu gốc
        });

        // 4. Lưu vào Database
        await newUser.save();

        res.status(201).json({ message: "Đăng ký thành công!" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi Server" });
    }
});

// ================= API ĐĂNG NHẬP =================
// Đường dẫn: POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Tìm user trong database
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: "Sai tên đăng nhập hoặc mật khẩu!" });
        }

        // 2. So sánh mật khẩu nhập vào với mật khẩu mã hóa trong DB
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Sai tên đăng nhập hoặc mật khẩu!" });
        }

        // 3. Nếu đúng, tạo Token (Vé thông hành)
        const token = jwt.sign(
            { userId: user._id }, 
            JWT_SECRET, 
            { expiresIn: '1h' } // Token hết hạn sau 1 giờ
        );

        // 4. Trả token và userId về cho Frontend (CẬP NHẬT Ở ĐÂY)
        res.json({ 
            token, 
            username: user.username,
            userId: user._id // <--- MỚI: Trả về ID người dùng
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi Server" });
    }
});

module.exports = router;