$(document).ready(function () {
    loadAdminLayout();
});

function loadAdminLayout() {
    // 1. Nạp Banner/Sidebar dùng chung
    $("#sidebar-placeholder").load("/shared/banner.html", function () {
        const path = window.location.pathname;
        let pageTitle = "Hệ thống quản lý";
        let breadcrumb = "Admin";
        
        const userInfoRaw = localStorage.getItem("user_info");
        if (!userInfoRaw) {
            window.location.href = "/auth/login.html";
            return;
        }
        
        const userInfo = JSON.parse(userInfoRaw);
        const roleId = parseInt(userInfo.role); // Ép kiểu về số an toàn
        const token = localStorage.getItem("jwt_token") || localStorage.getItem("token"); // Lấy token để gọi API

        if (userInfo.avatar && userInfo.avatar !== 'null') {
            $("#user-avatar").attr("src", userInfo.avatar); 
        }
        
        // Đổ tên tài khoản lên UI
        $("#user-fullname").text(userInfo.username || "User Name");

        // --- PHẦN PHÂN QUYỀN TRẢM MENU HEADER ---
        let roleText = "Nhân viên";
        if (roleId === 1) { // NẾU LÀ ADMIN
            roleText = "QUẢN TRỊ VIÊN";
            $("#btn-nav-withdraw-history").remove(); 

            // 📍 THÊM MỚI TẠI ĐÂY: GỌI API LẤY SỐ LƯỢNG LÚC VỪA LOAD TRANG
            fetch('https://lms-u2jn.onrender.com/api/Dashboard/pending-counts', { // Nhớ sửa port 5001 thành port Backend của bác nhé
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(res => {
                if (res.success || res.Success) {
                    const data = res.data || res.Data;
                    const withdrawCount = data.withdrawCount || data.WithdrawCount || 0;
                    const teacherCount = data.teacherCount || data.TeacherCount || 0;

                    // Vẽ số lên UI - Badge Rút tiền
                    if (withdrawCount > 0) {
                        $("#badge-withdraw-count").text(withdrawCount > 99 ? '99+' : withdrawCount).removeClass("d-none");
                    }
                    
                    // Vẽ số lên UI - Badge Duyệt giảng viên
                    if (teacherCount > 0) {
                        $("#badge-teacher-count").text(teacherCount > 99 ? '99+' : teacherCount).removeClass("d-none");
                    }
                }
            })
            .catch(err => console.error("Lỗi lấy số lượng đếm thông báo:", err));
            // 📍 KẾT THÚC ĐOẠN THÊM MỚI

        } else { // NẾU LÀ GIẢNG VIÊN
            roleText = "GIẢNG VIÊN";
            $("#btn-nav-dashboard").attr("href", "/Dashboard/dashboard-teacher.html"); 
            
            // Xóa các quyền không cần thiết của Teacher
            $("#btn-nav-rank").remove();
            $("#btn-nav-withdraw").remove();
            
            // 📍 THÊM ĐOẠN NÀY ĐỂ ẨN CATEGORY VÀ ROADMAP
            $("#btn-nav-category").remove(); 
            $("#btn-nav-roadmap").remove();

            // 📍 THÊM DÒNG NÀY ĐỂ ẨN MENU DUYỆT GIẢNG VIÊN VỚI TEACHER
            $("#btn-nav-teacher-request").remove(); 
        }
        $("#user-role").text(roleText);

        // --- PHẦN ACTIVE NÚT NAVIGATE ---
        $(".nav-menu-item").each(function() {
            let href = $(this).attr("href");
            if (href && path.includes(href)) {
                $(this).addClass("active"); 
            }
        });

        // --- PHẦN MAPPING TIÊU ĐỀ TRANG ---
        if (path.includes("category")) {
            pageTitle = "Quản lý Danh mục Sản phẩm";
            breadcrumb = "Danh mục";
        } else if (path.includes("order")) {
            pageTitle = "Quản lý Đơn hàng";
            breadcrumb = "Đơn hàng";
        } else if (path.includes("course")) {
            pageTitle = "Quản lý Khóa học";
            breadcrumb = "Khóa học";
        } else if (path.includes("managerUser")) {
            pageTitle = "Quản lý Người dùng";
            breadcrumb = "Người dùng";
        } else if (path.includes("roadmap") || path.includes("road_map")) {
            pageTitle = "Quản lý Lộ trình";
            breadcrumb = "Lộ trình";
        } else if (path.includes("manager-comment")) {
            pageTitle = "Quản lý Bình luận";
            breadcrumb = "Bình luận";
        } else if (path.includes("dashboard")) { 
            pageTitle = "Báo cáo Thống kê";
            breadcrumb = "Thống kê";
        } else if (path.includes("manager-rank")) {
            pageTitle = "Cấu hình Cấp bậc Giảng viên";
            breadcrumb = "Hạng giảng viên";
        } else if (path.includes("withdraw-history")) { 
            pageTitle = "Lịch sử rút tiền";
            breadcrumb = "Lịch sử rút tiền";
        } else if (path.includes("teacher-wallet")) { 
            pageTitle = "Yêu cầu Rút tiền";
            breadcrumb = "Yêu cầu rút tiền";
        } else if (path.includes("TeacherRequests") || path.toLowerCase().includes("teacher-request") || path.includes("admin-approvals")) { 
            // 📍 THÊM MAPPING TIÊU ĐỀ CHO TRANG DUYỆT GIẢNG VIÊN
            pageTitle = "Phê duyệt Giảng viên";
            breadcrumb = "Yêu cầu ứng tuyển";
        }

        $("#current-page-title").text(pageTitle);
        $("#current-breadcrumb").text(breadcrumb);
    });
}