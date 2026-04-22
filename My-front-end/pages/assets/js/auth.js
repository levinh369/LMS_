
var Auth = {
    config: {
        apiUrl: "http://vinh369-001-site1.site4future.com/api/Auth"
    },
    
login: async function(btn) {
    const $form = $(btn).closest('form');
    const $errorDiv = $form.find('.login-error');
    
    // Reset trạng thái báo lỗi
    $errorDiv.hide().text("");

    const loginData = {
        email: $form.find('#loginEmail').val(),
        password: $form.find('#loginPassword').val()
    };
    debugger
    try {
        const response = await $.ajax({
            url: `${Auth.config.apiUrl}/login`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(loginData),
        });

        // 1. Lưu thông tin đăng nhập (Token, User)
        AuthHelper.saveAuth(response); 

        // 2. Lấy CourseId từ URL (nếu có)
        const urlParams = new URLSearchParams(window.location.search);
        const courseId = urlParams.get('id');
        // 3. Thông báo và xử lý chuyển hướng
        Swal.fire({
            icon: 'success',
            title: 'Đăng nhập thành công!',
            text: courseId ? 'Đang tự động ghi danh cho bạn...' : 'Chào mừng bạn quay lại!',
            timer: 1500,
            showConfirmButton: false
        }).then(async () => {
            if (courseId) {
                // TỰ ĐỘNG GỌI HÀM ADD ENROLLMENT
                try {
                   
                    // const enrollResult = await Enrollment.add(courseId);
                    
                    // Dù thành công hay đã đăng ký (isSuccess false), ta đều cho vào trang học
                    window.location.href = `/learn/learning.html?id=${courseId}`;
                } catch (e) {
                    // Nếu lỗi nặng quá thì vẫn cố cho vào trang học để trang đó tự check tiếp
                    window.location.href = `/learn/learning.html?id=${courseId}`;
                }
            } else {
                // Đăng nhập bình thường thì về trang chủ
                window.location.href = "/index.html";
            }
        });

    } catch (error) {
        // Xử lý lỗi đăng nhập (như cũ)
        const errorMsg = error.responseJSON?.message || "Sai tài khoản hoặc mật khẩu";
        $errorDiv.text(errorMsg).fadeIn(); 
        
        // Hiệu ứng rung form cho "ngầu"
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
    let returnUrl = courseId 
        ? `http://127.0.0.1:5500/Home/detail.html?id=${courseId}`
        : "http://127.0.0.1:5500/auth/login-success.html";

    const backendUrl = `http://vinh369-001-site1.site4future.com/api/auth/external-login?provider=${provider}&returnUrl=${encodeURIComponent(returnUrl)}`;
    window.location.href = backendUrl;
}
   
};
