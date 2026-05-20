// Giữ nguyên const Toast của bạn ở đầu file
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
});

var Apply = {
    config: {
        apiUrl: 'https://lms-u2jn.onrender.com/api/InstructorApplication',
        tokenKey: 'jwt_token',
        maxFileSize: 5 * 1024 * 1024 
    },

    elements: {},

    init: function() {
        this.elements = {
            form: document.getElementById('instructorForm'),
            submitBtn: document.getElementById('submitBtn'),
            fileInput: document.getElementById('cvFile'),
            bioInput: document.getElementById('bio'),
            emailInput: document.getElementById('emailInstructor'),
            nameInput: document.getElementById('fullNameInstructor'),
            experience: document.getElementById('experience'),
            // messageDiv không cần thiết nữa nếu dùng Toast
        };

        this.loadUserInfo();

        if (this.elements.form) {
            this.elements.form.addEventListener('submit', this.handleSubmit.bind(this));
        }
    },

   loadUserInfo: function() {
    debugger
    // Lấy chuỗi JSON từ localStorage
    const userInfoString = localStorage.getItem('user_info');
    
    if (!userInfoString) {
        this.elements.emailInput.value = "Vui lòng đăng nhập";
        this.elements.nameInput.value = "Vui lòng đăng nhập";
        this.elements.submitBtn.disabled = true;
        this.showToast('Vui lòng đăng nhập để nộp đơn giảng viên.', 'error');
        return;
    }

    try {
        // Chuyển chuỗi JSON thành Object JavaScript
        const userInfo = JSON.parse(userInfoString);

        // Gán dữ liệu vào ô input (Dùng thuộc tính 'username' và 'email' từ object của bạn)
        if (userInfo.email) this.elements.emailInput.value = userInfo.email;
        if (userInfo.username) this.elements.nameInput.value = userInfo.username;
        
    } catch (e) {
        console.error("Lỗi parse user_info:", e);
        this.showToast('Lỗi tải thông tin người dùng.', 'error');
    }
},

    handleSubmit: async function(e) {
        e.preventDefault();

        const token = localStorage.getItem(this.config.tokenKey); 
        const file = this.elements.fileInput.files[0];

        if (file && file.size > this.config.maxFileSize) {
            this.showToast('Dung lượng file CV không được vượt quá 5MB.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('Bio', this.elements.bioInput.value);
        formData.append("Experience", this.elements.experience.value);
        formData.append('CvFile', file);

        try {
            this.elements.submitBtn.disabled = true;
            this.elements.submitBtn.innerText = 'Đang gửi...';

          const response = await fetch(`${this.config.apiUrl}/apply`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const result = await response.json();

            if (response.ok) {
                this.showToast(result.message || 'Thao tác thành công!', 'success');
                
                this.elements.bioInput.value = '';
                this.elements.fileInput.value = '';
            } else {
                this.showToast(result.message || 'Có lỗi xảy ra, vui lòng thử lại.', 'error');
            }
        } catch (error) {
            this.showToast('Lỗi kết nối máy chủ.', 'error');
        } finally {
            this.elements.submitBtn.disabled = false;
            this.elements.submitBtn.innerText = 'Gửi yêu cầu xét duyệt';
        }
    },

    // Hàm gọi Toast thay cho showMessage cũ
    showToast: function(text, icon) {
        Toast.fire({
            icon: icon, // 'success', 'error', 'warning', 'info'
            title: text
        });
    }
};

document.addEventListener('DOMContentLoaded', () => Apply.init());