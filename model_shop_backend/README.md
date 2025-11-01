## 🚀 Công nghệ sử dụng

- **Node.js + Express.js** – API server chính
- **MySQL2** – Kết nối cơ sở dữ liệu
- **JWT + bcrypt** – Xác thực và bảo mật người dùng
- **Multer** – Upload hình ảnh (avatar, bài viết)
- **dotenv** – Quản lý biến môi trường
- **CORS + Cookie Parser** – Hỗ trợ giao tiếp frontend

---

## 📁 Cấu trúc thư mục

model_shop_backend_express/
│ .env.example
│ .gitignore
│ package.json
│ README.md
│
└───src/
├── config/ # Kết nối DB, helper
├── controllers/ # Xử lý logic từng module
├── routes/ # Khai báo API endpoint
├── middleware/ # Xác thực, upload, xử lý lỗi
├── uploads/ # Lưu file ảnh
├── app.js # Khởi tạo Express
└── server.js # Chạy server