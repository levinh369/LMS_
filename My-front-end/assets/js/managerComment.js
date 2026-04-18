const AdminComment = {
    config: {
        pageSize: 5,
        apiUrl: "https://localhost:7106/api/comment", // Check kỹ port nhé bác
        token: localStorage.getItem('jwt_token') // Lấy token để authenticate
    },
    currentPage:null,
    searchTimer: null,
    init: function () {
        this.initChart();
        this.loadCourses(); // Load danh sách khóa học vào ô Select
        this.loadData(1);
        this.registerEvents();
    },

    registerEvents: function() {
        // Sự kiện lọc
       $('#courseFilter, #statusFilter').on('change', function() {
        console.log("Đã thay đổi bộ lọc, đang load lại dữ liệu...");
        AdminComment.loadData(1); 
    });
    $('#searchInp').on('input', function() {
            // Xóa cái hẹn giờ cũ nếu bác vẫn đang gõ tiếp
            clearTimeout(AdminComment.searchTimer);

            // Đặt cái hẹn giờ mới: Sau 500ms (0.5s) không gõ gì nữa thì mới gọi API
            AdminComment.searchTimer = setTimeout(function() {
                console.log("Đang tìm kiếm cụm từ:", $('#searchInp').val());
                AdminComment.loadData(1); // Luôn về trang 1 khi tìm kiếm mới
            }, 500); 
        });
        
        // Chọn tất cả checkbox
        $(document).on('change', '#selectAll', function() {
            $('.cmt-checkbox').prop('checked', this.checked);
            AdminComment.onSelectItem();
        });
        $('#courseFilter, #statusFilter').on('change', function() {
            AdminComment.loadData(1); // Luôn về trang 1 khi đổi bộ lọc
        });
    },

    // 1. GỌI API LẤY DỮ LIỆU
    loadData: async function (page) {
        const { apiUrl, pageSize, token } = this.config;
        debugger
        const courseId = $('#courseFilter').val();
        const searchContent = $('#searchInp').val();
        const status = $('#statusFilter').val();
        const url = new URL(`${apiUrl}/manager-comment`);
        url.searchParams.append('page', page);
        url.searchParams.append('pageSize', pageSize);
        url.searchParams.append('status', status);
        if(courseId !== 'all') url.searchParams.append('courseId', courseId);
        if(searchContent) url.searchParams.append('search', searchContent);
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                Swal.fire('Hết hạn', 'Phiên đăng nhập đã hết, vui lòng login lại!', 'error');
                return;
            }

            const res = await response.json();
            // Khớp với JSON bác gửi (data, totalCount, totalPages)
            this.renderFeed(res.data);
            this.showPaging(res.totalCount, res.totalPages, page);
            this.currentPage = page;
            $('#admin-total-records').text(res.totalCount);

        } catch (error) {
            console.error("Lỗi loadData:", error);
            $('#commentFeed').html('<div class="text-center p-5 text-danger">Không thể kết nối đến hệ thống Backend!</div>');
        }
    },
