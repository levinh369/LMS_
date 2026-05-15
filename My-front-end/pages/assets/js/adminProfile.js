const adminProfile = {
    config: {
        apiUrl: 'http://127.0.0.1:5000/api/User', // Đổi theo Route thực tế của bác
        updateUrl: 'http://127.0.0.1:5000/api/User/update-profile'
    },

    init: function() {
        this.fetchProfileData();
        this.registerEvents();
    },

    // 1. Load dữ liệu lên form (Chỉ đổ dữ liệu, không ghi đè localStorage)
    fetchProfileData: async function() {
        try {
            const token = localStorage.getItem("jwt_token");
            if (!token) return;

            const response = await fetch(`${this.config.apiUrl}/settings-data`, { 
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Lỗi tải dữ liệu");

            const res = await response.json();
            const data = res.data || res.Data || res; 

            if (data) {
                // Đổ vào các input
                $('#FullName').val(data.fullName || data.FullName || "");
                $('#display-name').text(data.fullName || data.FullName);
                $('#display-email').text(data.email || data.Email);
                
                const avatar = data.avatar || data.Avatar || '../assets/img/default-avatar.png';
                $('#avatarPreview').attr('src', avatar);
                const roleId = data.roleId || data.RoleId;
                if (roleId === 1) {
                    $('#role-badge').text("QUẢN TRỊ VIÊN").addClass('bg-danger bg-opacity-10 text-danger');
                } else {
                    $('#role-badge').text("GIẢNG VIÊN").addClass('bg-primary bg-opacity-10 text-primary');
                }
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Lỗi', 'Không thể nạp thông tin hồ sơ', 'error');
        }
    },

    // 2. Đăng ký sự kiện
    registerEvents: function() {
        // Preview ảnh khi chọn file
        $('#AvatarFile').on('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = e => $('#avatarPreview').attr('src', e.target.result);
                reader.readAsDataURL(file);
            }
        });

        // Xử lý Submit Form
        $('#profileForm').on('submit', async (e) => {
            e.preventDefault();
            await this.updateProfile(e.target);
        });
        $('.toggle-password').on('click', function() {
            const targetSelector = $(this).data('target');
            const $input = $(targetSelector);
            const $icon = $(this).find('i');

            if ($input.attr('type') === 'password') {
                $input.attr('type', 'text');
                $icon.removeClass('bi-eye-slash').addClass('bi-eye'); // Hiện mắt
            } else {
                $input.attr('type', 'password');
                $icon.removeClass('bi-eye').addClass('bi-eye-slash'); // Ẩn mắt
            }
        });
    },
   updateProfile: async function(formElement) {
    // 1. Lấy giá trị các trường mật khẩu để kiểm tra trước
    const newPassword = $('#NewPassword').val();
    const confirmPassword = $('#ConfirmPassword').val();

    // 2. Kiểm tra khớp mật khẩu (Chỉ check nếu người dùng có nhập mật khẩu mới)
    if (newPassword !== "") {
        if (newPassword !== confirmPassword) {
            Swal.fire('Nhắc nhở', 'Mật khẩu xác nhận không khớp!', 'warning');
            $('#ConfirmPassword').addClass('is-invalid').focus();
            return; // Dừng hàm, không gửi API
        }
        
        if (newPassword.length < 6) {
            Swal.fire('Nhắc nhở', 'Mật khẩu mới phải có ít nhất 6 ký tự!', 'warning');
            $('#NewPassword').focus();
            return;
        }
    }

    // 3. Nếu mọi thứ ổn thì tiến hành gửi Data
    const formData = new FormData(formElement);
    const token = localStorage.getItem("jwt_token");

    try {
        Swal.fire({ title: 'Đang lưu hồ sơ...', didOpen: () => Swal.showLoading() });

        const response = await fetch(this.config.updateUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData 
        });
        
        const res = await response.json();

        if (res.success || res.Success) {
             let userInfoRaw = localStorage.getItem("user_info");
        if (userInfoRaw) {
            let userInfo = JSON.parse(userInfoRaw);
            
            userInfo.username = res.newName; 
            userInfo.avatar = res.newAvatar;

            // Cất lại vào kho
            localStorage.setItem("user_info", JSON.stringify(userInfo));
            
            // Tiện tay cất luôn vào key lẻ nếu bác cần dùng ở chỗ khác
            localStorage.setItem("user_avatar", res.newAvatar);
            localStorage.setItem("user_name", res.newName);
        }

            Swal.fire('Thành công!', 'Thông tin cá nhân đã được cập nhật.', 'success').then(() => {
                location.reload(); 
            });
        } else {
            // Hiển thị đúng lỗi từ Backend trả về (ví dụ: "Mật khẩu hiện tại không đúng")
            Swal.fire('Thất bại', res.message || 'Kiểm tra lại thông tin', 'error');
        }
    } catch (error) {
        Swal.fire('Lỗi', 'Kết nối máy chủ thất bại hoặc lỗi hệ thống.', 'error');
    }
}
};

$(document).ready(() => adminProfile.init());