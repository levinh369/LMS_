let searchTimeout;
const AuthHelper = {
    // 📍 1. Hàm lưu Token và thông tin User sau khi Login/Register/Social Login thành công
    saveAuth: function(authData) {
        localStorage.setItem("jwt_token", authData.accessToken);    
        localStorage.setItem("refresh_token", authData.refreshToken || "");
        
        const idToSave = authData.userId; 
        localStorage.setItem("user_id", idToSave); 
        
        // Chuẩn hóa cấu trúc Object lưu trữ đồng bộ cho toàn bộ hệ thống
        localStorage.setItem("user_info", JSON.stringify({
            id: idToSave,
            username: authData.username,
            fullName: authData.fullName || authData.username, // Đề phòng login mạng xã hội trả fullName
            role: authData.role,
            avatar: authData.avatarUrl || authData.avatar, // Nhận cả avatarUrl (Back) lẫn avatar (URL param)
            email: authData.email
        }));
    },

    // 📍 2. Hàm lấy thông tin User phục vụ chế data ảo cho Optimistic UI (Comment/Reply)
    getUserInfo: function() {
        const info = localStorage.getItem("user_info");
        return info ? JSON.parse(info) : null;
    },

    // 📍 3. Kiểm tra tính hợp lệ và thời hạn của JWT Token
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

    // 📍 4. Tự động kiểm tra trạng thái và chuyển đổi giao diện (Avatar <-> Nút Đăng nhập)
    checkLoginStatus: function() {
        const token = localStorage.getItem("jwt_token");
        const userInfoJson = localStorage.getItem("user_info");
        const $guestZone = $('#guest-zone');
        const $userZone = $('#user-zone');

        if (token && userInfoJson && !AuthHelper.isTokenExpired(token)) {
            try {
                const user = JSON.parse(userInfoJson);
                
                // Chuyển đổi vùng hiển thị sang User Zone
                $guestZone.addClass('d-none').removeClass('d-flex');
                $userZone.removeClass('d-none').addClass('d-flex');

                // Điền tên hiển thị
                const displayName = user.fullName || user.username || "Học viên";
                $('#nav-fullname, #nav-user-name, #nav-fullname-mobile').text(displayName);

                // Điền ảnh đại diện (Ưu tiên ảnh gốc, nếu rỗng dùng ảnh mặc định)
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

    // 📍 5. Xóa sạch dữ liệu đăng nhập ngầm trong bộ nhớ
    clearAuthSilently: function() {
        localStorage.removeItem("jwt_token");
        localStorage.removeItem("refresh_token"); 
        localStorage.removeItem("user_id");       
        localStorage.removeItem("user_info");
    },

    // 📍 6. Đổi giao diện về chế độ Khách (Chưa đăng nhập)
    showGuestUI: function($guest, $user) {
        if ($guest.length) $guest.removeClass('d-none').addClass('d-flex');
        if ($user.length) $user.addClass('d-none').removeClass('d-flex');
    },

    // 📍 7. Đăng xuất hệ thống và đẩy về trang đăng nhập
    logout: function() {
        AuthHelper.clearAuthSilently();
        window.location.href = "/auth/login.html";
    },

    // --- CÁC HÀM QUẢN LÝ MODAL GIAO DIỆN ---
    openModal: function() {
        var modalEmp = document.getElementById('authChoiceModal');
        if (modalEmp) {
            var myModal = new bootstrap.Modal(modalEmp);
            myModal.show();
        } else {
            console.error("Không tìm thấy cái Modal nào tên là #authChoiceModal trong HTML!");
        }
    },
    showLoginForm: function() {
        $('#modalTitle').text('Đăng nhập');
        $('#step-choice, #step-register-form').hide();
        $('#step-login-form').fadeIn(200);
    },
    showRegisterForm: function() {
        $('#modalTitle').text('Tạo tài khoản mới');
        $('#step-choice, #step-login-form').hide();
        $('#step-register-form').fadeIn(200);
    },
    showChoices: function() {
        $('#modalTitle').text('Tham gia LMS Academy');
        $('#step-register-form, #step-login-form').hide();
        $('#step-choice').fadeIn(200);
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
            url: "https://lms-u2jn.onrender.com/api/Course/my-course", // URL API của ông
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

// Biến cờ hiệu chống gọi API refresh liên tục
let isRefreshing = false;
// 📍 Thêm hàng đợi để chứa các request bị 401 cùng lúc
let refreshQueue = []; 

// 1. CẤU HÌNH GỬI TOKEN
$.ajaxSetup({
    beforeSend: function(xhr, settings) {
        // Bỏ qua không nhét Access Token nếu đang gọi Login, Register hoặc đang đi xin Refresh Token
        if (settings.url.includes('/Auth/login') || 
            settings.url.includes('/Auth/register') || 
            settings.url.includes('/refresh-token')) {
            return; 
        }

        const token = localStorage.getItem("jwt_token");
        if (token && token !== "undefined") {
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        }
    }
});

// 2. BỘ ĐÁNH CHẶN VÀ CẤP CỨU LỖI 401
$(document).ajaxError(async function(event, xhr, settings, thrownError) {
    if (xhr.status === 401) {
        
        // --- CÁC TRƯỜNG HỢP BỎ QUA KHÔNG XỬ LÝ ---
        if (settings._isRetrying || // 📍 CHỐNG LẶP VÔ HẠN: Đã cứu 1 lần rồi mà vẫn xịt thì buông tay
            window.location.pathname.includes("login-success.html") || 
            window.location.pathname.includes("login.html") ||
            settings.url.includes('/refresh-token')) {
            return; 
        }

        const token = localStorage.getItem("jwt_token");
        if (token && typeof AuthHelper !== 'undefined' && !AuthHelper.isTokenExpired(token)) {
            console.warn("Backend báo 401 nhưng Token local vẫn còn hạn. Bỏ qua.");
            return;
        }

        // --- BẮT ĐẦU LUỒNG REFRESH TOKEN ---
        const refreshToken = localStorage.getItem("refresh_token");
        
        // Nếu không có Refresh Token -> Hết cứu, đuổi ra ngoài
        if (!refreshToken) {
            forceLogout();
            return;
        }

        // 📍 XỬ LÝ HÀNG ĐỢI KHI CÓ REQUEST ĐỒNG THỜI
        if (isRefreshing) {
            // Đang có người đi xin token rồi, nhét ông này vào hàng đợi
            refreshQueue.push(settings);
            return;
        }

        // Đánh dấu luồng xin token bắt đầu
        isRefreshing = true;
        settings._isRetrying = true; // Đánh dấu request gốc này đang được cứu

        try {
            // Gọi API đi xin Token mới
            const res = await $.ajax({
                url: "https://lms-u2jn.onrender.com/api/auth/refresh-token", 
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify({ refreshToken: refreshToken })
            });

            if (res && res.success) {
                console.log("🚩 Cấp lại Token thành công! Đang gọi lại toàn bộ API bị kẹt...");
                
                // 1. Cất cặp Token mới vào kho
                localStorage.setItem("jwt_token", res.accessToken);
                localStorage.setItem("refresh_token", res.refreshToken);

                // 2. Sửa lại cái vé (Header) và chạy lại request gốc
                settings.headers = settings.headers || {};
                settings.headers["Authorization"] = "Bearer " + res.accessToken;
                $.ajax(settings); 

                // 3. Giải phóng hàng đợi: Chạy lại toàn bộ các request ăn theo
                refreshQueue.forEach(queuedSettings => {
                    queuedSettings.headers = queuedSettings.headers || {};
                    queuedSettings.headers["Authorization"] = "Bearer " + res.accessToken;
                    queuedSettings._isRetrying = true; // Gắn cờ chống lặp
                    $.ajax(queuedSettings);
                });
                
                // Dọn sạch hàng đợi
                refreshQueue = []; 
            } else {
                forceLogout();
            }
        } catch (err) {
            console.warn("Refresh Token cũng đã hết hạn.");
            forceLogout();
        } finally {
            // Xin xong (thành công hay thất bại) cũng nhả cờ hiệu ra
            isRefreshing = false; 
        }
    }
});

// Hàm dọn dẹp và đá văng ra login
function forceLogout() {
    localStorage.clear();
    if (!window.location.pathname.includes("login.html")) {
        window.location.href = "/auth/login.html";
    }
}
// 1. Sửa lại hàm renderItem để khớp với DTO từ Backend C#
AuthHelper.renderItem = function(item) {
    // Chuyển Id thành URL chi tiết
    const detailUrl = `/Home/detail.html?id=${item.id}`;
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
        $('#seeAllBtn').hide();
        return;
    }

    $box.removeClass('d-none');
    $('#searchKeyworkText').text(query);
    $('#seeAllBtn').attr('href', `/search-results.html?keyword=${encodeURIComponent(query)}`);
    $('#seeAllBtn').show();
    $list.html('<div class="p-3 text-center"><div class="spinner-border spinner-border-sm text-primary"></div></div>');

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        try {
            const res = await $.get(`https://lms-u2jn.onrender.com/api/course/search?query=${encodeURIComponent(query)}`);
            
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
