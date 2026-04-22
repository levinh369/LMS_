// Khai báo Toast mixin của SweetAlert2
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
const AdminComment = {
    config: {
        pageSize: 5,
        apiUrl: "https://lms-1mj1.onrender.com/api/comment", // Check kỹ port nhé bác
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
      // Sự kiện khi thay đổi Khóa học
        $('#courseFilter').on('change', function() {
            const courseId = $(this).val();
            AdminComment.loadLessons(courseId); // Gọi hàm ở trên
            AdminComment.loadData(1); // Load lại danh sách comment của khóa đó
        });

        // Sự kiện khi thay đổi Bài học
        $('#lessonFilter').on('change', function() {
            AdminComment.loadData(1); // Load lại comment của đúng bài đó
        });
    },
    
    // 1. GỌI API LẤY DỮ LIỆU
loadData: async function (page) {
    const { apiUrl, pageSize, token } = this.config;
    
    // 1. Bốc thêm giá trị từ lessonFilter
    const courseId = $('#courseFilter').val();
    const lessonId = $('#lessonFilter').val(); // <--- THÊM DÒNG NÀY
    const searchContent = $('#searchInp').val();
    const status = $('#statusFilter').val();
    
    const url = new URL(`${apiUrl}/manager-comment`);
    url.searchParams.append('page', page);
    url.searchParams.append('pageSize', pageSize);
    url.searchParams.append('status', status);
    
    // 2. Gán courseId nếu không phải "all"
    if(courseId !== 'all') url.searchParams.append('courseId', courseId);
    
    // 3. Gán lessonId nếu có giá trị và không phải "all"
    if(lessonId && lessonId !== 'all') {
        url.searchParams.append('lessonId', lessonId); 
    }
    
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
        
        // Render dữ liệu ra Feed
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
    if (!data || data.length === 0) {
        $('#commentFeed').html('<div class="text-center p-5 text-muted">Chưa có bình luận nào.</div>');
        return;
    }

    data.forEach(c => {
        const parentClass = !c.isActive ? 'is-inactive' : '';
        // 1. Thêm viền vàng và bóng đổ nếu bình luận này đang được GHIM
        const pinnedClass = c.isPinned ? 'border border-warning shadow' : '';

        html += `
        <div class="thread-item ${pinnedClass} ${parentClass} p-3 mb-3 bg-white rounded" 
             id="thread-${c.id}" 
             data-lesson-id="${c.lessonId}"> 
            
            <div class="d-flex align-items-start">
                <img src="${c.userAvatar || 'https://via.placeholder.com/45'}" class="avatar-box me-3 border rounded-circle">
                <div class="flex-grow-1">
                    <div class="d-flex justify-content-between">
                        <div>
                            <span class="fw-bold text-primary">${c.userName}</span>
                            ${c.isAdmin ? '<span class="badge bg-danger ms-1" style="font-size:7px">ADMIN</span>' : ''}
                            
                            <small class="text-muted ms-2">#ID-${c.id}</small>
                            ${c.isDeleted ? '<span class="badge bg-danger ms-2">Đã xóa</span>' : ''}
                            
                            ${c.isPinned ? '<i class="bi bi-pin-angle-fill text-warning ms-2" title="Đang được ghim"></i>' : ''}
                        </div>
                        
                        <div class="d-flex gap-2">
                            <button class="btn-tool ${c.isPinned ? 'text-warning' : 'text-muted'}" 
                                    title="${c.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}" 
                                    onclick="AdminComment.togglePin(${c.id})">
                                <i class="bi ${c.isPinned ? 'bi-pin-angle-fill' : 'bi-pin-angle'}"></i>
                            </button>

                            ${!c.isDeleted ? `
                                <button class="btn-tool text-primary" title="Trả lời" onclick="AdminComment.showReplyForm(${c.id})">
                                    <i class="bi bi-reply-all-fill"></i>
                                </button>
                            ` : ''}

                            <button class="btn-tool" title="Ẩn/Hiện" onclick="AdminComment.toggleStatus(${c.id})">
                                <i class="bi ${c.isActive ? 'bi-eye-slash' : 'bi-eye'}"></i>
                            </button>

                            ${c.isDeleted 
                                ? `<button class="btn-tool text-success" onclick="AdminComment.restore(${c.id})"><i class="bi bi-arrow-counterclockwise"></i></button>`
                                : `<button class="btn-tool text-danger" onclick="AdminComment.deleteComment(${c.id})"><i class="bi bi-trash"></i></button>`
                            }
                        </div>
                    </div>
                    
                    <div class="bubble-admin small my-2 text-dark">${c.content}</div>

                    <div id="reply-form-${c.id}" class="mt-2 mb-3 d-none">
                        <div class="input-group input-group-sm shadow-sm">
                            <input type="text" class="form-control" id="reply-input-${c.id}" placeholder="Admin phản hồi...">
                            <button class="btn btn-primary px-3" onclick="AdminComment.sendReply(${c.id})">Gửi</button>
                            <button class="btn btn-light border" onclick="AdminComment.hideReplyForm(${c.id})">Hủy</button>
                        </div>
                    </div>
                    
                    <div class="reply-branch border-start ps-3 mt-2">
                        ${c.replies.map(r => `
                            <div class="d-flex mb-2 ${!r.isActive ? 'is-inactive' : ''}" id="thread-${r.id}">
                                <div class="flex-grow-1">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div class="small fw-bold">
                                          <span class="fw-bold text-primary">${r.userName}</span>
                                            ${r.isAdmin ? '<span class="badge bg-danger ms-1" style="font-size:7px">ADMIN</span>' : ''}
                                        </div>
                                        <div class="d-flex gap-2">
                                            <i class="bi ${r.isActive ? 'bi-eye-slash' : 'bi-eye'} cursor-pointer text-muted" onclick="AdminComment.toggleStatus(${r.id})"></i>
                                            ${r.isDeleted 
                                                ? `<i class="bi bi-arrow-counterclockwise cursor-pointer text-success" onclick="AdminComment.restore(${r.id})"></i>`
                                                : `<i class="bi bi-trash cursor-pointer text-danger" onclick="AdminComment.deleteComment(${r.id})"></i>`
                                            }
                                        </div>
                                    </div>
                                    <div class="small text-secondary">${r.content}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>`;
    });
    $('#commentFeed').html(html);
},
sendReply: async function(parentId) {
    const inputSelector = `#reply-input-${parentId}`;
    const content = $(inputSelector).val().trim();

    if (!content) {
        return Swal.fire('Lưu ý', 'Nội dung không được để trống!', 'warning');
    }

    // Lấy lessonId từ data attribute của thread-item
    const lessonId = $(`#thread-${parentId}`).attr('data-lesson-id');
    const token = localStorage.getItem("jwt_token"); // Hoặc lấy từ config của bác

    try {
        const response = await fetch('https://lms-1mj1.onrender.com/api/comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                content: content,
                lessonId: parseInt(lessonId),
                parentId: parentId
            })
        });
        debugger
        const res = await response.json();

        if (response.ok) {
            Toast.fire({ icon: 'success', title: 'Đã phản hồi thành công!' });
            this.hideReplyForm(parentId);
            
            // Reload lại danh sách để hiện reply mới
            this.loadData(this.currentPage); 
        } else {
            Swal.fire('Lỗi', res.message || 'Không thể gửi phản hồi', 'error');
        }

    } catch (error) {
        console.error("Lỗi reply:", error);
        Swal.fire('Lỗi', 'Backend đang bận hoặc sai URL bác ơi!', 'error');
    }
},

