# 🛒 Model Shop E-Commerce Platform & NFT Marketplace

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-16.x+-green.svg)
![React](https://img.shields.io/badge/React-18.x-61dafb.svg)
![MySQL](https://img.shields.io/badge/MySQL-Database-orange.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Model Shop** is a modern, full-stack e-commerce platform dedicated to high-quality model kits, anime figures, and DIY components. Beyond traditional e-commerce capabilities, the application features an integrated **Web3 / NFT Marketplace**, allowing users to mint, buy, and sell exclusive digital collectibles linked to their physical products.

## 📑 Mục lục (Table of Contents)
- [✨ Tính năng nổi bật](#-tính-năng-nổi-bật)
- [🛠️ Công nghệ sử dụng](#️-công-nghệ-sử-dụng)
- [📂 Cấu trúc dự án](#-cấu-trúc-dự-án)
- [🚀 Hướng dẫn cài đặt & Khởi chạy](#-hướng-dẫn-cài-đặt--khởi-chạy)
- [📡 API & Tài liệu tham khảo](#-api--tài-liệu-tham-khảo)

---

## ✨ Tính năng nổi bật (Key Features)

- **🛒 Quản lý Giỏ hàng & Thanh toán (E-Commerce Core)**: Hệ thống mua sắm, quản lý sản phẩm, danh mục, giỏ hàng, và quy trình thanh toán hoàn chỉnh.
- **🎨 NFT & Web3 Integration**: Người dùng có thể đúc (mint) mô hình độc quyền thành NFT trên mạng lưới Blockchain, mua bán và trao đổi tài sản số một cách minh bạch.
- **🔔 Thông báo thời gian thực (Real-time Notifications)**: Sử dụng Socket.io để cung cấp thông báo cho người dùng ngay lập tức khi có đơn hàng mới, sự kiện hoặc tin nhắn.
- **💬 Cộng đồng & Trò chuyện (Community & Chat)**: Nơi giao lưu cộng đồng, hỗ trợ người dùng giao tiếp qua tin nhắn trực tiếp, post bài, bình luận và chia sẻ kinh nghiệm lắp ráp mô hình.
- **🔐 Bảo mật & Phân quyền (Security & Authorization)**: Đăng nhập, đăng ký an toàn và hệ thống phân quyền phức tạp (Admin, User, Support, Customizer).

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

### **Frontend (`model_shop_frontend`)**
* **Core:** React.js (Vite)
* **State Management:** Redux Toolkit, Context API
* **Routing:** React Router DOM
* **Styling:** CSS Modules / Vanilla CSS / UI Components
* **Real-time Engine:** Socket.io-client

### **Backend (`model_shop_backend`)**
* **Core:** Node.js, Express.js
* **Database:** MySQL / MariaDB
* **Caching:** Redis (Cấu hình tùy chọn cho hiệu năng)
* **Real-time Engine:** Socket.io
* **Blockchain/Web3:** Hardhat, Web3.js / Ethers.js, IPFS (via Pinata)

---

## 📂 Cấu trúc dự án (Project Architecture)

Dự án được triển khai với kiến trúc rõ ràng, chia làm 2 hệ thống độc lập:

```text
DACN-scraf/
├── model_shop_backend/     # RESTful API, Database Models, Smart Contracts
│   ├── src/
│   │   ├── config/         # Cấu hình Database & Biến môi trường
│   │   ├── controllers/    # Business logic xử lý yêu cầu
│   │   ├── hardhat/        # Môi trường deploy thông minh cho Web3
│   │   ├── models/         # Schema thiết kế Database (MySQL)
│   │   ├── routes/         # Khai báo các endpoints (Express routers)
│   │   ├── socket/         # Quản lý kết nối ròng (Websocket realtime)
│   │   └── utils/          # Chức năng dùng chung (IPFS, Email, NFT minting)
│   └── server.js           # Điểm khởi động (Entry point) của máy chủ
│
├── model_shop_frontend/    # React Single Page Application (SPA)
│   ├── public/             # Tài nguyên tĩnh (Logo, Icons)
│   ├── src/
│   │   ├── api/            # Tích hợp kết nối tới API Backend (Axios/Fetch)
│   │   ├── components/     # Thư viện UI Components tái sử dụng
│   │   ├── features/       # Chia module theo business domain (Admin, Shop, Cart)
│   │   ├── redux/          # Quản lý trạng thái chia sẻ (Redux Toolkits)
│   │   └── context/        # Các state toàn cục (Providers)
│   └── index.css           # Cấu hình CSS Global
│
├── database/               # File SQL cấu trúc và dữ liệu dựng DB
└── docs/                   # Tài liệu hệ thống và mã lỗi tham khảo
```

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy (Installation & Setup)

Hãy đảm bảo bạn đã cài đặt sẵn các phần mềm sau trên môi trường máy tính:
- **Node.js** (phiên bản `>= 16.x`)
- **NPM** hoặc **Yarn**
- **XAMPP / MySQL Server** (để quản lý cơ sở dữ liệu cục bộ)

### 1. Khởi tạo Cơ Sở Dữ Liệu
1. Bật **MySQL Server** (Khởi chạy Apache & MySQL từ bảng điều khiển XAMPP).
2. Tạo một cơ sở dữ liệu mới (Ví dụ: `model_shop`).
3. Dùng công cụ quản trị (phpMyAdmin, DBeaver) chạy (Import) file SQL từ đường dẫn:
   - Chạy `database/model_shop_database.txt` để thiết lập kiến trúc bảng (Database Scheme).
   - Chạy `database/insertdata.txt` để nhập dữ liệu có sẵn ban đầu.

### 2. Cài Đặt Thư Viện (Dependencies Installation)
Mở hai cửa sổ dòng lệnh riêng biệt để cài đặt dependencies cho frontend và backend:
```bash
# Terminal 1 - Backend Layer
cd model_shop_backend
npm install

# Terminal 2 - Frontend Layer
cd model_shop_frontend
npm install
```

### 3. Khởi Động Hệ Thống (Start the Application)
Để quá trình chạy không bị lỗi, vui lòng khởi động Server Backend trước, sau đó đến Giao diện Frontend:
```bash
# Terminal 1 - Khởi chạy Backend Server
cd model_shop_backend
npm start
# 💡 Server API dự kiến sẽ lắng nghe tại `http://localhost:5000` (ngoại trừ .env chỉ định Cổng khác)
```

```bash
# Terminal 2 - Khởi chạy Khung Frontend
cd model_shop_frontend
npm run dev
# 💡 Ứng dụng Frontend dự kiến mở tại `http://localhost:5173`
```

---

## 📡 API & Tài liệu tham khảo (API & Documentation)
Để giúp các lập trình viên dễ dàng tiếp cận với mã nguồn, dự án có kèm theo các tài liệu tham chiếu:
- **Tiêu chuẩn mã lỗi**: Bạn vui lòng xem các mã HTTP Response code ở tệp chi tiết `docs/errorcode.txt`.
- **Luồng dữ liệu và cấu trúc**: Tham chiếu ở trong tệp `docs/folder structure.txt` để có cái nhìn toàn cảnh hơn.

---

> 💻 **Được phát triển với mục tiêu đem Web3 và E-Commerce lại gần nhau!** - Nếu bài tập hoặc đồ án này hữu ích, đừng ngần ngại đánh giá nhé!
