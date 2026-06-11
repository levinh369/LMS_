const Toast = Swal.mixin({
    toast: true,
    position: 'top-end', // Góc trên bên phải
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
});
const ForgotPassword = {
    // Biến lưu tạm email đang thao tác
    currentEmail: "",
    apiUrl: "https://lms-u2jn.onrender.com/api/Auth", // Đổi lại URL API của bác nếu cần

    // Mở Modal và reset form về trạng thái ban đầu
    showModal: function() {
        $('#step-email').removeClass('d-none');
        $('#step-otp').addClass('d-none');
        $('#step-new-pass').addClass('d-none');
        $('#fp-email').val('');
        $('#fp-otp').val('');
        $('#fp-new-password').val('');
        $('#fp-confirm-password').val('');
        
        // Hiển thị modal bằng Bootstrap
        const modal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
        modal.show();
    },

    // Quay lại bước nhập email (nếu lỡ gõ sai email)
    backToStep1: function() {
        $('#step-otp').addClass('d-none');
        $('#step-email').removeClass('d-none');
    },

    // BƯỚC 1: Gửi yêu cầu lấy OTP
    sendOtp: async function() {
        const email = $('#fp-email').val().trim();
        if (!email) {
            Toast.fire({ icon: 'warning', title: 'Vui lòng nhập Email!' });
            return;
        }

        try {
            GlobalLoader.show(); // Bật xoay vòng loading
            
            // Gọi API C#
            await $.ajax({
                url: `${this.apiUrl}/forgot-password`,
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify({ email: email })
            });

            // Lưu lại email để dùng cho bước sau
            this.currentEmail = email;
            $('#fp-show-email').text(email); // In email ra cho user xem
            
            // Chuyển giao diện sang BƯỚC 2
            $('#step-email').addClass('d-none');
            $('#step-otp').removeClass('d-none');
            
            Toast.fire({ icon: 'success', title: 'Đã gửi mã xác nhận!' });
        } catch (error) {
            const errorMsg = error.responseJSON?.Message || "Có lỗi xảy ra, vui lòng thử lại.";
            Toast.fire({ icon: 'error', title: errorMsg });
        } finally {
            GlobalLoader.hide();
        }
    },

    // BƯỚC 2: Xác thực mã OTP
    verifyOtp: async function() {
        const otp = $('#fp-otp').val().trim();
        if (otp.length !== 6) {
            Toast.fire({ icon: 'warning', title: 'Mã xác nhận phải gồm 6 chữ số!' });
            return;
        }

        try {
            GlobalLoader.show();
            
            await $.ajax({
                url: `${this.apiUrl}/verify-otp`,
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify({ 
                    email: this.currentEmail, 
                    otpCode: otp 
                })
            });

            // Chuyển giao diện sang BƯỚC 3
            $('#step-otp').addClass('d-none');
            $('#step-new-pass').removeClass('d-none');
            
            Toast.fire({ icon: 'success', title: 'Xác thực thành công!' });
        } catch (error) {
            const errorMsg = error.responseJSON?.Message || "Mã xác nhận không đúng hoặc đã hết hạn.";
            Toast.fire({ icon: 'error', title: errorMsg });
        } finally {
            GlobalLoader.hide();
        }
    },

    // BƯỚC 3: Đặt lại mật khẩu mới
    resetPassword: async function() {
        const newPassword = $('#fp-new-password').val().trim();
        const confirmPassword = $('#fp-confirm-password').val().trim();
        const otp = $('#fp-otp').val().trim(); // Lấy lại mã OTP đã nhập

        if (!newPassword || newPassword.length < 6) {
            Toast.fire({ icon: 'warning', title: 'Mật khẩu phải có ít nhất 6 ký tự!' });
            return;
        }
        if (newPassword !== confirmPassword) {
            Toast.fire({ icon: 'warning', title: 'Mật khẩu xác nhận không khớp!' });
            return;
        }

        try {
            GlobalLoader.show();
            
            await $.ajax({
                url: `${this.apiUrl}/reset-password`,
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify({ 
                    email: this.currentEmail, 
                    otpCode: otp,
                    newPassword: newPassword 
                })
            });

            // Thành công thì đóng Modal và báo thành công
            $('#forgotPasswordModal').modal('hide');
            Swal.fire({
                icon: 'success',
                title: 'Thành công!',
                text: 'Mật khẩu của bạn đã được thay đổi. Vui lòng đăng nhập lại.',
                confirmButtonColor: '#3085d6'
            });

        } catch (error) {
            const errorMsg = error.responseJSON?.Message || "Không thể đặt lại mật khẩu.";
            Toast.fire({ icon: 'error', title: errorMsg });
        } finally {
            GlobalLoader.hide();
        }
    }
};