
let searchTimeout;
const AuthHelper = {
    // Hàm này dùng để lưu Token và thông tin User sau khi Login/Register thành công
   saveAuth: function(authData) {
    debugger
    // 1. Lưu Token (Từ trường Token bên C#)
    localStorage.setItem("jwt_token", authData.token);
    const idToSave = authData.userId; 
    localStorage.setItem("user_id", idToSave); 
    localStorage.setItem("user_info", JSON.stringify({
        id: idToSave,
        username: authData.username,
        role: authData.role,
        avatar: authData.avatarUrl,
        email: authData.email
    }));
},

    // Hàm lấy thông tin User để hiển thị lên Banner
    getUserInfo: function() {
        const info = localStorage.getItem("user_info");
        return info ? JSON.parse(info) : null;
    },
    openModal: function() {
    // 1. Lấy element của cái Modal
    var modalEmp = document.getElementById('authChoiceModal');
    
    if (modalEmp) {
        var myModal = new bootstrap.Modal(modalEmp);
        myModal.show();
    } else {
        console.error("Ông giáo ơi, không tìm thấy cái Modal nào tên là #authChoiceModal trong HTML cả!");
    }
},
    showLoginForm: function() {
        $('#modalTitle').text('Đăng nhập');
        $('#step-choice, #step-register-form').hide();
        $('#step-login-form').fadeIn(200);
    },

    // Hiện Form Đăng ký
    showRegisterForm: function() {
        $('#modalTitle').text('Tạo tài khoản mới');
        $('#step-choice, #step-login-form').hide();
        $('#step-register-form').fadeIn(200);
    },

    // Quay lại màn hình lựa chọn ban đầu
    showChoices: function() {
        $('#modalTitle').text('Tham gia LMS Academy');
        $('#step-register-form, #step-login-form').hide();
        $('#step-choice').fadeIn(200);
    },
    isTokenExpired: function(token) {
        if (!token) return true;
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(atob(base64));
            
            const currentTime = Math.floor(Date.now() / 1000); // Đổi sang giây
            return payload.exp < currentTime; // Trả về true nếu đã hết hạn
        } catch (e) {
            return true;
        }
    },

checkLoginStatus: function() {
    const token = localStorage.getItem("jwt_token");
    const userInfoJson = localStorage.getItem("user_info");
    debugger
    const $guestZone = $('#guest-zone');
    const $userZone = $('#user-zone');

    if (token && userInfoJson && !AuthHelper.isTokenExpired(token)) {
        try {
            const user = JSON.parse(userInfoJson);
            
            // UI Switch
            $guestZone.addClass('d-none').removeClass('d-flex');
            $userZone.removeClass('d-none').addClass('d-flex');

            // Điền tên
            const displayName = user.fullName || user.username || "Học viên";
            $('#nav-fullname, #nav-user-name, #nav-fullname-mobile').text(displayName);

            // Điền ảnh (Cả bên ngoài và bên trong dropdown)
            const avatarUrl = user.avatar || "../assets/img/default-avatar.png";
            $('#nav-avatar, #nav-avatar-inside').attr('src', avatarUrl);

        } catch (e) {
            AuthHelper.clearAuthSilently();
            AuthHelper.showGuestUI($guestZone, $userZone);
        }
    } else {
        AuthHelper.clearAuthSilently();
        AuthHelper.showGuestUI($guestZone, $userZone);
    }
},

// Hàm chỉ xóa dữ liệu, không làm gì thêm
clearAuthSilently: function() {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("user_info");
},

// Hàm chỉ đổi giao diện sang nút Đăng nhập/Đăng ký
showGuestUI: function($guest, $user) {
    $guest.removeClass('d-none').addClass('d-flex');
    $user.addClass('d-none').removeClass('d-flex');
},

