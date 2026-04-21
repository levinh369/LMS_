const User = {
    myProfile: async function() {
        const token = localStorage.getItem("jwt_token");
        if (!token) return;

        try {
            const res = await $.ajax({
                url: "http://vinh369-001-site1.site4future.com/api/User/my-profile",
                type: "GET",
                // Header này nếu bác đã có $.ajaxSetup thì có thể bỏ qua
                headers: { "Authorization": "Bearer " + token }
            });

            if (res) {
                // 1. Cập nhật Sidebar
                $('#profile-name').text(res.fullName);
                $('#profile-avatar').attr('src', res.avatar || '../assets/img/default-avatar.png');
                $('#profile-join-date').text(`Tham gia từ ${res.joinDate}`);
                $('#stat-ongoing').text(res.ongoingCount);
                $('#stat-completed').text(res.completedCount);

                // 2. Render khóa học đang học
                this.renderList(res.ongoingCourses, '#ongoing-list', false);

                // 3. Render khóa học đã xong
                this.renderList(res.completedCourses, '#completed-list', true);
            }
        } catch (err) {
            console.error("Lỗi tải profile:", err);
            $('#profile-name').text("Lỗi tải dữ liệu");
        }
    },

    renderList: function(courses, selector, isDone) {
        const $container = $(selector);
        $container.empty();

        if (!courses || courses.length === 0) {
            $container.html('<div class="col-12 text-center py-5 text-muted">Trống</div>');
            return;
        }

        const html = courses.map(c => {
    // Hàm con để xử lý format ngày ngay trong lúc map
    const formatDate = (dateStr) => {
        if (!dateStr) return '---';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '---';
        return d.toLocaleDateString('vi-VN', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
    };

    // Xác định ngày hiển thị: Đang học thì hiện ngày tạo (createdAt), Xong thì hiện ngày hoàn thành (lastLearned)
    const dateLabel = isDone ? "Ngày xong" : "Ngày đăng ký";
    const dateValue = c.lastLearned;

    return `
        <div class="col-md-6 col-xl-4 mb-3">
            <div class="course-card">
                <div class="thumb-wrap">
                    <img src="${c.thumbnail || '../assets/img/default-course.png'}" 
                         class="thumb-img" 
                         onerror="this.src='../assets/img/default-course.png'">
                </div>
                <div class="p-3">
                    ${isDone ? '<span class="badge-completed mb-2 d-inline-block"><i class="bi bi-check-circle-fill"></i> Hoàn thành</span>' : ''}
                    <h6 class="fw-700 mb-2 text-truncate" title="${c.title}">${c.title}</h6>
                    
                    <div class="small text-muted mb-2">
                        <i class="bi ${isDone ? 'bi-calendar-check' : 'bi-calendar-plus'}"></i> 
                        ${dateLabel}: ${formatDate(dateValue)}
                    </div>

                    ${!isDone ? `
                        <div class="small text-muted mb-1">Tiến độ: ${Math.round(c.progress)}%</div>
                        <div class="progress mb-3" style="height: 6px;">
                            <div class="progress-bar" style="width: ${c.progress}%; background: #f05123;"></div>
                        </div>
                        <button class="btn-action" onclick="location.href='/pages/learn/learning.html?id=${c.courseId}'">Học tiếp ngay</button>
                    ` : `
                        <div class="d-grid mt-2">
                            <button class="btn btn-sm btn-dark rounded-pill fw-600">Xem chứng chỉ</button>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}).join('');

        $container.html(html);
    },
    formatDate: function(dateStr) {
        if (!dateStr) return '---';
        const date = new Date(dateStr);
        
        // Kiểm tra xem date có hợp lệ không
        if (isNaN(date.getTime())) return '---';

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Tháng trong JS chạy từ 0-11
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
    },
    loadProfile: function() {
    $.ajax({
        url: "http://vinh369-001-site1.site4future.com/api/User/settings-data",
        type: "GET",
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("jwt_token") 
        },
        success: function(res) {
            if (res) {
                // 2. Đổ dữ liệu cơ bản vào Form
                $('#input-fullname').val(res.fullName);
                $('#display-name').text(res.fullName); // Cái tên hiện dưới ảnh
                $('#input-email').val(res.email);
                if (res.avatar) {
                    $('#avatar-preview').attr('src', res.avatar);
                } else {
                    $('#avatar-preview').attr('src', '../assets/img/default-avatar.png');
                }
                if (res.hasPassword === false) {
                    // Ẩn ô nhập mật khẩu hiện tại (vì login Face lấy đâu ra pass cũ)
                    $('#curr-pass-group').hide();
                    
                    // Hiện dòng ghi chú giải thích
                    $('#fb-user-note').fadeIn();
                    
                    // Đổi tiêu đề cho đúng tính chất "Thiết lập" chứ không phải "Đổi"
                    $('#pass-section-title').text("Thiết lập mật khẩu đăng nhập");
                    
                    // Xóa placeholder cũ cho đỡ lú
                    $('#input-new-password').attr('placeholder', 'Nhập mật khẩu bác muốn tạo');
                } else {
                    // Nếu là user thường thì cứ hiện bình thường
                    $('#curr-pass-group').show();
                    $('#fb-user-note').hide();
                    $('#pass-section-title').text("Bảo mật & Mật khẩu");
                }
            }
        },
        error: function(err) {
            console.error("🚩 Lỗi load profile rồi bác ơi:", err);
            if (err.status === 401) {
                alert("Hết phiên đăng nhập, mời bác vào lại!");
                AuthHelper.logout(); // Nếu có AuthHelper thì gọi để dọn dẹp localstorage
            }
        }
    });
},
updateProfile: async function() {
    // 1. Cấu hình Toast thông báo nhanh (góc trên phải)
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    });

    // 2. Thu thập dữ liệu từ Form
    const fullName = $('#input-fullname').val();
    const currentPass = $('#input-current-password').val() || "";
    const newPass = $('#input-new-password').val();
    const confirmPass = $('#input-confirm-password').val();
    const avatarFile = $('#input-avatar-file')[0].files[0];

    // 3. Kiểm tra logic mật khẩu phía Client (Validation)
    if (!fullName) {
        Toast.fire({ icon: 'warning', title: 'Họ tên không được để trống bác ơi!' });
        return;
    }
    if (newPass && newPass !== confirmPass) {
        Toast.fire({ icon: 'error', title: 'Mật khẩu xác nhận không khớp!' });
        return;
    }

    try {
        // --- BƯỚC KHÓA MÀN HÌNH (Xoay tròn xoay tròn) ---
        Swal.fire({
            title: 'Đang xử lý...',
            html: 'Đang lưu hồ sơ!',
            allowOutsideClick: false, 
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading(); // Hiện icon xoay tròn
            }
        });

        // Disable các nút bấm để tránh User nhấn lặp lại
        const btnSave = $('.btn-save');
        const btnCancel = $('.btn-light');
        btnSave.prop('disabled', true);
        btnCancel.prop('disabled', true);

        // 4. Đóng gói dữ liệu gửi đi
        const formData = new FormData();
        formData.append('fullName', fullName);
        formData.append('currentPassword', currentPass);
        formData.append('newPassword', newPass || "");
        if (avatarFile) {
            formData.append('avatarFile', avatarFile);
        }

        // 5. Gửi AJAX lên Backend
        const res = await $.ajax({
            url: "http://vinh369-001-site1.site4future.com/api/User/update-profile",
            type: "POST",
            data: formData,
            processData: false, // Bắt buộc khi dùng FormData
            contentType: false, // Bắt buộc khi dùng FormData
            headers: { 
                "Authorization": "Bearer " + localStorage.getItem("jwt_token") 
            }
        });

        // 6. Xử lý đồng bộ LocalStorage (Cập nhật cục user_info)
        let userInfoRaw = localStorage.getItem("user_info");
        if (userInfoRaw) {
            let userInfo = JSON.parse(userInfoRaw);
            
            // Đè dữ liệu mới từ Backend trả về
            userInfo.username = res.newName; 
            userInfo.avatar = res.newAvatar;

            // Cất lại vào kho
            localStorage.setItem("user_info", JSON.stringify(userInfo));
            
            // Tiện tay cất luôn vào key lẻ nếu bác cần dùng ở chỗ khác
            localStorage.setItem("user_avatar", res.newAvatar);
            localStorage.setItem("user_name", res.newName);
        }

        // 7. Hoàn tất: Đóng loading và hiện Toast thành công
        Swal.close(); 

        Toast.fire({
            icon: 'success',
            title: 'Ngon lành! Cập nhật thành công.'
        }).then(() => {
            // Đợi Toast chạy xong (hoặc gần xong) thì bay về Home
            window.location.href = "/pages/index.html";
        });

    } catch (err) {
        // Đóng loading để User còn sửa lỗi
        Swal.close(); 
        
        const errorMsg = err.responseJSON?.message || "Lỗi hệ thống rồi bác ơi!";
        Toast.fire({ icon: 'error', title: errorMsg });

        // Mở khóa lại nút bấm
        $('.btn-save').prop('disabled', false).text("Lưu thay đổi");
        $('.btn-light').prop('disabled', false);
    }
},
};

