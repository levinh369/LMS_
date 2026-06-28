$(document).ready(function () {
    loadAdminLayout();
});
function loadAdminLayout() {
    // 1. Nạp Banner/Sidebar dùng chung
    $("#sidebar-placeholder").load("/shared/banner.html", function () {
        const path = window.location.pathname.toLowerCase(); // Chuyển về chữ thường để so sánh chính xác
        let pageTitle = "Hệ thống quản lý";
        let breadcrumb = "Admin";
        
        const userInfoRaw = localStorage.getItem("user_info");
        if (!userInfoRaw) {
            window.location.href = "/auth/login.html";
            return;
        }
        
        const userInfo = JSON.parse(userInfoRaw);
        const roleId = parseInt(userInfo.roleId || userInfo.role); // Đọc linh hoạt cả roleId hoặc role
        const token = localStorage.getItem("jwt_token") || localStorage.getItem("token");

        if (userInfo.avatar && userInfo.avatar !== 'null') {
            $("#user-avatar").attr("src", userInfo.avatar); 
        }
        
        // Đổ tên tài khoản lên UI
        $("#user-fullname").text(userInfo.fullName || userInfo.username || "User Name");

        // --- PHẦN PHÂN QUYỀN TRẢM MENU HEADER ---
        let roleText = "Nhân viên";
        if (roleId === 1) { // NẾU LÀ ADMIN
            roleText = "QUẢN TRỊ VIÊN";
            $("#btn-nav-withdraw-history").remove(); 

            // Gọi API lấy số lượng chờ duyệt
            fetch('https://lms-u2jn.onrender.com/api/Dashboard/pending-counts', { 
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

                    if (withdrawCount > 0) {
                        $("#badge-withdraw-count").text(withdrawCount > 99 ? '99+' : withdrawCount).removeClass("d-none");
                    }
                    if (teacherCount > 0) {
                        $("#badge-teacher-count").text(teacherCount > 99 ? '99+' : teacherCount).removeClass("d-none");
                    }
                }
            })
            .catch(err => console.error("Lỗi lấy số lượng đếm thông báo:", err));

        } else { // NẾU LÀ GIẢNG VIÊN (TEACHER)
            roleText = "GIẢNG VIÊN";
            // Ép link menu Thống kê của Teacher về đúng file riêng của họ nếu cần
            $("#btn-nav-dashboard").attr("href", "/Dashboard/Dashboard-teacher.html"); 
            
            // Xóa các quyền của Teacher
            $("#btn-nav-rank").remove();
            $("#btn-nav-withdraw").remove();
            $("#btn-nav-category").remove(); 
            $("#btn-nav-roadmap").remove();
            $("#btn-nav-teacher-request").remove(); 
        }
        $("#user-role").text(roleText);

        // --- FIX CHỖ NÀY: MAPPING TIÊU ĐỀ & BREADCRUMB ---
        // Đặt mặc định là Thống kê nếu path trống hoặc chỉ chứa từ khóa dashboard
        if (path === "" || path === "/" || path.includes("dashboard") || path.endsWith("index.html" && path.includes("dashboard"))) {
            pageTitle = "Báo cáo Thống kê";
            breadcrumb = "Thống kê";
        } else if (path.includes("category")) {
            pageTitle = "Quản lý Danh mục Sản phẩm";
            breadcrumb = "Danh mục";
        } else if (path.includes("order")) {
            pageTitle = "Quản lý Đơn hàng";
            breadcrumb = "Đơn hàng";
        } else if (path.includes("course")) {
            pageTitle = "Quản lý Khóa học";
            breadcrumb = "Khóa học";
        } else if (path.includes("manageruser")) {
            pageTitle = "Quản lý Người dùng";
            breadcrumb = "Người dùng";
        } else if (path.includes("roadmap") || path.includes("road_map")) {
            pageTitle = "Quản lý Lộ trình";
            breadcrumb = "Lộ trình";
        } else if (path.includes("manager-comment")) {
            pageTitle = "Quản lý Bình luận";
            breadcrumb = "Bình luận";
        } else if (path.includes("manager-rank")) {
            pageTitle = "Cấu hình Cấp bậc Giảng viên";
            breadcrumb = "Hạng giảng viên";
        } else if (path.includes("withdraw-history")) { 
            pageTitle = "Lịch sử rút tiền";
            breadcrumb = "Lịch sử rút tiền";
        } else if (path.includes("teacher-wallet") || path.includes("withdraw")) { 
            pageTitle = "Yêu cầu Rút tiền";
            breadcrumb = "Yêu cầu rút tiền";
        } else if (path.includes("teacherrequests") || path.includes("teacher-request") || path.includes("admin-approvals")) { 
            pageTitle = "Phê duyệt Giảng viên";
            breadcrumb = "Yêu cầu ứng tuyển";
        }

        $("#current-page-title").text(pageTitle);
        $("#current-breadcrumb").text(breadcrumb);

        // --- FIX CHỖ NÀY: ACTIVE CƠ CHẾ THÔNG MINH ---
        $(".nav-menu-item").each(function() {
            let href = $(this).attr("href").toLowerCase();
            
            // Nếu đang ở trang chủ dashboard hoặc đường dẫn khớp
            if ((breadcrumb === "Thống kê" && href.includes("dashboard")) || (href && path.includes(href))) {
                $(this).addClass("active"); 
            } else {
                $(this).removeClass("active");
            }
        });
    });
}