// Hàm này CHỈ gọi khi người dùng bấm vào nút "Đăng xuất"
logout: function() {
    AuthHelper.clearAuthSilently();
    window.location.href = "/auth/login.html";
},
    initMyCoursesEvents: function() {
        $(document).on('click', '#btnMyCourses', function(e) {
            e.stopPropagation();
            $('#my-courses-popover').fadeToggle(200);
        });

        $(document).on('click', function() {
            $('#my-courses-popover').fadeOut(200);
        });

        $(document).on('click', '#my-courses-popover', function(e) {
            e.stopPropagation();
        });
    },
    renderMyCourses: async function() {
    const token = localStorage.getItem("jwt_token");
    debugger
    if (!token) return;

    // Hiển thị loading nhẹ trong lúc đợi (option)
    $('#my-courses-list').html('<div class="p-3 text-center small text-muted">Đang tải...</div>');

    try {
        const response = await $.ajax({
            url: "http://vinh369-001-site1.site4future.com/api/Course/my-course", // URL API của ông
            type: 'GET',
            headers: {
                'Authorization': `Bearer ${token}` // Gửi token lên để Backend lấy UserId
            }
        });

        if (response.success && response.data && response.data.length > 0) {
           let html = response.data.map(c => `
                <a href="/learn/learning.html?id=${c.courseId}" class="course-item-mini text-decoration-none">
                    <img src="${c.thumbnailUrl || '../assets/img/default-course.png'}" onerror="this.src='../assets/img/default-course.png'">
                    <div class="info">
                        <div class="title" title="${c.title}">${c.title}</div>
                        
                        <div class="last-learned text-muted" style="font-size: 11px;">
                            <i class="bi bi-clock-history"></i> ${c.lastLearnedFriendly || 'Chưa học'}
                        </div>

                        <div class="progress mt-1 custom-progress" 
                            style="height: 8px;" 
                            title="Tiến độ: ${Math.round(c.progress ?? 0)}%">
                            <div class="progress-bar bg-primary" 
                                style="width: ${c.progress ?? 0}%">
                            </div>
                        </div>
                    </div>
                </a>
            `).join('');
            $('#my-courses-list').html(html);
        } else {
            $('#my-courses-list').html('<div class="p-3 text-center small text-muted">Bạn chưa tham gia khóa học nào.</div>');
        }
    } catch (error) {
        console.error("Lỗi lấy khóa học:", error);
        $('#my-courses-list').html('<div class="p-3 text-center small text-danger">Không thể tải khóa học.</div>');
    }
},
handleAuthRequired: function(actionIfLoggedIn) {
    const token = localStorage.getItem("jwt_token");
    debugger
    if (token && !this.isTokenExpired(token)) {
        // Có "chìa khóa" rồi -> Làm việc luôn!
        actionIfLoggedIn();
    } else {
        // Chưa có -> Mở modal để lấy "chìa khóa"
        this.openModal();
        this.showChoices();
        window.pendingAction = actionIfLoggedIn; 
    }
},
};

$.ajaxSetup({
    beforeSend: function(xhr, settings) {
        if (settings.url.includes('/Auth/login') || settings.url.includes('/Auth/register')) {
            return; 
        }

        const token = localStorage.getItem("jwt_token");
        if (token && token !== "undefined") {
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        }
    },
    error: function (xhr, textStatus, errorThrown) {
        // --- ĐOẠN SỬA Ở ĐÂY ---
        // 'this' ở đây chính là object settings của ajax vừa gọi
        // Nếu URL của request có chứa '/login' thì thoát ra, để hàm catch ở trang đó tự xử
        if (this.url.includes('/login') || this.url.includes('/register')) {
            return; 
        }

        // Chỉ xử lý 401 (Hết hạn) cho các API khác
        if (xhr.status === 401) {
            console.warn("Backend báo: Token hết hạn hoặc không hợp lệ!");
            
            // Xóa sạch rác
            localStorage.removeItem("jwt_token");
            localStorage.removeItem("user_info");

            // Chỉ alert và redirect nếu không phải đang ở trang login
            if (!window.location.pathname.includes("login.html")) {
                alert("Phiên đăng nhập hết hạn, mời bác đăng nhập lại!");
                window.location.href = "/auth/login.html";
            }
        }
    }
});
// 1. Sửa lại hàm renderItem để khớp với DTO từ Backend C#
AuthHelper.renderItem = function(item) {
    // Chuyển Id thành URL chi tiết
    const detailUrl = `/home/detail.html?id=${item.id}`;
    // ThumbnailUrl từ C# sẽ thành thumbnailUrl (viết thường chữ t)
    const imgUrl = item.thumbnailUrl || '../assets/img/default-course.png';

    return `
        <a href="${detailUrl}" class="search-item d-flex align-items-center p-2 text-decoration-none text-dark">
            <img src="${imgUrl}" class="rounded me-3" style="width: 40px; height: 25px; object-fit: cover;">
            <div class="d-flex flex-column">
                <span class="small fw-bold">${item.title}</span>
                <span style="font-size: 10px;" class="text-muted">${item.totalStudents || 0} học viên</span>
            </div>
        </a>
    `;
};

