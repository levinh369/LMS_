# 🎓 Online Learning Management System (LMS)

Dự án Hệ thống Quản lý Học tập trực tuyến được xây dựng với kiến trúc Clean Architecture, hỗ trợ quản lý khóa học, tương tác qua bình luận và tích hợp thanh toán.

---

## 🚀 Công nghệ sử dụng

### **Backend**
* **Framework:** ASP.NET Core 8.0 (Web API)
* **Database:** SQL Server
* **ORM:** Entity Framework Core (Repository Pattern)
* **Security:** JWT Authentication, BCrypt Password Hashing
* **Integrations:** VNPAY (Thanh toán), Cloudinary (Lưu trữ ảnh), Google/Facebook Auth.

### **Frontend**
* **Technologies:** HTML5, CSS3, JavaScript (ES6+), jQuery
* **UI Framework:** Bootstrap 5, FontAwesome, Bootstrap Icons

---

## ✨ Tính năng chính

- [x] **Xác thực:** Đăng ký, đăng nhập (JWT), phân quyền Admin/User.
- [x] **Quản lý bình luận:** Hệ thống Comment/Reply đa cấp (Admin có quyền ẩn/hiện, xóa mềm, khôi phục).
- [x] **Thanh toán:** Tích hợp cổng thanh toán VNPAY cho các khóa học trả phí.
- [x] **Lưu trữ:** Quản lý file và hình ảnh trực tiếp trên Cloudinary/Server.
- [ ] **Real-time:** Thông báo thời gian thực với SignalR (Đang phát triển).

---

## 🛠️ Hướng dẫn cài đặt

1. **Clone dự án:**
   ```bash
   git clone [https://github.com/levinh369/LMS_.git](https://github.com/levinh369/LMS_.git)