showReplyForm: function(id) {
    $(`#reply-form-${id}`).removeClass('d-none');
    $(`#reply-input-${id}`).focus();
},

hideReplyForm: function(id) {
    $(`#reply-form-${id}`).addClass('d-none');
    $(`#reply-input-${id}`).val('');
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
        const response = await fetch('https://lms-1mj1.onrender.com/api/course');
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
loadLessons: async function(courseId) {
    if (!courseId || courseId === 'all') {
        $('#lessonFilter').html('<option value="all">-- Chọn bài học --</option>');
        return;
    }
    try {
        const response = await fetch(`https://lms-1mj1.onrender.com/api/lesson/list-lesson/${courseId}`);
        const res = await response.json();
        
        if (res.success && res.data) {
            let html = '<option value="all">-- Tất cả bài học --</option>';
            res.data.forEach(l => {
                html += `<option value="${l.lessonId}">${l.lessonName}</option>`;
            });
            $('#lessonFilter').html(html);
        }
    } catch (e) {
        console.error("Lỗi load bài học:", e);
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
    togglePin: async function (commentId = null) {
    let lessonId;

        if (commentId) {
            // TRƯỜNG HỢP GHIM HÀNG CŨ: Bốc trực tiếp từ data attribute của thằng cha
            lessonId = $(`#thread-${commentId}`).attr('data-lesson-id');
        } else {
            // TRƯỜNG HỢP ĐĂNG MỚI: Bốc từ Select Filter (Vì chưa có thẻ nào để bốc)
            lessonId = $('#lessonFilter').val();
        }

        // Kiểm tra tính hợp lệ
        if (!lessonId || lessonId === 'all' || isNaN(parseInt(lessonId))) {
            Swal.fire('Lưu ý', 'Bác phải chọn một bài học cụ thể mới thực hiện ghim được!', 'warning');
            return;
        }

    lessonId = parseInt(lessonId);

    // KỊCH BẢN A: Admin đăng thông báo mới rồi ghim luôn
    if (!commentId) {
        const { value: text } = await Swal.fire({
            title: '📌 Đăng thông báo ghim',
            input: 'textarea',
            inputLabel: 'Nội dung thông báo bài học',
            inputPlaceholder: 'Nhập nội dung lưu ý quan trọng...',
            showCancelButton: true,
            confirmButtonText: 'Đăng & Ghim',
            cancelButtonText: 'Hủy',
            inputValidator: (value) => {
                if (!value) return 'Không được để trống nội dung bác ơi!';
            }
        });

        if (text) {
            this.callPinApi({ content: text, lessonId: lessonId }, true);
        }
    } 
    // KỊCH BẢN B: Ghim một bình luận cha có sẵn của User
    else {
        Swal.fire({
            title: 'Xác nhận ghim?',
            text: "Bình luận này sẽ được đẩy lên đầu danh sách bài học!",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Ghim ngay',
            cancelButtonText: 'Để sau'
        }).then((result) => {
            if (result.isConfirmed) {
                // Gửi commentId và lessonId (isNew = false)
                this.callPinApi({ commentId: commentId, lessonId: lessonId }, false);
            }
        });
    }
},

// Hàm trung gian gọi API (Khớp với PinRequest ở Controller)
callPinApi: async function (data, isNew) {
    try {
        const response = await fetch('https://lms-1mj1.onrender.com/api/comment/pin-handler', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem("jwt_token")}` // Bác check lại chỗ lưu token nhé
            },
            body: JSON.stringify({
            isNew: isNew,
            commentId: data.commentId || null,
            content: data.content || null,
            lessonId: data.lessonId, // <--- Nó phải nằm ở ngoài cùng như này
            courseId: data.courseId || null
        })
        });
        debugger
        const res = await response.json();

        if (response.ok) {
            Toast.fire({ icon: 'success', title: res.message || 'Thao tác thành công!' });
            // Reload lại danh sách để thấy thằng vừa ghim nhảy lên đầu
            this.loadData(this.currentPage); 
        } else {
            Swal.fire('Lỗi', res.message || 'Không thể thực hiện thao tác ghim', 'error');
        }
    } catch (error) {
        console.error("Lỗi callPinApi:", error);
        Toast.fire({ icon: 'error', title: 'Backend đang bận rồi bác Vinh ơi!' });
    }
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