// 2. Dùng Event Delegation để bắt sự kiện cho Header nạp động
$(document).on('input', '#mainSearchInput', function() {
    const query = $(this).val().trim();
    const $box = $('#searchResultBox');
    const $list = $('#searchResultList');

    if (query.length < 2) {
        $box.addClass('d-none');
        return;
    }

    $box.removeClass('d-none');
    $('#searchKeyworkText').text(query);
    $list.html('<div class="p-3 text-center"><div class="spinner-border spinner-border-sm text-primary"></div></div>');

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        try {
            const res = await $.get(`http://vinh369-001-site1.site4future.com/api/course/search?query=${encodeURIComponent(query)}`);
            
            // Xử lý dữ liệu: Nếu Backend trả về trực tiếp mảng hoặc object có .data
            const results = Array.isArray(res) ? res : (res.data || []);

            if (results.length === 0) {
                $list.html('<div class="p-3 text-center small text-muted">Không tìm thấy kết quả nào</div>');
                return;
            }

            // Render kết quả (Hiện tại Repo của mình đang trả về list Course)
            let html = `<div class="search-title p-2 small fw-bold bg-light text-uppercase" style="font-size: 10px;">Khóa học</div>`;
            html += results.map(c => AuthHelper.renderItem(c)).join('');

            $list.html(html);

        } catch (err) {
            console.error("Lỗi search:", err);
            $list.html('<div class="p-3 text-center text-danger small">Lỗi server hoặc CORS!</div>');
        }
    }, 400);
});

// Đóng box search khi click ra ngoài
$(document).on('click', function (e) {
    if (!$(e.target).closest('.search-wrapper').length) {
        $('#searchResultBox').addClass('d-none');
    }
});
// TRONG FILE common.js
// TRONG FILE common.js
$(document).ready(function() {
    // 1. Nạp Header - Chỉ nạp 1 lần duy nhất
    $("#header-placeholder").load("/shared/header.html", function() {
        console.log("🚩 Hệ thống: Header đã load xong.");

        // 2. Kiểm tra trạng thái đăng nhập
        // Hàm này sẽ tự lo: Ẩn/Hiện vùng Guest/User, Điền tên, Điền ảnh đại diện
        AuthHelper.checkLoginStatus(); 

        // 3. Khởi tạo các sự kiện liên quan đến UI (Dropdown, Popover...)
        AuthHelper.initMyCoursesEvents();

        // 4. Xử lý thông báo (Chỉ chạy khi đã có Token)
        const token = localStorage.getItem("jwt_token");
        if (token && window.NotificationApp) {
            // NotificationApp phải đảm bảo đã được khai báo ở file khác
            if (typeof NotificationApp.getUnreadCount === 'function') {
                NotificationApp.getUnreadCount(); 
            }
            if (typeof NotificationApp.init === 'function') {
                NotificationApp.init(); 
            }
        }
    });

    // 5. Nạp Footer
    $("#footer-placeholder").load("/shared/footer.html", function() {
        console.log("🚩 Hệ thống: Footer đã load xong.");
    });
});
// Dùng Event Delegation vì Header nạp động bằng .load()
$(document).on('click', '#notifDropdown', function (e) {
    // Kiểm tra trạng thái NGAY LÚC BẤM
    const isExpanding = $(this).attr('aria-expanded') === 'false' || !$(this).attr('aria-expanded');

    if (!isExpanding) {
        NotificationApp.fetchNotifications(false);
    }
});