renderFeed: function (data) {
    let html = '';
    
    data.forEach(c => {
        // 1. Chỉ giữ lại logic "Mờ": Nếu isActive = false thì cho mờ đi (dành cho Admin)
        const parentClass = !c.isActive ? 'is-inactive' : '';

        html += `
        <div class="thread-item shadow-sm ${parentClass}" id="thread-${c.id}">
            <div class="d-flex align-items-start">
                <img src="${c.userAvatar || 'https://via.placeholder.com/45'}" class="avatar-box me-3 border">
                <div class="flex-grow-1">
                    <div class="d-flex justify-content-between">
                        <div>
                            <span class="fw-bold">${c.userName}</span>
                            <small class="text-muted ms-2">#ID-${c.id}</small>
                            ${c.isDeleted ? '<span class="badge bg-danger ms-2">Đã xóa</span>' : ''}
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn-tool" title="Ẩn/Hiện" onclick="AdminComment.toggleStatus(${c.id})">
                                <i class="bi ${c.isActive ? 'bi-eye-slash' : 'bi-eye'}"></i>
                            </button>
                            
                            ${c.isDeleted 
                                ? `<button class="btn-tool text-success" title="Khôi phục" onclick="AdminComment.restore(${c.id})">
                                    <i class="bi bi-arrow-counterclockwise"></i>
                                   </button>`
                                : `<button class="btn-tool text-danger" title="Xóa" onclick="AdminComment.deleteComment(${c.id})">
                                    <i class="bi bi-trash"></i>
                                   </button>`
                            }
                        </div>
                    </div>
                    <div class="bubble-admin small my-2 text-dark">${c.content}</div>
                    
                    <div class="reply-branch">
                        ${c.replies.map(r => `
                            <div class="d-flex mb-2 ${!r.isActive ? 'is-inactive' : ''}">
                                <div class="flex-grow-1">
                                    <div class="small fw-bold">${r.userName} <span class="badge bg-danger ms-1" style="font-size:7px">ADMIN</span></div>
                                    <div class="small text-secondary">${r.content}</div>
                                    <div class="mt-1">
                                        ${r.isDeleted 
                                            ? `<span class="text-success cursor-pointer small fw-bold" onclick="AdminComment.restore(${r.id})">Khôi phục</span>`
                                            : `<span class="text-danger cursor-pointer small fw-bold" onclick="AdminComment.deleteComment(${r.id})">Xóa</span>`
                                        }
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>`;
    });
    
    $('#commentFeed').html(html || '<div class="text-center p-5 text-muted">Chưa có bình luận nào ở mục này.</div>');
},
    // 3. PHÂN TRANG
    showPaging: function (totalCount, totalPages, currentPage) {
        if (totalPages <= 0) {
            $('#order-pagination').empty();
            return;
        }
        $('#order-pagination').twbsPagination('destroy');
        $('#order-pagination').twbsPagination({
            totalPages: totalPages,
            visiblePages: 5,
            startPage: currentPage,
            first: 'Đầu', prev: 'Trước', next: 'Tiếp', last: 'Cuối',
            onPageClick: function (event, page) {
                if (page !== currentPage) AdminComment.loadData(page);
            }
        });
    },

   toggleStatus: async function(id) {
    const token = localStorage.getItem('jwt_token'); // Lấy "vé thông hành"
    const apiUrl = this.config.apiUrl;

    try {
        // Gửi yêu cầu PUT tới đúng cái Route [HttpPut("toggle-status/{id}")]
        const response = await fetch(`${apiUrl}/toggle-status/${id}`, {
            method: 'PUT',
            headers: {
                // 'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const res = await response.json();

        if (res.success) {
            // Dùng SweetAlert2 làm cái thông báo Toast cho "sang" cái đồ án
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: res.message,
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });

            // Quan trọng: Load lại dữ liệu để giao diện cập nhật trạng thái Mờ/Sáng
            // Bác nên truyền currentPage hiện tại vào để nó không bị nhảy về trang 1
            AdminComment.loadData(AdminComment.currentPage || 1);
        } else {
            Swal.fire('Lỗi', res.message || 'Không thể cập nhật trạng thái!', 'error');
        }
    } catch (error) {
        console.error("Lỗi khi gọi API toggle-status:", error);
        Swal.fire('Lỗi hệ thống', 'Server đang bận hoặc lỗi kết nối!', 'error');
    }
},

    deleteComment: function(id) {
    Swal.fire({
        title: 'Xác nhận xóa?',
        text: "Bình luận này và các phản hồi liên quan sẽ bị ẩn khỏi hệ thống!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const token = localStorage.getItem('jwt_token');
            try {
                // Gọi API DELETE
                const response = await fetch(`${this.config.apiUrl}/${id}`, {
                    method: 'DELETE',
                    //headers: { 'Authorization': `Bearer ${token}` }
                });

                const res = await response.json();

                if (res.success) {
                    Swal.fire('Thành công!', res.message, 'success');
                    // Load lại dữ liệu ở trang hiện tại
                    AdminComment.loadData(AdminComment.currentPage || 1);
                } else {
                    Swal.fire('Lỗi', res.message, 'error');
                }
            } catch (error) {
                console.error("Lỗi xóa:", error);
                Swal.fire('Lỗi', 'Không thể kết nối đến máy chủ!', 'error');
            }
        }
    });
},
restore: function(id) {
        Swal.fire({
            title: 'Khôi phục lại?',
            text: "Bình luận sẽ hiện lại trên trang khóa học.",
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Khôi phục',
            confirmButtonColor: '#22c55e'
        }).then(async (result) => {
            if (result.isConfirmed) {
                const res = await this.callApi(`${this.config.apiUrl}/restore/${id}`, 'PUT');
                if(res.success) {
                    Swal.fire('Thành công!', res.message, 'success');
                    this.loadData(this.currentPage);
                }
            }
        });
    },

    // Hàm phụ để gọi API cho đỡ lặp code
    callApi: async function(url, method) {
        const token = localStorage.getItem('jwt_token');
        const response = await fetch(url, {
            method: method,
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },
    // 5. CHỨC NĂNG PHỤ
    onSelectItem: function() {
        const selected = $('.cmt-checkbox:checked').length;
        $('#selectedCount').text(selected);
        selected > 0 ? $('#bulkBar').fadeIn() : $('#bulkBar').fadeOut();
    },

  loadCourses: async function() {
    try {
        const response = await fetch('https://localhost:7106/api/course');
        const res = await response.json();
        
        // Kiểm tra success và truy cập đúng vào mảng res.data
        if (res.success && res.data) {
            // Xóa các option cũ (trừ cái "Tất cả") trước khi append để tránh bị lặp khi load lại
            $('#courseFilter').find('option:not(:first)').remove();

            res.data.forEach(c => {
                // Chú ý dùng c.courseId thay vì c.id
                $('#courseFilter').append(`<option value="${c.courseId}">${c.title}</option>`);
            });
            console.log("Đã load xong danh sách khóa học vào bộ lọc");
        }
    } catch (e) { 
        console.error("Lỗi khi gọi API Courses:", e); 
    }
},

    openReplyModal: function(parentId, userName) {
        Swal.fire({
            title: `Phản hồi ${userName}`,
            input: 'textarea',
            inputPlaceholder: 'Nhập nội dung trả lời...',
            showCancelButton: true,
            confirmButtonText: 'Gửi',
            confirmButtonColor: '#4f46e5'
        }).then(async (result) => {
            if (result.value) {
                // Gọi API POST để tạo reply mới
                const res = await fetch(this.config.apiUrl, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${this.config.token}`,
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({
                        content: result.value,
                        parentId: parentId,
                        lessonId: 0 // Backend nên tự lấy lessonId từ parentId
                    })
                });
                if(res.ok) {
                    Swal.fire('Thành công', 'Đã đăng phản hồi', 'success');
                    this.loadData(1);
                }
            }
        });
    },

    initChart: function() {
        const ctx = document.getElementById('miniChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: { labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7'], datasets: [{ data: [12, 19, 15, 25, 22, 30], borderColor: '#4f46e5', tension: 0.4, fill: true, backgroundColor: 'rgba(79, 70, 229, 0.1)' }] },
            options: { plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { display: false } } }
        });
    }
};

$(document).ready(() => AdminComment.init());