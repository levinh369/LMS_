$(document).ready(function () {
    loadAdminLayout();
});

function loadAdminLayout() {
    // 1. Nạp Banner (Dùng chung cho các trang Admin)
    $("#sidebar-placeholder").load("/pages/shared/banner.html", function () {
        const path = window.location.pathname;
        let pageTitle = "Hệ thống quản lý";
        let breadcrumb = "Admin";
        const userInfo = JSON.parse(localStorage.getItem("user_info"));
        if (userInfo.avatar && userInfo.avatar !== 'null') {
            $("#user-avatar").attr("src", userInfo.avatar); // Đổi ảnh từ default sang ảnh người dùng
        }
        // Đổ tên vào UI
        $("#user-fullname").text(userInfo.username);

        // Đổ chức danh dựa trên roleId
        let roleText = "Nhân viên";
        if (userInfo.role === 1) {
            roleText = "QUẢN TRỊ VIÊN";
        } else if (userInfo.role === 3) {
            roleText = "GIẢNG VIÊN";
            $("#btn-nav-dashboard").attr("href", "/dashboard/dashboard-teacher.html"); 
        }
        $("#user-role").text(roleText);
        // --- PHẦN QUAN TRỌNG: LOGIC ACTIVE NÚT ---
        // Duyệt qua tất cả các thẻ <a> trong banner vừa nạp
        $(".nav-menu-item").each(function() {
            let href = $(this).attr("href");
            
            // Nếu đường dẫn hiện tại của trình duyệt có chứa link của nút này
            if (path.includes(href)) {
                $(this).addClass("active"); // Thêm class active để hiện vạch trắng/đổi màu
            }
        });

        // --- PHẦN MAPPING TIÊU ĐỀ ---
        // Lưu ý: Kiểm tra keyword khớp với folder/file của bác
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
        } else if (path.includes("roadmap")) {
            pageTitle = "Quản lý Lộ trình";
            breadcrumb = "Lộ trình";
        } else if (path.includes("manager-comment")) {
            pageTitle = "Quản lý Bình luận";
            breadcrumb = "Bình luận";
        } else if (path.includes("dashboard")) { 
            pageTitle = "Báo cáo Thống kê";
            breadcrumb = "Thống kê";
        }

        // Đổ dữ liệu vào UI (các ID này đã có trong banner.html bác gửi)
        $("#current-page-title").text(pageTitle);
        $("#current-breadcrumb").text(breadcrumb);
    });

    // Nếu bác không dùng sidebar thì xóa/comment đoạn này để tránh lỗi nạp đè banner
    // $("#sidebar-placeholder").load("/shared/sidebar.html");
}