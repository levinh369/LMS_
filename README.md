# 🎓 Online Learning Management System (LMS)

A web-based **Learning Management System (LMS)** designed to provide an online learning experience, including course management, video-based learning, user authentication, learning progress tracking, comments, and online payments.

The system is developed using **ASP.NET Core 8 Web API** with a layered architecture based on the **Repository Pattern and Service Layer**.

---

## 🚀 Technologies

### Backend

* **Framework:** ASP.NET Core 8 Web API
* **Database:** Microsoft SQL Server
* **ORM:** Entity Framework Core
* **Architecture:** Repository Pattern + Service Layer
* **Authentication:** JWT Authentication
* **Authorization:** Role-Based Access Control (RBAC)
* **Password Security:** BCrypt
* **Real-time Communication:** SignalR
* **Payment:** VNPay

### Frontend

* **Languages:** HTML5, CSS3, JavaScript (ES6+)
* **Libraries:** jQuery
* **UI Framework:** Bootstrap 5
* **Icons:** Font Awesome, Bootstrap Icons

### External Services

* **Video Hosting:** Bunny.net, YouTube API
* **File & Image Storage:** Cloudinary / Server Storage

---

## ✨ Main Features

### 👤 Authentication & Authorization

* User registration and login
* JWT-based authentication
* Role-based authorization for Admin and User
* Secure password hashing with BCrypt

### 📚 Course Management

* Manage course categories
* Manage courses
* Manage chapters and lessons
* Manage course content and information
* Support free and paid courses

### 🎥 Online Learning

* Watch course videos
* Support video hosting through Bunny.net and YouTube
* Continue learning from previous progress
* Track learning progress
* Manage course enrollment

### 💬 Comment System

* Create comments on courses/lessons
* Support nested comments and replies
* Admin moderation
* Hide/show comments
* Soft delete and restore comments

### 💳 Payment

* Integrated **VNPay** for online course payments
* Support paid course purchasing
* Handle payment results and order information


### 🔔 Real-time Features

* Integrated **SignalR** for real-time communication
* Real-time notification features are currently under development

---

## 🏗️ Project Architecture

The backend is organized using **Repository Pattern and Service Layer**:

```text
Controller
    ↓
Service
    ↓
Repository
    ↓
Entity Framework Core
    ↓
SQL Server
```


## 🚀 Deployment

The project has been deployed for testing and demonstration purposes.

### Deployment & Hosting

* **Frontend/Application:** Vercel
* **Database:** SmartASP.NET
* **Video Hosting:** Bunny.net / YouTube

External services are configured through environment variables and application configuration.

---


## 📂 Repository

**GitHub:** https://github.com/levinh369/LMS_.git

---

## 👨‍💻 Author

**Le Vinh**

Software Engineering Student
East Asia University of Technology
