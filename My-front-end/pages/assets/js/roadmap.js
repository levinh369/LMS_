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
var RoadMap = {
    currentPage : 0,
    config: {
        apiUrl: "http://127.0.0.1:5000/api/roadmap",
        pageSize : 10
    },
   init: function () {
    const userInfoRaw = localStorage.getItem("user_info");
    
    if (!userInfoRaw) {
        window.location.href = "/pages/auth/login.html";
        return;
    }

    const user = JSON.parse(userInfoRaw);
    const roleId = parseInt(user.role); 
    // Nếu là Admin thì khởi chạy như bình thường
    if (typeof this.renderHeader === 'function') this.renderHeader(roleId);
    if (typeof this.registerEvents === 'function') this.registerEvents();
    if (typeof this.loadTeacherSelect === 'function') this.loadTeacherSelect();
    
    this.loadData(1);
},
    registerCheckboxEvents: function () {
        const _this = this;

        $(document).off('change', '#check-all').on('change', '#check-all', function () {
            const isChecked = $(this).prop('checked');
            
            if (isChecked) {
                // CHỈ tích chọn những ô checkbox KHÔNG bị disabled (Không bị Admin khóa)
                $('.item-check').not(':disabled').prop('checked', true);
            } else {
                // Khi bỏ chọn tất cả thì cứ thoải mái gỡ chọn toàn bộ
                $('.item-check').prop('checked', false);
            }
            
            // Gọi hàm cập nhật ẩn/hiện thanh công cụ xóa hàng loạt
            _this.toggleBulkActions();
        });

        // Sự kiện từng ô lẻ
        $(document).off('change', '.item-check').on('change', '.item-check', function () {
            const total = $('.item-check').length;
            const checked = $('.item-check:checked').length;
            $('#check-all').prop('checked', total > 0 && total === checked);
            _this.toggleBulkActions();
        });
    }, toggleBulkActions: function () {
    const selectedCount = $('.item-check:checked').not(':disabled').length;
    const $bulkArea = $('#bulk-actions');
    const $countDisplay = $('#selected-count');

    if (selectedCount > 0) {
        $countDisplay.text(selectedCount);
        $bulkArea.css({ 'visibility': 'visible', 'opacity': '1' });
    } else {
        $bulkArea.css('opacity', '0');
        setTimeout(() => {
            // SỬA TẠI ĐÂY: Check lại chính xác số lượng thực tế trước khi ẩn hẳn thanh công cụ
            if ($('.item-check:checked').not(':disabled').length === 0) {
                $bulkArea.css('visibility', 'hidden');
            }
        }, 200);
        
        // Tự động gỡ tích chọn ở nút "Chọn tất cả" trên đầu bảng nếu không còn mục nào được chọn hợp lệ
        $('#check-all').prop('checked', false);
    }
},
    uncheckAll: function() {
        $('.item-check, #check-all').prop('checked', false);
        this.toggleBulkActions();
    },
     registerEvents: function () {
        this.registerCheckboxEvents()
    },
    renderHeader: function(roleId) {
        let html = `
            <tr>
           ${roleId === 3 ? `
                <th class="ps-4" style="width: 50px;">
                    <input class="form-check-input border-secondary" type="checkbox" id="check-all" style="cursor: pointer;">
                </th>
            ` : ''}
                <th class="ps-4" style="width: 80px;">Ảnh</th>
                <th>Thông tin lộ trình</th>
                ${roleId === 1 ? '<th>Giảng viên</th>' : ''}
                <th class="text-center">Số khóa học</th>
                <th class="text-center">Trạng thái</th>
                <th class="text-center">Hành động</th>
            </tr>`;
        $('#table-head').html(html); // Đảm bảo trong <table> bác có <thead id="table-head">
    },
      resetFilter: function() {
        const userInfoRaw = localStorage.getItem("user_info");
        const user = JSON.parse(userInfoRaw);
        const roleId = user?.role;

        // Reset các ô input dùng chung
        $('#keySearch').val('');
        $('#isActive').val('-1');

        // Reset ô chọn giảng viên nếu là Admin
        if (roleId === 1) {
            $('#filterTeacherId').val('0');
        }

        this.loadData(1);
    },
    loadTeacherSelect: async function() {
        const token = localStorage.getItem("jwt_token");
        try {
            const response = await fetch(`http://127.0.0.1:5000/api/course/get-all-teachers`, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
            const res = await response.json();
            if (res.success || res.Success) {
                let html = '<option value="0">Tất cả giảng viên</option>';
                const teachers = res.data || res.Data;
                teachers.forEach(t => {
                    html += `<option value="${t.id}">${t.fullName}</option>`;
                });
                $('#filterTeacherId').html(html);
            }
        } catch (error) { console.error("Lỗi load giảng viên:", error); }
    },
loadData: async function(page) {
    const userInfoRaw = localStorage.getItem("user_info");
    const user = JSON.parse(userInfoRaw);
    const roleId = parseInt(user.role);

    if (typeof TableLoader !== 'undefined') TableLoader.show('#roadmapBody');

    let queryParams = {
        page: page,
        pageSize: this.config.pageSize || 10,
        keySearch: $('#keySearch').val() || '',
        isActive: $('#isActive').val() || -1,
        teacherId: $('#filterTeacherId').val() || 0
    };

    const params = new URLSearchParams(queryParams);

    try {
        const res = await $.ajax({
            url: `${this.config.apiUrl}/list-data?${params.toString()}`,
            type: 'GET'
        });

        if (res.success || res.Success) {
            const listData = res.data || res.Data;
            const totalCount = res.total || res.Total;
            const totalPages = Math.ceil(totalCount / queryParams.pageSize);
            
            this.renderTable(listData, roleId);
            this.showPaging(totalCount, totalPages, page);
        }
    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu:", error);

        // 📍 XỬ LÝ LỖI 403 (Forbidden)
        if (error.status === 403) {
            console.warn("Truy cập bị từ chối (403). Đang điều hướng...");
            window.location.href = "/pages/403.html"; // Bác trỏ đúng đường dẫn file 403 của bác nhé
            return;
        }

        // Nếu lỗi 401 (thì auth.js đã lo, không cần làm gì)
        if (error.status === 401) {
            console.warn("Phiên đăng nhập hết hạn.");
        }
    } finally {
        if (typeof TableLoader !== 'undefined') TableLoader.hide('#roadmapBody');
    }
},
renderTable: function (data, roleId) {
    let html = '';
    if (!data || data.length === 0) {
        const colSpan = roleId === 1 ? 7 : 6;
        html = `<tr><td colspan="${colSpan}" class="text-center py-5 text-muted">Không tìm thấy lộ trình nào bác ơi!</td></tr>`;
    } else {
        data.forEach(item => {
            const isLockedByAdmin = item.lockedByRole === 'Admin';
            
                    html += `
            <tr>
            ${roleId === 3 ? `
                <td class="ps-4">
                    <input class="form-check-input item-check" type="checkbox" value="${item.id}" 
                        style="cursor: ${isLockedByAdmin ? 'not-allowed' : 'pointer'};"
                        ${isLockedByAdmin ? 'disabled' : ''}>
                </td>
            ` : ''}
                <td class="ps-4">
                    <img src="${item.thumbnailUrl || 'https://via.placeholder.com/100x60'}" 
                        class="roadmap-img shadow-sm" style="width:70px; height:45px; object-fit:cover; border-radius:8px">
                </td>
                <td>
                    <div class="fw-bold text-dark">${item.title}</div>
                    <div class="text-muted small" style="font-size: 0.7rem;">ID: #${item.id}</div>
                    
                    <!-- THÔNG BÁO DANGER CHO TEACHER KHI BỊ KHÓA -->
                    ${roleId !== 1 && isLockedByAdmin ? 
                        `<div class="badge bg-danger-subtle text-danger mt-1" style="font-size: 0.6rem;">
                            <i class="bi bi-exclamation-triangle-fill me-1"></i>Đã bị Admin niêm phong
                        </div>` : ''}
                </td>

                ${roleId === 1 ? `
                <td>
                    <div class="fw-bold small">${item.instructorName || 'Chưa rõ'}</div>
                    <div class="text-muted" style="font-size:0.7rem">ID: ${item.instructorId}</div>
                </td>` : ''}

                <td class="text-center">
                    <span class="badge rounded-pill bg-primary bg-opacity-10 text-primary px-3">
                        ${item.courseCount || 0} khóa
                    </span>
                </td>

                <td class="text-center">
                    <button class="btn btn-sm px-3 rounded-pill fw-bold shadow-sm transition-all
                            ${isLockedByAdmin ? 'btn-outline-danger' : (item.isActive ? 'btn-light-success text-success border-success' : 'btn-light-secondary text-secondary border-secondary')} 
                            ${roleId !== 1 && isLockedByAdmin ? 'opacity-50' : ''}" 
                            style="min-width: 120px; font-size: 0.75rem; border-width: 2px;"
                            onclick="${roleId !== 1 && isLockedByAdmin 
                                ? "Swal.fire({icon: 'error', title: 'Truy cập bị chặn', text: 'Lộ trình này đã bị Admin niêm phong!', confirmButtonColor: '#d33'})" 
                                : `RoadMap.toggleStatus(${item.id})`}"
                            ${roleId !== 1 && isLockedByAdmin ? 'disabled' : ''}>
                        ${isLockedByAdmin ? '<i class="bi bi-shield-lock-fill me-1"></i>Niêm phong' : (item.isActive ? '<i class="bi bi-check-circle-fill me-1"></i>Hoạt động' : '<i class="bi bi-pause-circle-fill me-1"></i>Tạm ẩn')}
                    </button>
                </td>

                <td class="text-center">
                    <div class="d-flex justify-content-center gap-2">
                        <!-- NÚT XEM CHI TIẾT (DETAIL) -->
                        <button class="btn btn-sm btn-outline-info" onclick="RoadMap.viewDetail(${item.id})" title="Xem chi tiết">
                            <i class="bi bi-eye"></i>
                        </button>

                        <a href="roadmap-builder.html?id=${item.id}" class="btn btn-sm btn-outline-primary" title="Xây dựng lộ trình">
                            <i class="bi bi-diagram-3"></i>
                        </a>
                        
                        <button class="btn btn-sm btn-outline-warning" onclick="RoadMap.openEditModal(${item.id})" title="Sửa thông tin">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        
                        ${roleId === 1 ? `
                            <button class="btn btn-sm ${isLockedByAdmin ? 'btn-danger' : 'btn-outline-danger'}" 
                                    onclick="RoadMap.toggleStatus(${item.id})" 
                                    title="${isLockedByAdmin ? 'Mở khóa' : 'Niêm phong'}">
                                <i class="bi ${isLockedByAdmin ? 'bi-lock-fill' : 'bi-unlock-fill'}"></i>
                            </button>
                        ` : `
                            <button class="btn btn-sm btn-outline-danger ${isLockedByAdmin ? 'opacity-50' : ''}" 
                                    onclick="${isLockedByAdmin ? "Swal.fire('Bị chặn', 'Lộ trình đang bị niêm phong, không thể xóa!', 'warning')" : `RoadMap.delete(${item.id})`}" 
                                    ${isLockedByAdmin ? 'disabled' : ''}
                                    title="Xóa lộ trình">
                                <i class="bi bi-trash3-fill"></i>
                            </button>
                        `}
                    </div>
                </td>
            </tr>`;
        });
    }
    $('#roadmapBody').html(html);
},
viewDetail: async function(id) {
    try {
        // 1. Khóa màn hình & Bật modal
        GlobalLoader.show();
        $('#modalDetail').modal('show');
        
        // Hiện trạng thái đang tải list course, ẩn các state khác
        $('#detail-course-loading').removeClass('d-none');
        $('#detail-course-empty, #detail-course-list').addClass('d-none');

        const token = localStorage.getItem("jwt_token");
        const response = await fetch(`${this.config.apiUrl}/${id}/detail`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        if (!response.ok || !(result.success || result.Success)) {
            throw new Error(result.message || result.Message || 'Lỗi tải chi tiết lộ trình');
        }

        const data = result.data || result.Data;

        // ==========================================
        // 2. RENDER THÔNG TIN LỘ TRÌNH (BÊN TRÁI)
        // ==========================================
        $('#detail-img').attr('src', data.thumbnailUrl || data.ThumbnailUrl || '/assets/img/default-roadmap.png');
        $('#detail-title').text(data.title || data.Title);
        $('#detail-id').text('ID: #' + (data.id || data.Id));
        $('#detail-desc').text(data.description || data.Description || 'Không có mô tả cho lộ trình này.');
        $('#detail-created-at').text(new Date(data.createdAt || data.CreatedAt).toLocaleDateString('vi-VN'));
        
        // Render thông tin giảng viên
        const instructorName = data.instructorName || data.InstructorName || 'Chưa rõ';
        const instructorId = data.instructorId || data.InstructorId;
        
        $('#detail-teacher-name').text(instructorName);
        $('#detail-teacher-id').text(instructorId ? 'ID Giảng viên: ' + instructorId : 'N/A');
        $('#detail-teacher-avatar-text').text(instructorName !== 'Chưa rõ' ? instructorName.charAt(0).toUpperCase() : '?');

        // Xử lý huy hiệu trạng thái Lộ trình
        const lockedByRole = data.lockedByRole || data.LockedByRole;
        const isActive = data.isActive !== undefined ? data.isActive : data.IsActive;

        if (lockedByRole === 'Admin') {
            $('#detail-status').html('<span class="badge bg-danger"><i class="bi bi-lock-fill me-1"></i>Đã niêm phong</span>');
            $('#danger-overlay').removeClass('d-none'); // Hiện màn sương mờ màu đỏ
        } else {
            $('#danger-overlay').addClass('d-none');
            const statusHtml = isActive 
                ? '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Hoạt động</span>'
                : '<span class="badge bg-secondary"><i class="bi bi-pause-circle me-1"></i>Tạm ẩn</span>';
            $('#detail-status').html(statusHtml);
        }

        // ==========================================
        // 3. RENDER DANH SÁCH KHÓA HỌC/GIAI ĐOẠN (BÊN PHẢI)
        // ==========================================
        const courses = data.courses || data.Courses || [];
        
        $('#detail-course-loading').addClass('d-none');

        if (courses.length === 0) {
            $('#detail-course-empty').removeClass('d-none');
        } else {
            let courseHtml = '';
            courses.forEach(course => {
                const isPhase = course.isPhase !== undefined ? course.isPhase : course.IsPhase;
                const title = course.title || course.Title;
                const orderIndex = course.orderIndex !== undefined ? course.orderIndex : (course.OrderIndex || 0);

                if (isPhase) {
                    // Nếu là một GIAI ĐOẠN (Phase) -> Render dải phân cách nổi bật
                    courseHtml += `
                    <div class="alert alert-secondary border-0 fw-bold mb-2 mt-3 py-2 d-flex align-items-center shadow-sm" style="border-radius: 10px;">
                        <i class="bi bi-flag-fill me-2 text-primary"></i> Giai đoạn ${orderIndex}: ${title}
                    </div>`;
                } else {
                    // Nếu là một KHÓA HỌC -> Render dạng Card
                    const priceValue = course.isFree !== undefined ? course.isFree : (course.IsFree || 0);
                    const priceText = priceValue == 0 
                        ? '<span class="text-success fw-bold">Miễn phí</span>' 
                        : `<span class="text-danger fw-bold">${priceValue.toLocaleString('vi-VN')} đ</span>`;

                    const phaseName = course.phaseName || course.PhaseName || 'Khóa học tự do';
                    const thumb = course.thumbnailUrl || course.ThumbnailUrl || '/assets/img/default-course.png';

                    courseHtml += `
                    <div class="card border border-light-subtle shadow-sm transition-hover mb-2">
                        <div class="card-body p-3 d-flex align-items-center">
                            <div class="flex-shrink-0 bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold me-3" style="width: 40px; height: 40px; font-size: 1.1rem;">
                                ${orderIndex}
                            </div>
                            <div class="flex-shrink-0 me-3">
                                <img src="${thumb}" class="rounded" style="width: 80px; height: 50px; object-fit: cover;">
                            </div>
                            <div class="flex-grow-1 min-w-0">
                                <h6 class="fw-bold text-dark mb-1 text-truncate" title="${title}">${title}</h6>
                                <div class="d-flex flex-wrap gap-3 text-muted" style="font-size: 0.75rem;">
                                    <span><i class="bi bi-layers-fill me-1"></i> ${phaseName}</span>
                                    ${priceText}
                                </div>
                            </div>
                        </div>
                    </div>`;
                }
            });

            $('#detail-course-list').html(courseHtml).removeClass('d-none');
        }

    } catch (error) {
        console.error("Lỗi xem chi tiết:", error);
        Toast.fire({ icon: 'error', title: 'Lỗi tải chi tiết, vui lòng thử lại!' });
        $('#modalDetail').modal('hide');
    } finally {
        GlobalLoader.hide();
    }
},
toggleStatus: function (id) {
    // Lấy thông tin user từ localStorage để xác định Role
    const userInfo = JSON.parse(localStorage.getItem("user_info"));
    if (!userInfo) {
        Toast.fire({ icon: 'warning', title: 'Vui lòng đăng nhập để thực hiện!' });
        return;
    }

    // Chuyển đổi mã Role sang String để khớp với logic Backend (1: Admin, 3: Teacher)
    const roleName = parseInt(userInfo.role) === 1 ? "Admin" : "Teacher";

    Swal.fire({
        title: 'Xác nhận thay đổi?',
        text: "Bạn có chắc chắn muốn thay đổi trạng thái hiển thị của lộ trình này?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Đồng ý',
        cancelButtonText: 'Hủy'
    }).then(async (result) => { // Thêm async ở đây để xử lý đồng bộ mượt mà
        if (result.isConfirmed) {
            try {
                // 1. KHÓA CỨNG MÀN HÌNH CHỐNG USER SPAM CLICK LÀM LOẠN DB
                GlobalLoader.show();

                const token = localStorage.getItem("jwt_token");

                // Chuyển $.ajax truyền thống sang cú pháp await cực kỳ gọn và chuyên nghiệp
                const res = await $.ajax({
                    url: `${RoadMap.config.apiUrl}/toggle-status/${id}?role=${roleName}`,
                    type: 'PUT',
                    contentType: 'application/json',
                    headers: { 'Authorization': `Bearer ${token}` } // Luôn bọc token bảo vệ API
                });

                if (res.success || res.Success) {
                    // 2. ĐỒNG BỘ: Sử dụng Toast hệ thống thay thế Swal popup cũ
                    Toast.fire({ 
                        icon: 'success', 
                        title: res.message || res.Message || 'Đã cập nhật trạng thái lộ trình thành công!' 
                    });
                    
                    // Tải lại danh sách lộ trình
                    RoadMap.loadData(1); 
                } else {
                    Toast.fire({ 
                        icon: 'error', 
                        title: res.message || res.Message || 'Cập nhật trạng thái thất bại!' 
                    });
                }
            } catch (err) {
                console.error("Lỗi khi gọi API toggle-status:", err);
                
                // Bóc tách lỗi chuyên sâu từ BadRequest của C# trả về
                let errMsg = 'Server đang bận hoặc lỗi kết nối!';
                if (err.responseJSON) {
                    errMsg = err.responseJSON.message || err.responseJSON.Message || JSON.stringify(err.responseJSON);
                } else if (err.responseText) {
                    errMsg = err.responseText;
                }

                // Hiện lỗi cho admin/teacher biết bằng Toast đồng bộ
                Toast.fire({ icon: 'error', title: errMsg });
            } finally {
                // 3. LUÔN LUÔN NHẢ MÀN HÌNH RA Ở KHỐI FINALLY
                GlobalLoader.hide();
            }
        }
    });
},
        // 3. Xử lý Image Preview
       previewImage: function(input) {
    const $img = $('#previewImg');
    const $placeholder = $('#previewPlaceholder');

    // TRƯỜNG HỢP 1: Người dùng chọn File từ máy tính (input là thẻ <input type="file">)
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();

        reader.onload = function(e) {
            $img.attr('src', e.target.result).show(); 
            $placeholder.hide();
        };

        reader.readAsDataURL(file); // Bắt đầu đọc file
        
        $img.on('error', () => { 
            $img.hide(); 
            $placeholder.text('File lỗi bác ơi!').show(); 
        });
    } 
    else if (typeof input === 'string' && input.trim() !== "") {
        $img.attr('src', input).show();
        $placeholder.hide();
        $img.on('error', () => { 
            $img.hide(); 
            $placeholder.text('Lỗi ảnh').show(); 
        });
    } 
    else {
        $img.hide();
        $placeholder.text('Chưa có ảnh').show();
    }
},
        openModal: function(id = null) {
            $('#roadmapForm')[0].reset();
            $('#roadmapId').val(0);
            $('#previewImg').hide();
            $('#previewPlaceholder').show();

            if (id) {
                $('#modalTitle').text('Chỉnh sửa Lộ trình');
                $.get(`${Auth.config.apiUrl}/Roadmap/${id}`, function(res) {
                    $('#roadmapId').val(res.id);
                    $('#title').val(res.title);
                    $('#description').val(res.description);
                    $('#thumbnailUrl').val(res.thumbnailUrl);
                    $('#isActive').prop('checked', res.isActive);
                    Roadmap.previewImage(res.thumbnailUrl);
                });
            } else {
                $('#modalTitle').text('Tạo Lộ trình mới');
            }
            new bootstrap.Modal('#roadmapModal').show();
        },
  add: async function() {
    const btnSave = $('#btnSave');
    const form = $('#roadmapForm');
    
    if (form.length === 0) return;
    
    const formData = new FormData(form[0]);
    const isActive = $('#txtIsActive').is(':checked'); 
    formData.set('IsActive', isActive);

    try {
        // 1. KHÓA CỨNG MÀN HÌNH BẰNG GLOBAL LOADER THAY CHO SWAL POPUP CŨ
        GlobalLoader.show();
        btnSave.prop('disabled', true);

        // Lấy token bảo mật từ localStorage
        const token = localStorage.getItem("jwt_token");

        const response = await $.ajax({
            url: RoadMap.config.apiUrl, 
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            headers: {
                "Authorization": "Bearer " + token
            },
        });

        // 2. ĐỒNG BỘ: Sử dụng Toast hệ thống thông báo góc phải cực mượt
        Toast.fire({
            icon: 'success',
            title: response.message || "Lộ trình đã được tạo thành công!"
        });

        // Đóng modal và reset trạng thái form dữ liệu sạch sẽ
        $('#roadmapModal').modal('hide'); 
        RoadMap.loadData(1); 
        form[0].reset(); 

        // Nếu bác có làm phần hiển thị ảnh preview (thumbnail) lúc chọn file, 
        // nhớ ẩn hoặc reset nó về ảnh default ở đây luôn nhé, ví dụ:
        // $('#imgPreview').hide().attr('src', '');

    } catch (error) {
        console.error("Lỗi thêm lộ trình:", error);
        
        // Bóc tách lỗi chi tiết từ server trả về để báo chính xác cho người dùng
        let errorMsg = "Phiên đăng nhập hết hạn hoặc lỗi hệ thống!";
        if (error.responseJSON) {
            errorMsg = error.responseJSON.message || error.responseJSON.Message || JSON.stringify(error.responseJSON);
        }
        
        // ĐỒNG BỘ: Báo lỗi bằng Toast thay vì popup Swal to đùng
        Toast.fire({
            icon: 'error',
            title: errorMsg
        });
    } finally {
        // 3. LUÔN LUÔN NHẢ KHÓA NÚT VÀ MÀN HÌNH Ở FINALLY
        btnSave.prop('disabled', false);
        GlobalLoader.hide();
    }
},
openEditModal: async function(id) {
    $('#roadmapForm')[0].reset();
    $('#thumbnailFile').val(''); 
    
    try {
        // Hiển thị loading nhẹ trong khi chờ API
        Swal.showLoading();
        
        const res = await $.get(`${RoadMap.config.apiUrl}/${id}`);
        
        // Đổ dữ liệu vào các field
        $('#roadmapId').val(res.id);
        $('#Title').val(res.title);
        $('#description').val(res.description);
        $('#thumbnailUrl').val(res.thumbnailUrl);
        
        // 1. LOGIC KIỂM TRA KHÓA (LOCKED BY ADMIN)
        const isLockedByAdmin = res.lockedByRole === 'Admin';
        const checkboxStatus = $('#txtIsActive');

        checkboxStatus.prop('checked', res.isActive);

        if (isLockedByAdmin) {
            // Nếu bị Admin khóa: Vô hiệu hóa checkbox trạng thái
            checkboxStatus.prop('disabled', true);
            
            // Thêm một dòng nhắc nhở nhỏ để User (Teacher) biết tại sao không chỉnh được
            if ($('#lock-warning').length === 0) {
                checkboxStatus.after('<small id="lock-warning" class="text-danger d-block mt-1" style="font-size: 0.7rem;"><i class="bi bi-shield-lock-fill me-1"></i>Bị Admin niêm phong - Không thể đổi trạng thái</small>');
            }
        } else {
            // Nếu không bị khóa: Mở lại checkbox và xóa nhắc nhở (nếu có)
            checkboxStatus.prop('disabled', false);
            $('#lock-warning').remove();
        }

        // 2. Xử lý ảnh Preview
        if (res.thumbnailUrl) {
            $('#previewImg').attr('src', res.thumbnailUrl).show();
            $('#previewPlaceholder').hide();
        } else {
            $('#previewImg').hide();
            $('#previewPlaceholder').text('Chưa có ảnh').show();
        }

        $('#modalTitle').text('Chỉnh sửa Lộ trình: ' + res.title);
        
        Swal.close();
        $('#roadmapModal').modal('show'); 

    } catch (error) {
        Swal.fire('Lỗi!', 'Không lấy được thông tin lộ trình bác ơi.', 'error');
    }
},
edit: async function() {
    const id = $('#roadmapId').val();
    const form = $('#roadmapForm');
    
    if (form.length === 0) return;

    const formData = new FormData(form[0]);
    formData.set('IsActive', $('#txtIsActive').is(':checked'));

    try {
        // 1. KHÓA MÀN HÌNH BẰNG GLOBAL LOADER BẢO VỆ TIẾN TRÌNH UPLOAD ẢNH & LƯU DB
        GlobalLoader.show();
        $('#btnSave').prop('disabled', true); // Khóa nhẹ cái nút lưu nếu bác dùng id này

        const token = localStorage.getItem("jwt_token");

        const response = await $.ajax({
            url: `${RoadMap.config.apiUrl}/${id}`, 
            type: 'PUT', 
            data: formData,
            processData: false,
            contentType: false,
            headers: {
                "Authorization": "Bearer " + token // Bọc kèm token bảo mật chuẩn C#
            }
        });

        // 2. ĐỒNG BỘ: Dùng Toast nổ nhẹ góc phải cực sang chảnh
        Toast.fire({ 
            icon: 'success', 
            title: response.message || 'Đã cập nhật thay đổi lộ trình thành công!' 
        });

        // Đóng modal và tải lại danh sách
        $('#roadmapModal').modal('hide');
        RoadMap.loadData(1); 
        
    } catch (error) {
        console.error("Lỗi cập nhật lộ trình:", error);
        
        let errorMsg = "Không thể cập nhật lộ trình!";
        if (error.responseJSON) {
            errorMsg = error.responseJSON.message || error.responseJSON.Message || JSON.stringify(error.responseJSON);
        }

        // ĐỒNG BỘ: Hiện lỗi qua Toast luôn
        Toast.fire({ 
            icon: 'error', 
            title: errorMsg 
        });
    } finally {
        // 3. LUÔN LUÔN NHẢ KHÓA MÀN HÌNH VÀ NÚT BẤM
        $('#btnSave').prop('disabled', false);
        GlobalLoader.hide();
    }
},
save: function() {
    // Nếu Id > 0 thì là đang Sửa, ngược lại là Thêm mới
    const id = parseInt($('#roadmapId').val()) || 0;
    
    if (id > 0) {
        RoadMap.edit();
    } else {
        RoadMap.add();
    }
},
delete: async function(id) {
    const result = await Swal.fire({
        title: "Bạn có chắc muốn xóa?",
        text: "Thao tác này sẽ không thể hoàn tác!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Xóa ngay",
        cancelButtonText: "Hủy"
    });

    if (result.isConfirmed) {
        try {
            // 1. KHÓA MÀN HÌNH BẢO VỆ TIẾN TRÌNH XÓA CỨNG
            GlobalLoader.show();

            const token = localStorage.getItem("jwt_token");
            const res = await $.ajax({
                url: `${RoadMap.config.apiUrl}/${id}`,
                type: "DELETE",
                headers: { "Authorization": "Bearer " + token } // Bọc token bảo mật
            });

            // ĐỒNG BỘ: Chuyển thông báo thành công về Toast góc phải
            Toast.fire({ 
                icon: 'success', 
                title: res.message || "Đã xóa lộ trình thành công." 
            });
            
            RoadMap.loadData(1);
        } catch (error) {
            console.error("Lỗi khi xóa:", error);
            Toast.fire({ 
                icon: 'error', 
                title: error.responseJSON?.message || "Không thể xóa bản ghi này." 
            });
        } finally {
            // GIẢI PHÓNG MÀN HÌNH CHỜ
            GlobalLoader.hide();
        }
    }
},

changeStatus: async function(id) { 
    try {
        // 2. KHÓA MÀN HÌNH KHI ĐANG PATCH ĐỔI TRẠNG THÁI
        GlobalLoader.show();

        const token = localStorage.getItem("jwt_token");
        const response = await $.ajax({
            url: `${RoadMap.config.apiUrl}/${id}/status`, 
            type: 'PATCH',
            headers: { "Authorization": "Bearer " + token } // Bọc token bảo mật
        });

        // ĐỒNG BỘ: Xóa bỏ cụm tạo Swal.mixin lặp lại cũ, dùng trực tiếp Toast dùng chung của hệ thống
        Toast.fire({
            icon: 'success',
            title: response.message || 'Cập nhật trạng thái thành công!'
        });

        RoadMap.loadData(1); 
    } catch (error) {
        console.error("Lỗi đổi trạng thái:", error);
        const errorMsg = error.responseJSON?.message || error.responseJSON?.Message || 'Không đổi được trạng thái bác ơi!';
        
        // ĐỒNG BỘ: Đổi nốt thông báo lỗi này về dạng Toast cho đồng điệu UX
        Toast.fire({ 
            icon: 'error', 
            title: errorMsg 
        });
        
        RoadMap.loadData(1);
    } finally {
        // LUÔN LUÔN NHẢ MÀN HÌNH Ở FINALLY
        GlobalLoader.hide();
    }
},
    showPaging: function (totalCount, totalPages, currentPage) {
    $('#total-records').text(totalCount);
    if (totalPages <= 1) {
        $('#paging-ul').empty();
        $('#paging-ul').removeData("twbs-pagination");
        $('#paging-ul').unbind("page");
        return;
    }
    $('#paging-ul').twbsPagination('destroy');

    // 4. Khởi tạo phân trang
    $('#paging-ul').twbsPagination({
        totalPages: totalPages,
        visiblePages: 5,
        startPage: currentPage,
        first: '<i class="bi bi-chevron-double-left"></i>', // Dùng Bootstrap Icon cho đồng bộ
        prev: '<i class="bi bi-chevron-left"></i>',
        next: '<i class="bi bi-chevron-right"></i>',
        last: '<i class="bi bi-chevron-double-right"></i>',
        onPageClick: function (event, page) {
            if (page !== currentPage) {
                RoadMap.loadData(page); // Gọi lại hàm load dữ liệu của bạn
            }
        }
    });
},
getAllRoadMaps: async function() {
        try {
            // 1. Gọi API (Fix lỗi dấu } dư ở cuối URL của bác)
            const response = await fetch(`${this.config.apiUrl}/get-all`);
            
            if (!response.ok) throw new Error('Mạng lỗi hoặc Server có vấn đề bác ơi');

            const res = await response.json();
            console.log("Dữ liệu thực tế từ API:", res);

            // 2. Kiểm tra success (Hỗ trợ cả chữ hoa và chữ thường từ Backend)
            if (res.success || res.Success) {
                const data = res.data || res.Data || [];
                
                // Cập nhật số lượng lên Badge
                $('#roadmapCount').text(`${data.length} Lộ trình`);
                
                // Vẽ giao diện
                this.render(data);
            } else {
                this.showError(res.message || "Không lấy được dữ liệu.");
            }

        } catch (error) {
            console.error("Lỗi sập nguồn:", error);
            this.showError("Lỗi kết nối server rồi bác ạ!");
        }
    },
    render: function(roadmaps) {
        let html = '';

        if (!roadmaps || roadmaps.length === 0) {
            html = `
                <div class="col-12 text-center py-5">
                    <p class="text-muted">Chưa có lộ trình nào được xuất bản bác ơi.</p>
                </div>`;
        } else {
            roadmaps.forEach(item => {
                html += `
                <div class="col-md-6 col-lg-3">
                    <a href="../road_map/road-map-detail.html?id=${item.id}" class="roadmap-card shadow-sm">
                        <div class="roadmap-icon">
                            <i class="bi bi-signpost-split-fill"></i>
                        </div>
                        <span class="step-count">
                            <i class="bi bi-layers-half me-1"></i>${item.courseCount || 0} Khóa học
                        </span>
                        <h4>${item.title}</h4>
                        <p class="roadmap-desc">
                            ${item.description || 'Lộ trình bài bản giúp bác chinh phục kiến thức mới.'}
                        </p>
                    </a>
                </div>`;
            });
        }

        // Đổ HTML vào row, thay thế cái Spinner đang quay
        $('#roadmapList').html(html);
    },
   RoadMapDetail: async function(id) {
    try {
        const response = await fetch(`${this.config.apiUrl}/${id}/detail`);
        if (!response.ok) throw new Error("Mạng mẽo có vấn đề rồi bác ơi");
        
        const res = await response.json();
        const data = res.data;

        // 1. Cập nhật Banner - Lộ trình Free nếu tổng giá = 0 (hoặc theo logic backend)
        $('#roadmapTitle, #breadTitle').text(data.title);
        const descriptionHtml = `
            ${data.description || "Lộ trình bài bản giúp bạn chinh phục mục tiêu lập trình chuyên nghiệp tại hệ thống LMS."}
            <div class="disclaimer-text mt-3 text-danger fw-bold small">
                <i class="bi bi-exclamation-circle-fill me-1"></i>
                Các khóa học có thể chưa đầy đủ, LMS vẫn đang nỗ lực hoàn thiện trong thời gian sớm nhất.
            </div><br>
        `;
        $('#roadmapDesc').html(descriptionHtml);
        $('#roadmapThumb').attr('src', data.thumbnailUrl || '../assets/img/default-roadmap.png');
       

        // 2. Gom nhóm theo PhaseName
        const grouped = data.courses.reduce((acc, course) => {
            const key = course.phaseName || "Bắt đầu khởi tạo";
            if (!acc[key]) acc[key] = [];
            acc[key].push(course);
            return acc;
        }, {});

        // 3. Render các Giai đoạn và Khóa học
        let html = '';
        let stt = 1;

        for (const phaseName in grouped) {
    html += `
    <div class="phase-item">
        <div class="phase-icon"></div>
        <h3 class="phase-title">${phaseName}</h3>
        <div class="phase-body">
            ${grouped[phaseName].map(course => {
                const isCourseFree = Number(course.price) === 0;
                
                return `
                <div class="course-card" style="cursor: default;"> <div class="course-stt">${stt < 10 ? '0' + stt++ : stt++}</div>
                    <img src="${course.thumbnailUrl || 'placeholder.png'}" class="course-img" alt="${course.title}">
                    <div class="course-info flex-grow-1">
                        <h4>${course.title}</h4>
                        <div class="course-desc">${course.description || "Mô tả khóa học tại hệ thống LMS."}</div>
                        <div class="mt-2">
                            ${isCourseFree 
                                ? '<span class="badge bg-light text-success border small fw-bold">MIỄN PHÍ</span>' 
                                : '<span class="badge bg-warning text-dark small fw-bold">PRO</span>'
                            }
                        </div>
                    </div>
                    <button onclick="RoadMap.handleGoToDetail(${course.id})" class="btn-start">
                        Xem chi tiết
                    </button>
                </div>`;
            }).join('')}
        </div>
    </div>`;
}

        $('#roadmapContent').html(html);

    } catch (error) {
        console.error("Lỗi:", error);
    }
},
handleGoToDetail: async function(courseId) {
        debugger
    const token = localStorage.getItem("jwt_token");
    if (!token) {
        window.location.href = "/Home/detail.html?id=" + courseId;
        return;
    }

    try {
        const res = await $.ajax({
            url: `http://127.0.0.1:5000/api/course/course-detail/${courseId}`,
            type: 'GET',
            headers: { 'Authorization': `Bearer ${token}` } // QUAN TRỌNG: Phải có dòng này
        });
        const data = res.data || res; 
        
        if (data.isEnrolled) {
            console.log("Đã mua, vào học thôi!");
            window.location.href = "/learn/learning.html?id=" + courseId;
        } else {
            console.log("Chưa mua, xem giới thiệu đã.");
            window.location.href = "/Home/detail.html?id=" + courseId;
        }
    } catch (error) {
        console.error("Lỗi API hoặc Token hết hạn:", error);
        // Nếu lỗi (401 chẳng hạn), cứ cho xem Detail như khách vãng lai
        window.location.href = "/Home/detail.html?id=" + courseId;
    }
},
softDeleteBulk: function() {
    const ids = $('.item-check:checked').not(':disabled').map(function() { 
        return parseInt($(this).val()); 
    }).get();
    
    // Nếu không chọn gì hoặc chọn trúng toàn những dòng đã bị Admin khóa
    if (ids.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Hành động bị chặn',
            text: 'Không có lộ trình nào hợp lệ để xóa. Các mục bị Admin niêm phong không thể tác động!',
            confirmButtonColor: '#3085d6'
        });
        return;
    }

    Swal.fire({
        title: `Xóa ${ids.length} lộ trình?`,
        text: "Các lộ trình này sẽ được chuyển vào thùng rác!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Hủy'
        // Đã bỏ showLoaderOnConfirm và preConfirm để nhường sân khấu cho GlobalLoader
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                // 1. KHÓA MÀN HÌNH BẰNG GLOBAL LOADER NGAY KHI USER BẤM ĐỒNG Ý
                GlobalLoader.show();

                const response = await fetch(`${RoadMap.config.apiUrl}/soft-delete-bulk`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem("jwt_token")
                    },
                    body: JSON.stringify(ids)
                });
                
                const res = await response.json();
                
                if (!response.ok) {
                    throw new Error(res.Message || res.message || 'Lỗi từ server');
                }

                const isSuccess = res.Success || res.success;
                if (isSuccess) {
                    // 2. ĐỒNG BỘ: Hiện thông báo thành công bằng Toast tinh tế
                    Toast.fire({
                        icon: 'success',
                        title: res.Message || res.message || 'Đã chuyển vào thùng rác!'
                    });
                    
                    // Reset UI checkbox và nạp lại bảng dữ liệu chính
                    if (typeof RoadMap.uncheckAll === 'function') RoadMap.uncheckAll(); 
                    RoadMap.loadData(1); 
                } else {
                    Toast.fire({
                        icon: 'error',
                        title: res.Message || res.message || 'Xóa hàng loạt thất bại!'
                    });
                }
            } catch (error) {
                console.error("Lỗi xóa mềm loạt lộ trình:", error);
                Toast.fire({
                    icon: 'error',
                    title: `Lỗi: ${error.message}`
                });
            } finally {
                // 3. LUÔN LUÔN TẮT GLOBAL LOADER KHI KẾT THÚC
                GlobalLoader.hide();
            }
        }
    });
},
trash: {
    init: function() {
        const userInfoRaw = localStorage.getItem("user_info");
        let roleId = null;
        if (userInfoRaw) {
            const user = JSON.parse(userInfoRaw);
            roleId = user.role;
        }
       const adminFilter = document.getElementById("adminTeacherFilter");
        if (adminFilter) {
            if (roleId == 1) {
                adminFilter.classList.remove("d-none"); // Hiện filter
                // Gọi thêm hàm load danh sách giảng viên vào select tại đây nếu cần
            } else {
                adminFilter.classList.add("d-none");    // Ẩn filter
            }
        }
        this.loadData(1);
        this.loadTeacherSelect();
        RoadMap.registerCheckboxEvents();
    },
resetFilter: function() {
    // 1. Reset ô tìm kiếm về rỗng
    $('#trashKeySearch').val('');
    
    // 2. Reset select danh mục về giá trị mặc định (0)
    $('#trashFilterCategory').val('0');
    
    // 3. Gọi lại hàm loadData để lấy lại toàn bộ danh sách ban đầu (trang 1)
    this.loadData(1);
},
    loadData: async function(page) {
        TableLoader.show('#roadmap-trash-table-body');
        const keySearch = $('#trashKeySearch').val() || "";
        const teacherId = $('#filterTeacherId').val() || 0;
        const pageSize = RoadMap.config.pageSize || 10;
        const url = `${RoadMap.config.apiUrl}/list-deleted?page=${page}&pageSize=${pageSize}&keySearch=${encodeURIComponent(keySearch)}&teacherId=${teacherId}`;

        try {
            const token = localStorage.getItem("jwt_token");
            const response = await fetch(url, {
                headers: { "Authorization": "Bearer " + token }
            });
            const res = await response.json();

            if (res.success || res.Success) {
                this.renderTable(res.data || res.Data);
                this.showPaging(res.total || res.Total, page);
            }
        } catch (error) {
            console.error("Lỗi load thùng rác lộ trình:", error);
        }
    },

    renderTable: function(data) {
        const tbody = document.getElementById('roadmap-trash-table-body');
        if (!tbody) return;

        let html = '';
        if (!data || data.length === 0) {
            html = '<tr><td colspan="5" class="text-center py-5 text-muted">Thùng rác lộ trình trống</td></tr>';
        } else {
            data.forEach(item => {
                // Ưu tiên hiển thị ngày xóa từ updatedAt vì bác đã xác nhận dùng field này
                const deleteDate = item.updatedAt || item.deletedAt;
                const formattedDate = deleteDate ? new Date(deleteDate).toLocaleDateString('vi-VN') : 'Vừa xong';

                html += `
                <tr>
                  <td class="ps-4">
                        <input class="form-check-input item-check" type="checkbox" value="${item.id}">
                    </td>
                    <td class="ps-4">
                        <img src="${item.thumbnailUrl || '/assets/img/default-roadmap.png'}" class="roadmap-img shadow-sm">
                    </td>
                    <td>
                        <div class="fw-bold text-dark">${item.title}</div>
                        <small class="text-muted">ID: #${item.id}</small>
                    </td>
                    <td class="text-center">
                        <span class="badge bg-light text-primary border px-3">
                            ${item.courseCount || 0} khóa học
                        </span>
                    </td>
                    <td><span class="text-danger small fw-bold">${formattedDate}</span></td>
                    <td class="text-center">
                        <button class="btn-action btn-restore me-1" onclick="RoadMap.trash.restore(${item.id})" title="Khôi phục">
                            <i class="bi bi-arrow-counterclockwise"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="RoadMap.trash.hardDelete(${item.id})" title="Xóa vĩnh viễn">
                            <i class="bi bi-trash3-fill"></i>
                        </button>
                    </td>
                </tr>`;
            });
        }
        tbody.innerHTML = html;
    },
restore: function(id) {
        Swal.fire({
            title: 'Khôi phục lộ trình?',
            text: "Lộ trình này sẽ quay lại danh sách hiển thị chính.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Đồng ý',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // KHÓA MÀN HÌNH BẢO VỆ TIẾN TRÌNH KHÔI PHỤC ĐƠN LẺ
                    GlobalLoader.show();

                    const token = localStorage.getItem("jwt_token");
                    const response = await fetch(`${RoadMap.config.apiUrl}/restore/${id}`, { 
                        method: 'POST',
                        headers: { "Authorization": "Bearer " + token }
                    });
                    const res = await response.json();
                    
                    if (res.success || res.Success) {
                        Toast.fire({ icon: 'success', title: 'Đã khôi phục lộ trình thành công.' });
                        this.loadData(1);
                    } else {
                        Toast.fire({ icon: 'error', title: res.message || 'Khôi phục lộ trình thất bại!' });
                    }
                } catch (err) {
                    console.error(err);
                    Toast.fire({ icon: 'error', title: 'Không thể kết nối máy chủ lúc này.' });
                } finally {
                    GlobalLoader.hide();
                }
            }
        });
    },

    restoreBulk: function() {
        const ids = this.getSelectedIds();
        if (ids.length === 0) return;

        Swal.fire({
            title: `Khôi phục ${ids.length} lộ trình?`,
            text: "Các lộ trình được chọn sẽ hoạt động trở lại bình thường.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1976d2',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Đồng ý khôi phục',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // KHÓA MÀN HÌNH KHÔI PHỤC HÀNG LOẠT
                    GlobalLoader.show();

                    const response = await fetch(`${RoadMap.config.apiUrl}/restore-bulk`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + localStorage.getItem("jwt_token")
                        },
                        body: JSON.stringify(ids)
                    });

                    const res = await response.json();
                    const isSuccess = res.success || res.Success;

                    if (isSuccess) {
                        Toast.fire({ 
                            icon: 'success', 
                            title: res.message || `Đã khôi phục thành công ${ids.length} lộ trình.` 
                        });
                        if (typeof RoadMap.uncheckAll === 'function') RoadMap.uncheckAll(); 
                        this.loadData(1);    
                    } else {
                        Toast.fire({ icon: 'error', title: res.message || 'Khôi phục hàng loạt thất bại!' });
                    }
                } catch (error) {
                    console.error("Lỗi restore hàng loạt:", error);
                    Toast.fire({ icon: 'error', title: 'Không thể kết nối đến máy chủ.' });
                } finally {
                    GlobalLoader.hide();
                }
            }
        });
    },

    deleteBulk: function() {
        const ids = this.getSelectedIds();
        if (ids.length === 0) return;

        Swal.fire({
            title: `Xóa vĩnh viễn ${ids.length} lộ trình?`,
            text: "Dữ liệu lộ trình sẽ bị xóa sạch hoàn toàn, hành động này không thể hoàn tác!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Xóa sạch ngay',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // KHÓA MÀN HÌNH XÓA VĨ NH VIỄN HÀNG LOẠT
                    GlobalLoader.show();

                    const response = await fetch(`${RoadMap.config.apiUrl}/hard-delete-bulk`, {
                        method: 'DELETE', 
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + localStorage.getItem("jwt_token")
                        },
                        body: JSON.stringify(ids)
                    });
                    const res = await response.json();
                    
                    if (res.success || res.Success) {
                        Toast.fire({ icon: 'success', title: res.message || `Đã xóa vĩnh viễn ${ids.length} lộ trình thành công.` });
                        if (typeof RoadMap.uncheckAll === 'function') RoadMap.uncheckAll(); 
                        this.loadData(1);
                    } else {
                        Toast.fire({ icon: 'error', title: res.message || 'Xóa vĩnh viễn hàng loạt thất bại!' });
                    }
                } catch (error) {
                    console.error("Lỗi xóa hàng loạt vĩnh viễn:", error);
                    Toast.fire({ icon: 'error', title: 'Không thể kết nối đến máy chủ.' });
                } finally {
                    GlobalLoader.hide();
                }
            }
        });
    },

    hardDelete: function(id) {
        Swal.fire({
            title: 'Xóa vĩnh viễn lộ trình?',
            text: "Dữ liệu lộ trình sẽ bị xóa sạch khỏi hệ thống và không thể khôi phục!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Xóa ngay',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // KHÓA MÀN HÌNH BAO PHỦ XÓA VĨ NH VIỄN ĐƠN LẺ
                    GlobalLoader.show();

                    const token = localStorage.getItem("jwt_token");
                    const response = await fetch(`${RoadMap.config.apiUrl}/hard-delete/${id}`, { 
                        method: 'DELETE',
                        headers: { "Authorization": "Bearer " + token }
                    });
                    const res = await response.json();
                    
                    if (res.success || res.Success) {
                        Toast.fire({ icon: 'success', title: res.message || 'Lộ trình đã bị xóa vĩnh viễn.' });
                        this.loadData(1);
                    } else {
                        Toast.fire({ icon: 'error', title: res.message || 'Có lỗi xảy ra khi xóa.' });
                    }
                } catch (err) {
                    console.error(err);
                    Toast.fire({ icon: 'error', title: 'Mất kết nối server hệ thống.' });
                } finally {
                    GlobalLoader.hide();
                }
            }
        });
    },

        getSelectedIds: function() {
            return Array.from($('.item-check:checked')).map(cb => parseInt($(cb).val()));
        },
    showPaging: function(totalCount, currentPage) {
        const pageSize = RoadMap.config.pageSize || 10;
        const totalPages = Math.ceil(totalCount / pageSize);
        $('#paging-ul').twbsPagination('destroy');
        if (totalPages > 0) {
            $('#paging-ul').twbsPagination({
                totalPages: totalPages,
                startPage: currentPage,
                visiblePages: 5,
                first: 'Đầu',
                last: 'Cuối',
                prev: 'Trước',
                next: 'Sau',
                onPageClick: (event, page) => { 
                    if (page !== currentPage) this.loadData(page); 
                }
            });
        }
    },
    loadTeacherSelect: async function() {
        const token = localStorage.getItem("jwt_token");
        try {
            const response = await fetch(`http://127.0.0.1:5000/api/course/get-all-teachers`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const res = await response.json();
            if (res.success || res.Success) {
                let html = '<option value="0">Tất cả giảng viên</option>';
                const teachers = res.data || res.Data;
                teachers.forEach(t => {
                    html += `<option value="${t.id}">${t.fullName}</option>`;
                });
                $('#filterTeacherId').html(html);
            }
        } catch (error) { console.error("Lỗi load giảng viên:", error); }
    },
}
}
