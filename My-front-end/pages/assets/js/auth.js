
var Auth = {
    config: {
        apiUrl: "https://lms-u2jn.onrender.com/api/Auth"
    },
    
login: async function(btn) {
    const $btn = $(btn);
    const $form = $btn.closest('form');
    const $errorDiv = $form.find('.login-error');
    
    // 1. Tránh click liên tục khi đang tải
    if ($btn.hasClass('is-loading')) return;

    // Reset trạng thái báo lỗi
    $errorDiv.hide().text("");

    const loginData = {
        email: $form.find('#loginEmail').val(),
        password: $form.find('#loginPassword').val()
    };

    // 2. HIỆU ỨNG LOADING: Đổi nội dung nút bấm
    const oldBtnHtml = $btn.html();
    $btn.addClass('is-loading').prop('disabled', true);
    $btn.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xác thực...');

    try {
        const response = await $.ajax({
            url: `${Auth.config.apiUrl}/login`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(loginData),
        });

        // Lưu thông tin đăng nhập
        AuthHelper.saveAuth(response); 

        const urlParams = new URLSearchParams(window.location.search);
        const courseId = urlParams.get('id');

        Swal.fire({
            icon: 'success',
            title: 'Đăng nhập thành công!',
            text: courseId ? 'Đang tự động ghi danh cho bạn...' : 'Chào mừng bạn quay lại!',
            timer: 1500,
            showConfirmButton: false
        }).then(() => {
            if (courseId) {
                window.location.href = `/learn/learning.html?id=${courseId}`;
            } else {
                window.location.href = "/index.html";
            }
        });

    } catch (error) {
        // 3. KẾT THÚC LOADING NẾU LỖI
        $btn.removeClass('is-loading').prop('disabled', false).html(oldBtnHtml);

        const errorMsg = error.responseJSON?.message || "Sai tài khoản hoặc mật khẩu";
        $errorDiv.text(errorMsg).fadeIn(); 
        
        $form.closest('.modal-content').addClass('animate__animated animate__shakeX');
        setTimeout(() => {
            $form.closest('.modal-content').removeClass('animate__animated animate__shakeX');
        }, 500);
    }
},

    register: async function() {
        let form;
        if ($('#registerForm').length > 0 && $('#registerForm').is(':visible')) {
            form = $('#registerForm');
        } else {
            form = $('#modalRegisterForm');
        }
       var registerData = {
        FullName: form.find('#fullName').val() || form.find('input[name="FullName"]').val(),
        Email: form.find('#email').val() || form.find('input[name="Email"]').val(),
        Password: form.find('#password').val() || form.find('input[name="password"]').val(),
        CourseId: $('#currentCourseId').val() || 0
    };

        try {
            const response = await $.ajax({
                url: `${Auth.config.apiUrl}/register`,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(registerData),
            });
            debugger
            // Đăng ký xong tự động lưu Token để vào học luôn
            AuthHelper.saveAuth(response); 

            Swal.fire({
                icon: 'success',
                title: 'Đăng ký thành công!',
                text: "Hệ thống đã tự động đăng nhập cho bạn.",
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                const courseId = registerData.CourseId;
                if (courseId && courseId !== 0 && courseId !== "0") {
                    window.location.href = `/learn/learning.html?id=${courseId}`;
                } else {
                    window.location.href = "/index.html";
                }
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Lỗi đăng ký!',
                text: error.responseJSON || "Email đã tồn tại hoặc dữ liệu không hợp lệ"
            });
        }
    },
loginWithSocial: function(provider) {
    const courseId = new URLSearchParams(window.location.search).get('id');
    
    // SỬA CHỖ NÀY: Thay localhost thành link Vercel của ông
    const frontendDomain = "https://lms-azure-mu.vercel.app"; 
    
    let returnUrl = courseId 
        ? `${frontendDomain}/Home/detail.html?id=${courseId}`
        : `${frontendDomain}/auth/login-success.html`;

    const backendUrl = `https://lms-u2jn.onrender.com/api/auth/external-login?provider=${provider}&returnUrl=${encodeURIComponent(returnUrl)}`;
    window.location.href = backendUrl;
}
   
};
