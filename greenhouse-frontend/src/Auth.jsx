import { useState } from 'react';

function Auth({ onLoginSuccess }) {
    const [isRegister, setIsRegister] = useState(false); // Chế độ Đăng ký hay Đăng nhập?
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        setError(''); // Xóa lỗi cũ
        const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
        
        try {
            // Gọi API sang Backend (Port 3000)
            const res = await fetch(`http://localhost:3000${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (!res.ok) {
                // Nếu server báo lỗi (VD: sai mật khẩu)
                setError(data.message || 'Có lỗi xảy ra!');
            } else {
                // Thành công
                if (isRegister) {
                    alert("Đăng ký thành công! Hãy đăng nhập ngay.");
                    setIsRegister(false); // Chuyển về màn hình đăng nhập
                } else {
                    // Nếu là Đăng nhập -> Lưu token VÀ USERID báo cho App biết
                    // CẬP NHẬT Ở ĐÂY: Truyền thêm userId
                    onLoginSuccess(data.token, data.userId);
                }
            }
        } catch (err) {
            setError("Không kết nối được Server!");
            console.error(err);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2>{isRegister ? 'ĐĂNG KÝ TÀI KHOẢN' : 'ĐĂNG NHẬP HỆ THỐNG'}</h2>
                
                {error && <p style={{color: 'red', marginBottom: '10px'}}>{error}</p>}

                <input 
                    type="text" 
                    className="auth-input" 
                    placeholder="Tên đăng nhập"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                
                <input 
                    type="password" 
                    className="auth-input" 
                    placeholder="Mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button className="auth-btn" onClick={handleSubmit}>
                    {isRegister ? 'Đăng Ký' : 'Đăng Nhập'}
                </button>

                <p className="auth-switch" onClick={() => setIsRegister(!isRegister)}>
                    {isRegister 
                        ? 'Đã có tài khoản? Quay lại Đăng nhập' 
                        : 'Chưa có tài khoản? Đăng ký ngay'}
                </p>
            </div>
        </div>
    );
}

export default Auth;