// Khởi chạy khi tài liệu sẵn sàng
$(document).ready(function() {
    User.myProfile();
    if (window.location.pathname.includes('settings.html')) {
        User.loadProfile();
    }
});
$('#editProfileForm').on('submit', function(e) {
    e.preventDefault(); // CHẶN trang bị load lại (quan trọng nhất)
    
    // Gọi hàm update mà anh em mình vừa viết
    User.updateProfile(); 
});
// Hàm chuyển Tab (giữ lại logic của bác)
function switchTab(evt, tabId) {
    $('.tab-pane-custom').addClass('d-none');
    $(`#${tabId}`).removeClass('d-none');
    $('.tab-btn').removeClass('active');
    $(evt.currentTarget).addClass('active');
}
// Sự kiện khi bác chọn ảnh từ máy tính
$('#input-avatar-file').on('change', function(e) {
    const file = e.target.files[0]; // Lấy cái file bác vừa chọn

    if (file) {
        // 1. Kiểm tra xem có phải là file ảnh không
        if (!file.type.startsWith('image/')) {
            Swal.fire({ icon: 'error', title: 'Bác phải chọn file ảnh cơ!' });
            return;
        }

        // 2. Kiểm tra dung lượng (Ví dụ: không quá 2MB)
        if (file.size > 2 * 1024 * 1024) {
            Swal.fire({ icon: 'error', title: 'Ảnh nặng quá bác ơi (max 2MB)!' });
            return;
        }

        // 3. TẠO URL TẠM THỜI ĐỂ HIỆN LÊN <img>
        // Cái này nó tạo một cái link ảo trong bộ nhớ trình duyệt
        const tempUrl = URL.createObjectURL(file);
        
        // Đổ cái link đó vào thẻ img để bác xem trước
        $('#avatar-preview').attr('src', tempUrl);

        // (Tùy chọn) Thu hồi bộ nhớ sau khi ảnh đã load xong
        $('#avatar-preview').on('load', function() {
            URL.revokeObjectURL(tempUrl);
        });
    }
});