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
        apiUrl: "https://lms-u2jn.onrender.com/api/comment", // Check kỹ port nhé bác
        token: localStorage.getItem('jwt_token') // Lấy token để authenticate
    },
    currentPage:null,
    searchTimer: null,
 init: function () {
    this.initChart();

    // 2. Lấy thông tin User và đưa biến ra ngoài phạm vi hàm
    const userInfoRaw = localStorage.getItem("user_info");
    let roleId = 0;
    let currentUserId = 0;

    if (userInfoRaw) {
        const user = JSON.parse(userInfoRaw);
        roleId = parseInt(user.role); 
        currentUserId = user.id || user.userId; 
    } else {
        console.error("Không tìm thấy thông tin đăng nhập!");
        return;
    }

    if (roleId === 1) { 
        $('#instructorFilterWrapper').show();
        this.loadTeacherSelect();
        this.loadCourses('all');  
    } 
    else if (roleId === 3) { 
        $('#instructorFilterWrapper').remove(); 
        this.loadCourses(currentUserId); 
    }

    this.loadData(1);
    this.registerEvents();
},
    
registerEvents: function() {
    const self = this; // Để dùng trong các callback nếu cần

    // 1. Nhóm sự kiện Lọc Cấp 1 (Thay đổi là Load lại Data ngay)
    // Lưu ý: Đã bỏ #courseFilter ra khỏi đây để xử lý riêng biệt bên dưới
    $('#statusFilter, #lessonFilter').on('change', function() {
        console.log("Filter changed, reloading data...");
        self.loadData(1); 
    });

    // 2. Sự kiện Thác nước: Khóa học -> Bài học
    $('#courseFilter').on('change', async function() {
        debugger
        const courseId = $(this).val();
        await self.loadLessons(courseId); 
        self.loadData(1); 
    });

    // 3. Tìm kiếm với cơ chế Debounce (Chống spam API)
    $('#searchInp').on('input', function() {
        clearTimeout(self.searchTimer);
        self.searchTimer = setTimeout(function() {
            console.log("Searching for:", $('#searchInp').val());
            self.loadData(1); 
        }, 500); 
    });

    // 4. Xử lý Checkbox (Ủy quyền sự kiện cho bảng động)
    $(document).on('change', '#selectAll', function() {
        $('.cmt-checkbox').prop('checked', this.checked);
        self.onSelectItem();
    });

    $(document).on('change', '.cmt-checkbox', function() {
        self.onSelectItem();
    });
},
loadData: async function (page) {
    const { apiUrl, pageSize, token } = this.config;
    const teacherId = $('#instructorFilter').val();
    const courseId = $('#courseFilter').val();
    const lessonId = $('#lessonFilter').val();
    const searchContent = $('#searchInp').val();
    const status = $('#statusFilter').val();
    
    const url = new URL(`${apiUrl}/manager-comment`);
    url.searchParams.append('page', page);
    url.searchParams.append('pageSize', pageSize);
    url.searchParams.append('status', status);
    
    if (teacherId && teacherId !== 'all' && teacherId !== '0') {
        url.searchParams.append('teacherId', teacherId);
    }
    
    if (courseId && courseId !== 'all' && courseId !== '0') {
        url.searchParams.append('courseId', courseId);
    }
    if (lessonId && lessonId !== 'all' && lessonId !== '0') {
        url.searchParams.append('lessonId', lessonId); 
    }
    
    if (searchContent && searchContent.trim() !== "") {
        url.searchParams.append('search', searchContent.trim());
    }

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
        
        if (res.success) {
            // Render dữ liệu ra Feed
            this.renderFeed(res.data || res.Data); // Đảm bảo khớp với key Backend trả về
            this.showPaging(res.totalCount || res.TotalCount, res.totalPages || res.TotalPages, page);
            this.currentPage = page;
            $('#admin-total-records').text(res.totalCount || res.TotalCount);
        } else {
            $('#commentFeed').html(`<div class="text-center p-5 text-muted">${res.message || 'Không có dữ liệu'}</div>`);
        }

    } catch (error) {
        console.error("Lỗi loadData:", error);
        $('#commentFeed').html('<div class="text-center p-5 text-danger">Không thể kết nối đến hệ thống Backend!</div>');
    }
},
renderFeed: function (data) {
    let html = '';
    if (!data || data.length === 0) {
        $('#commentFeed').html('<div class="text-center p-5 text-muted bg-white rounded border shadow-sm">Không tìm thấy bình luận nào.</div>');
        return;
    }

    data.forEach(c => {
        const timeAgo = this.timeSince(c.createdAt);
        const isParentHidden = !c.isActive; 
        const opacityClass = isParentHidden ? 'opacity-75 bg-light-subtle' : '';
        
        // Logic Badge cho Cha
        let badgeHtml = '';
        if (c.isAdmin) badgeHtml = '<span class="badge bg-soft-danger text-danger border border-danger-subtle ms-1" style="font-size:9px">ADMIN</span>';
        else if (c.isTeacher) badgeHtml = '<span class="badge bg-soft-success text-success border border-success-subtle ms-1" style="font-size:9px">GIẢNG VIÊN</span>';

        const statusBadge = isParentHidden ? '<span class="badge bg-warning text-dark ms-2" style="font-size:9px"><i class="bi bi-eye-slash-fill"></i> ĐANG ẨN</span>' : '';
        const deletedBadge = c.isDeleted ? '<span class="badge bg-secondary ms-2" style="font-size:9px">THÙNG RÁC</span>' : '';

        html += `
        <div class="thread-item p-4 mb-4 bg-white rounded shadow-sm border ${opacityClass}" 
             id="thread-${c.id}" data-lesson-id="${c.lessonId}" data-course-id="${c.courseId}">
            
            <div class="d-flex align-items-start">
                <img src="${c.userAvatar || '/assets/img/default-avatar.png'}" class="rounded-circle border me-3 shadow-sm" width="48" height="48">
                
                <div class="flex-grow-1">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div class="d-flex align-items-center">
                            <span class="fw-bold text-dark me-1">${c.userName}</span>
                            ${badgeHtml}
                            ${statusBadge} ${deletedBadge}
                            ${c.isPinned && !c.isDeleted ? '<i class="bi bi-pin-angle-fill text-warning ms-2"></i>' : ''}
                            <small class="text-muted ms-2">${timeAgo}</small>
                        </div>
                        
                        <div class="d-flex gap-1">
                            ${c.isDeleted ? `
                                <button class="btn-tool text-success" onclick="AdminComment.restore(${c.id})"><i class="bi bi-arrow-counterclockwise"></i></button>
                                <button class="btn-tool text-danger" onclick="AdminComment.hardDelete(${c.id})"><i class="bi bi-x-circle-fill"></i></button>
                            ` : `
                                <button class="btn-tool ${c.isPinned ? 'text-warning' : 'text-muted'}" onclick="AdminComment.togglePin(${c.id})">
                                    <i class="bi ${c.isPinned ? 'bi-pin-angle-fill' : 'bi-pin-angle'}"></i>
                                </button>
                                <button class="btn-tool" onclick="AdminComment.showReplyForm(${c.id}, ${c.userId}, '${c.userName}')"><i class="bi bi-chat-dots"></i></button>
                                <button class="btn-tool ${isParentHidden ? 'text-warning' : 'text-muted'}" onclick="AdminComment.toggleStatus(${c.id})">
                                    <i class="bi ${c.isActive ? 'bi-eye' : 'bi-eye-slash-fill'}"></i>
                                </button>
                                <button class="btn-tool text-danger" onclick="AdminComment.deleteComment(${c.id})"><i class="bi bi-trash3"></i></button>
                            `}
                        </div>
                    </div>
                    
                    <div class="bubble-admin mb-3 ${c.isDeleted ? 'text-decoration-line-through text-muted' : (isParentHidden ? 'text-muted italic' : 'text-dark')}">
                        ${c.content}
                    </div>

                    ${!c.isDeleted ? `
                        <div id="reply-form-${c.id}" class="mt-2 mb-3 d-none">
                            <div class="input-group shadow-sm border rounded-pill overflow-hidden bg-white">
                                <input type="text" class="form-control border-0 bg-transparent ps-3" id="reply-input-${c.id}" placeholder="Viết phản hồi...">
                                <button class="btn btn-light border-start text-muted" onclick="AdminComment.hideReplyForm(${c.id})"><i class="bi bi-x-lg"></i></button>
                                <button class="btn btn-primary px-3" onclick="AdminComment.sendReply(${c.id})"><i class="bi bi-send-fill"></i></button>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="reply-branch mt-2">
                        ${(c.replies || []).map(r => this.renderSingleReplyRow(r, c.id, isParentHidden)).join('')}
                    </div>
                </div>
            </div>
        </div>`;
    });
    $('#commentFeed').html(html);
},
renderSingleReplyRow: function (r, parentId, isParentHidden) {
    const timeAgo = this.timeSince(r.createdAt);
    const mentionHtml = r.replyToUserName ? `<span class="text-primary fw-bold me-1">@${r.replyToUserName}</span>` : '';
    
    const isActive = (r.isActive === undefined || r.isActive === null) ? true : r.isActive;
    const isThisHidden = !isActive;
    const opacityClass = (isParentHidden || isThisHidden) ? 'opacity-50' : '';
    const statusBadge = isThisHidden ? '<small class="text-warning ms-1" style="font-size:10px">(Đang ẩn)</small>' : '';

    // Logic Badge cho Con
    let badgeHtml = '';
    if (r.isAdmin) badgeHtml = '<span class="badge bg-danger ms-1" style="font-size:7px">AD</span>';
    else if (r.isTeacher) badgeHtml = '<span class="badge bg-success ms-1" style="font-size:7px">GV</span>';

    return `
        <div class="reply-item py-2 border-bottom border-light-subtle ${opacityClass}" id="thread-${r.id}">
            <div class="d-flex align-items-start">
                <img src="${r.userAvatar || '/assets/img/default-avatar.png'}" 
                     class="rounded-circle border me-2 shadow-sm" width="32" height="32">
                <div class="flex-grow-1">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <div class="small d-flex align-items-center">
                            <span class="fw-bold text-secondary">${r.userFullName || r.userName}</span>
                            ${badgeHtml}
                            ${statusBadge}
                            <span class="text-muted ms-2" style="font-size: 11px;">${timeAgo}</span>
                        </div>
                        
                        <div class="d-flex align-items-center gap-2">
                             <i class="bi bi-reply cursor-pointer text-muted hover-primary" 
                                style="font-size: 16px; line-height: 1;"
                                onclick="AdminComment.showReplyForm(${parentId}, ${r.userId}, '${r.userFullName || r.userName}')"></i>
                             
                             <i class="bi ${isActive ? 'bi-eye text-muted' : 'bi-eye-slash-fill text-warning'} cursor-pointer" 
                                style="font-size: 14px; line-height: 1;"
                                onclick="AdminComment.toggleStatus(${r.id})"></i>
                             
                             <i class="bi bi-trash cursor-pointer text-danger" 
                                style="font-size: 14px; line-height: 1;" 
                                onclick="AdminComment.deleteComment(${r.id})"></i>
                        </div>
                    </div>
                    
                    <div class="mt-1 ${isThisHidden || isParentHidden ? 'text-muted italic' : 'text-dark'}" style="font-size: 13.5px; line-height: 1.4;">
                        ${mentionHtml}${r.content}
                    </div>
                </div>
            </div>
        </div>`;
},
timeSince: function (date) {
        if (!date) return "N/A";
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " năm trước";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " tháng trước";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " ngày trước";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " giờ trước";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " phút trước";
        return "Vừa xong";
    },
sendReply: async function(parentId) {
    const $input = $(`#reply-input-${parentId}`);
    const content = $input.val().trim();

    if (!content) return Swal.fire('Lưu ý', 'Nội dung không được để trống!', 'warning');

    const $thread = $(`#thread-${parentId}`);
    const lessonId = $thread.attr('data-lesson-id');
    const courseId = $thread.attr('data-course-id');
    
    // Bốc thông tin mention (đã lưu vào data() lúc showReplyForm)
    const replyToUserId = $input.data('reply-to-id');
    const replyToUserName = $input.data('reply-to-name');

    const token = localStorage.getItem("jwt_token");

    try {
        const response = await fetch('https://lms-u2jn.onrender.com/api/comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                content: content,
                lessonId: parseInt(lessonId),
                courseId: parseInt(courseId),
                parentId: parentId,
                replyToUserId: replyToUserId ? parseInt(replyToUserId) : null,
                replyToUserName: replyToUserName || null
            })
        });

        const res = await response.json();
        if (response.ok && res.success) {
            const commentData = res.data; 

            // FIX TẠI ĐÂY: Truyền thêm parentId và mặc định isParentHidden là false 
            // (vì comment cha phải đang hiện thì bác mới mở được form reply)
            const html = this.renderSingleReplyRow(commentData, parentId, false);
            
            // 2. CHÈN LÊN ĐẦU (PREPEND) danh sách reply của thread này
            const $container = $(`#thread-${parentId} .reply-branch`);
            
            // Nếu lúc trước danh sách rỗng (đang hiện chữ "Chưa có thảo luận con...") 
            // thì xóa chữ đó đi trước khi prepend
            if ($container.find('small.text-muted').length > 0) {
                $container.empty();
            }

            const $newElement = $(html).hide();
            $container.prepend($newElement); 
            $newElement.fadeIn(500);

            // 3. Reset UI
            Toast.fire({ icon: 'success', title: 'Đã phản hồi thành công!' });
            $input.val('');
            this.hideReplyForm(parentId);
        } else {
            Swal.fire('Lỗi', res.message || 'Không thể gửi phản hồi', 'error');
        }
    } catch (error) {
        Swal.fire('Lỗi', 'Hệ thống đang bận, bác thử lại sau nhé!', 'error');
    }
},
showReplyForm: function(parentId, targetUserId, targetUserName) {
    const $form = $(`#reply-form-${parentId}`);
    const $input = $(`#reply-input-${parentId}`);
    
    // Nếu form đang hiện và bác lại nhấn vào chính người đó -> Ẩn form
    if (!$form.hasClass('d-none') && $input.data('reply-to-id') === targetUserId) {
        this.hideReplyForm(parentId);
        return;
    }

    // Hiện form
    $form.removeClass('d-none');
    
    // Lưu thông tin người được trả lời
    $input.data('reply-to-id', targetUserId);
    $input.data('reply-to-name', targetUserName);
    
    $input.attr('placeholder', `Đang trả lời ${targetUserName}...`);
    $input.focus();
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

loadCourses: async function(teacherId = 'all') {
    try {
        let url = `https://lms-u2jn.onrender.com/api/course/by-teacher?teacherId=${teacherId}`;
        const response = await fetch(url);
        const res = await response.json();
        
        const $courseSelect = $('#courseFilter');
        $courseSelect.find('option:not(:first)').remove();
        
        // CỰC QUAN TRỌNG: Khi load lại Course, phải reset ô Lesson về mặc định
        $('#lessonFilter').html('<option value="all">-- Chọn bài học --</option>');

        if (res.success && res.data) {
            res.data.forEach(c => {
            const id = c.courseId || c.id; 
            $courseSelect.append(`<option value="${id}">${c.title || c.courseName}</option>`);
    });
        }
    } catch (e) { 
        console.error("Lỗi khi gọi API Courses:", e); 
    }
},
loadTeacherSelect: async function() {
    const token = localStorage.getItem("jwt_token");
    try {
        const response = await fetch(`https://lms-u2jn.onrender.com/api/course/get-all-teachers`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const res = await response.json();
        
        if (res.success || res.Success) {
            let html = '<option value="all">Tất cả giảng viên</option>';
            const teachers = res.data || res.Data;
            
            teachers.forEach(t => {
                html += `<option value="${t.id}">${t.fullName}</option>`;
            });
            
            $('#instructorFilter').html(html);

            // Xử lý sự kiện Change
            $('#instructorFilter').off('change').on('change', async (e) => {
                const selectedId = $(e.target).val();
                debugger
                // 1. Load lại danh sách khóa học của ông này
                await this.loadCourses(selectedId); 
                
                // 2. Load lại dữ liệu bảng bình luận theo Teacher
                this.loadData(1); 
            });
        }
    } catch (error) { 
        console.error("Lỗi load giảng viên:", error); 
    }
},
loadLessons: async function(courseId) {
    if (!courseId || courseId === 'all') {
        $('#lessonFilter').html('<option value="all">-- Chọn bài học --</option>');
        return;
    }
    try {
        const response = await fetch(`https://lms-u2jn.onrender.com/api/lesson/list-lesson/${courseId}`);
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

    // 1. Xác định LessonId
    if (commentId) {
        // Trường hợp Toggle còm cũ: Lấy từ data-attribute của thẻ cha
        lessonId = $(`#thread-${commentId}`).attr('data-lesson-id');
    } else {
        // Trường hợp Đăng mới: Lấy từ Select Filter
        lessonId = $('#lessonFilter').val();
    }

    // 2. Kiểm tra tính hợp lệ của Bài học
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
            inputPlaceholder: 'Nhập nội dung lưu ý quan trọng cho học viên...',
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
    // KỊCH BẢN B: Ghim hoặc Gỡ ghim một bình luận có sẵn
    else {
        // KIỂM TRA TRẠNG THÁI: Nếu icon đang là 'fill' thì nghĩa là ĐANG GHIM
        const isCurrentlyPinned = $(`#thread-${commentId}`).find('.bi-pin-angle-fill').length > 0;

        // Tự động điều chỉnh nội dung thông báo dựa trên trạng thái
        const swalConfig = isCurrentlyPinned ? {
            title: 'Bỏ ghim bình luận?',
            text: "Bình luận này sẽ không còn nằm ở đầu danh sách bài học nữa.",
            icon: 'warning',
            confirmButtonText: 'Gỡ ghim ngay',
            confirmButtonColor: '#f59e0b' // Màu cam cảnh báo
        } : {
            title: 'Xác nhận ghim?',
            text: "Bình luận này sẽ được đẩy lên đầu danh sách bài học này!",
            icon: 'question',
            confirmButtonText: 'Ghim ngay',
            confirmButtonColor: '#3085d6' // Màu xanh xác nhận
        };

        Swal.fire({
            ...swalConfig,
            showCancelButton: true,
            cancelButtonText: 'Để sau'
        }).then((result) => {
            if (result.isConfirmed) {
                this.callPinApi({ commentId: commentId, lessonId: lessonId }, false);
            }
        });
    }
},

// Hàm trung gian gọi API (Khớp với PinRequest ở Controller)
callPinApi: async function (data, isNew) {
    try {
        const response = await fetch('https://lms-u2jn.onrender.com/api/comment/pin-handler', {
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
    },
    
        hardDelete: function(id) {
            Swal.fire({
                title: 'Xóa vĩnh viễn?',
                text: "Dữ liệu sẽ bị xóa sạch khỏi hệ thống và không thể khôi phục!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'Xóa ngay',
                cancelButtonText: 'Hủy'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    const response = await fetch(`${AdminComment.config.apiUrl}/hard-delete/${id}`, { method: 'DELETE' });
                    const res = await response.json();
                    if (res.success || res.Success) {
                        Toast.fire('Đã xóa!', 'Bình luận đã bị xóa vĩnh viễn.', 'success');
                        this.loadData(1);
                    } else {
                        Toast.fire('Thất bại!', res.message || 'Có lỗi xảy ra.', 'error');
                    }
                }
            });
        },
};

$(document).ready(() => AdminComment.init());