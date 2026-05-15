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
        
        if (userInfoRaw) {
            const user = JSON.parse(userInfoRaw);
            const roleId = user.role; // 1: Admin, 3: Teacher
            this.renderHeader(roleId);
            this.registerEvents();
            if (roleId === 1) {
                $('#adminFilterGroup').removeClass('d-none'); 
                this.loadTeacherSelect(); 
            } else {
                $('#adminFilterGroup').remove(); 
            }

            // 3. Load dữ liệu trang đầu tiên
            this.loadData(1);
        } else {
            window.location.href = "/login.html";
        }
    },
    registerCheckboxEvents: function () {
        const _this = this;

        $(document).off('change', '#check-all').on('change', '#check-all', function () {
            const isChecked = $(this).prop('checked');
            $('.item-check').prop('checked', isChecked);
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
        const selectedCount = $('.item-check:checked').length;
        const $bulkArea = $('#bulk-actions');
        const $countDisplay = $('#selected-count');

        if (selectedCount > 0) {
            $countDisplay.text(selectedCount);
            $bulkArea.css({ 'visibility': 'visible', 'opacity': '1' });
        } else {
            $bulkArea.css('opacity', '0');
            setTimeout(() => {
                if ($('.item-check:checked').length === 0) {
                    $bulkArea.css('visibility', 'hidden');
                }
            }, 200);
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
        debugger
    const userInfoRaw = localStorage.getItem("user_info");
    const user = JSON.parse(userInfoRaw);
    const roleId = user.role;
    
    // 1. Khởi tạo Object chứa param
   let queryParams = {
        page: page,
        pageSize: this.config.pageSize || 10,
        // Lấy giá trị từ ID chung trong HTML
        keySearch: $('#keySearch').val() || '',
        isActive: $('#isActive').val() || -1
    };

    // Nếu là ADMIN thì mới lấy thêm giá trị của filter giảng viên
    if (roleId === 1) { 
        queryParams.teacherId = $('#filterTeacherId').val() || 0;
    }

    // 3. Chuyển Object thành chuỗi: page=1&pageSize=10...
    const params = new URLSearchParams(queryParams);

    try {
        const token = localStorage.getItem("jwt_token");
        const response = await fetch(`${this.config.apiUrl}/list-data?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
        if (response.status === 401) return window.location.href = "/login.html";
        
        const res = await response.json();

        if (res.success || res.Success) {
            const listData = res.data || res.Data;
            const totalCount = res.total || res.Total;
            const totalPages = Math.ceil(totalCount / queryParams.pageSize);
            this.renderTable(listData, roleId);
            this.showPaging(totalCount, totalPages, page);
        }
    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu:", error);
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
                <input class="form-check-input item-check" type="checkbox" value="${item.id}" style="cursor: pointer;">
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
                    <div class="text-muted" style="font-size:0.7rem">ID: ${item.teacherId}</div>
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
        const response = await fetch(`${this.config.apiUrl}/${id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem("jwt_token")}` }
        });
        
        const res = await response.json();
        const item = res.data || res.Data || res;

        if (item && (item.id || item.Id)) {
            // Đổ dữ liệu
            $('#detail-img').attr('src', item.thumbnailUrl || item.ThumbnailUrl || 'https://via.placeholder.com/400x600');
            $('#detail-title').text(item.title || item.Title);
            $('#detail-id').text(`ID: #${item.id || item.Id}`);
            const createdDate = item.createdAt || item.CreatedAt;
            const formattedDate = createdDate 
                ? new Date(createdDate).toLocaleDateString('vi-VN', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                  }) 
                : 'Đang cập nhật...';
                $('#detail-created-at').html(`<i class="bi bi-calendar-event me-2 text-primary"></i>${formattedDate}`);
            $('#detail-desc').text(item.description || 'Chưa có mô tả chi tiết.');

            const isLocked = (item.lockedByRole || item.LockedByRole) === 'Admin';
            const isActive = item.isActive !== undefined ? item.isActive : item.IsActive;

            if (isLocked) {
                // HIỆN OVERLAY DANGER VÀ BADGE ĐỎ
                $('#danger-overlay').removeClass('d-none');
                $('#detail-status').html('<span class="badge-status bg-danger-soft">Niêm phong</span>');
                $('#detail-lock-alert').html(`
                    <div class="alert alert-danger border-0 d-flex align-items-center mb-0" style="border-radius: 12px;">
                        <i class="bi bi-exclamation-octagon-fill fs-4 me-3"></i>
                        <div class="small fw-bold">Lộ trình này đã bị Admin niêm phong. Bạn không thể chỉnh sửa nội dung.</div>
                    </div>
                `);
            } else {
                // ẨN OVERLAY VÀ HIỆN STATUS THƯỜNG
                $('#danger-overlay').addClass('d-none');
                let statusHtml = isActive ? 
                    '<span class="badge-status bg-success-soft">Hoạt động</span>' : 
                    '<span class="badge-status bg-secondary-soft">Tạm ẩn</span>';
                $('#detail-status').html(statusHtml);
                $('#detail-lock-alert').empty();
            }

            const myModal = new bootstrap.Modal(document.getElementById('modalDetail'));
            myModal.show();
        }
    } catch (error) {
        console.error("Lỗi:", error);
    }
},
toggleStatus: function (id) {
        // Lấy thông tin user từ localStorage để xác định Role
        const userInfo = JSON.parse(localStorage.getItem("user_info"));
        if (!userInfo) {
            Swal.fire('Cảnh báo', 'Vui lòng đăng nhập để thực hiện!', 'warning');
            return;
        }

        // Chuyển đổi mã Role sang String để khớp với logic Backend (1: Admin, 2: Teacher)
        const roleName = userInfo.role === 1 ? "Admin" : "Teacher";

        Swal.fire({
            title: 'Xác nhận thay đổi?',
            text: "Bạn có chắc chắn muốn thay đổi trạng thái hiển thị của lộ trình này?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Đồng ý',
            cancelButtonText: 'Hủy'
        }).then((result) => {
            if (result.isConfirmed) {
                // Gọi API Put
                $.ajax({
                    url: `${RoadMap.config.apiUrl}/toggle-status/${id}?role=${roleName}`,
                    type: 'PUT',
                    contentType: 'application/json',
                    success: function (res) {
                        if (res.success) {
                            Swal.fire('Thành công!', res.message, 'success');
                            RoadMap.loadData(1); 
                        }
                    },
                    error: function (err) {
                        // Hiển thị lỗi từ BadRequest (Ví dụ: Teacher bị chặn)
                        const errMsg = err.responseJSON ? err.responseJSON : err.responseText;
                        Swal.fire('Thao tác thất bại', errMsg, 'error');
                    }
                });
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
    const formData = new FormData(form[0]);
    const isActive = $('#txtIsActive').is(':checked'); 
    formData.set('IsActive', isActive);

    Swal.fire({
        title: 'Đang xử lý...',
        text: 'Vui lòng chờ trong giây lát khi hệ thống tải ảnh lên Cloud',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading(); 
        }
    });
    btnSave.prop('disabled', true);

    try {
        // Lấy token từ localStorage (Bác nhớ kiểm tra đúng tên key "jwt_token" nhé)
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

        Swal.fire({
            icon: 'success',
            title: 'Thành công!',
            text: response.message || "Lộ trình đã được tạo thành công",
            timer: 2000,
            showConfirmButton: false
        });

        $('#roadmapModal').modal('hide'); 
        RoadMap.loadData(1); 
        form[0].reset(); // Xóa trắng form sau khi thêm thành công

    } catch (error) {
        console.error("Lỗi:", error);
        Swal.fire({
            icon: 'error',
            title: 'Thất bại!',
            text: error.responseJSON?.message || "Phiên đăng nhập hết hạn hoặc lỗi hệ thống!"
        });
    } finally {
        btnSave.prop('disabled', false);
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
    const formData = new FormData($('#roadmapForm')[0]);
    debugger
    formData.set('IsActive', $('#txtIsActive').is(':checked'));

    Swal.fire({
        title: 'Đang cập nhật...',
        text: 'Hệ thống đang lưu thay đổi',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const response = await $.ajax({
            url: `${RoadMap.config.apiUrl}/${id}`, // URL kèm ID
            type: 'PUT', // Cập nhật dùng PUT
            data: formData,
            processData: false,
            contentType: false,
        });

        Swal.fire({ icon: 'success', title: 'Thành công!', text: 'Đã cập nhật thay đổi', timer: 1500, showConfirmButton: false });
        $('#roadmapModal').modal('hide');
        RoadMap.loadData(1); 
    } catch (error) {
        Swal.fire('Lỗi!', error.responseJSON?.message || "Không thể cập nhật", 'error');
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
delete: async function(id){
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
            const res = await $.ajax({
                url: `${RoadMap.config.apiUrl}/${id}`,
                type: "DELETE"
            });
            Swal.fire("Thành công!", res.message || "Đã xóa lộ trình.", "success");
            RoadMap.loadData(1);

        } catch (error) {
            console.error("Lỗi khi xóa:", error);
            Swal.fire("Lỗi!", "Không thể xóa bản ghi này.", "error");
        }
    }
},
changeStatus: async function(id) { 
    try {
        const response = await $.ajax({
            url: `${RoadMap.config.apiUrl}/${id}/status`, 
            type: 'PATCH',
        });
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
        });
        Toast.fire({
            icon: 'success',
            title: response.message 
        });

        RoadMap.loadData(1); 

    } catch (error) {
        const errorMsg = error.responseJSON?.message || 'Không đổi được trạng thái bác ơi!';
        Swal.fire('Lỗi!', errorMsg, 'error');
        
        RoadMap.loadData(1);
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
    const ids = $('.item-check:checked').map(function() { 
        return parseInt($(this).val()); 
    }).get();
    
    if (ids.length === 0) return;

    Swal.fire({
        title: `Xóa ${ids.length} lộ trình?`,
        text: "Các lộ trình này sẽ được chuyển vào thùng rác!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Hủy',
        showLoaderOnConfirm: true, 
        preConfirm: async () => {
            try {
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
                return res;
            } catch (error) {
                Swal.showValidationMessage(`Lỗi: ${error.message}`);
            }
        },
        allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
        // Kiểm tra result.value tồn tại (dữ liệu trả về từ preConfirm)
        if (result.isConfirmed && result.value) {
            
            // Check cả Success (C# mặc định) và success (JSON camelCase)
            const isSuccess = result.value.Success || result.value.success;

            if (isSuccess) {
                // Hiển thị thông báo Toast
                if (typeof Toast !== 'undefined') {
                    Toast.fire({
                        icon: 'success',
                        title: result.value.Message || result.value.message || 'Thành công!'
                    });
                } else {
                    Toast.fire('Thành công', result.value.Message || 'Đã chuyển vào thùng rác', 'success');
                }

                // Gọi qua object Manager để đảm bảo chính xác context
                RoadMap.uncheckAll(); 
                RoadMap.loadData(1); 
            } else {
                Swal.fire('Thất bại', result.value.Message || result.value.message || 'Có lỗi xảy ra', 'error');
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
            confirmButtonText: 'Đồng ý',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem("jwt_token");
                    const response = await fetch(`${RoadMap.config.apiUrl}/restore/${id}`, { 
                        method: 'POST',
                        headers: { "Authorization": "Bearer " + token }
                    });
                    const res = await response.json();
                    if (res.success || res.Success) {
                        Swal.fire('Thành công!', 'Đã khôi phục lộ trình.', 'success');
                        this.loadData(1);
                    }
                } catch (err) {
                    Swal.fire('Lỗi', 'Không thể kết nối máy chủ', 'error');
                }
            }
        });
    },
restoreBulk: function() {
    const ids = this.getSelectedIds();
    if (ids.length === 0) return;

    Swal.fire({
        title: `Khôi phục ${ids.length} khóa học?`,
        text: "Các lộ trình được chọn sẽ hoạt động trở lại bình thường.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#1976d2',
        confirmButtonText: 'Đồng ý khôi phục',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch(`${RoadMap.config.apiUrl}/restore-bulk`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem("jwt_token") // Thêm token nếu cần
                    },
                    body: JSON.stringify(ids)
                });

                const res = await response.json();
                const isSuccess = res.success || res.Success;
                const apiMessage = res.message || res.Message;

                if (isSuccess) {
                    Toast.fire({ 
                        icon: 'success', 
                        title: apiMessage || `Đã khôi phục thành công ${ids.length} lộ trình.` 
                    });
                    RoadMap.uncheckAll(); 
                    this.loadData(1);    
                } else {
                    // Hiển thị lỗi trực tiếp từ Backend
                    Toast.fire('Thất bại!', apiMessage || 'Có lỗi xảy ra.', 'error');
                }
            } catch (error) {
                console.error("Lỗi restore hàng loạt:", error);
                Toast.fire('Lỗi!', 'Không thể kết nối đến máy chủ.', 'error');
            }
        }
    });
},
        deleteBulk: function() {
            const ids = this.getSelectedIds();
            if (ids.length === 0) return;

            Swal.fire({
                title: `Xóa vĩnh viễn ${ids.length} mục?`,
                text: "Dữ liệu lộ trình sẽ bị xóa sạch hoàn toàn, hành động này không thể hoàn tác!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'Xóa sạch ngay',
                cancelButtonText: 'Hủy'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const response = await fetch(`${RoadMap.config.apiUrl}/hard-delete-bulk`, {
                            method: 'DELETE', 
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(ids)
                        });
                        const res = await response.json();
                        if (res.success || res.Success) {
                            Toast.fire({ icon: 'success', title: `Đã xóa vĩnh viễn ${ids.length} mục.` });
                            this.loadData(1);
                        } else {
                            Toast.fire('Thất bại!', res.message || 'Có lỗi xảy ra.', 'error');
                        }
                    } catch (error) {
                        console.error("Lỗi xóa hàng loạt:", error);
                        Toast.fire('Lỗi!', 'Không thể kết nối đến máy chủ.', 'error');
                    }
                }
            });
        },

        getSelectedIds: function() {
            return Array.from($('.item-check:checked')).map(cb => parseInt($(cb).val()));
        },
    hardDelete: function(id) {
        Swal.fire({
            title: 'Xóa vĩnh viễn?',
            text: "Dữ liệu lộ trình sẽ bị xóa sạch khỏi hệ thống và không thể khôi phục!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Xóa ngay',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem("jwt_token");
                    const response = await fetch(`${RoadMap.config.apiUrl}/hard-delete/${id}`, { 
                        method: 'DELETE',
                        headers: { "Authorization": "Bearer " + token }
                    });
                    const res = await response.json();
                    if (res.success || res.Success) {
                        Swal.fire('Đã xóa!', 'Lộ trình đã bị xóa vĩnh viễn.', 'success');
                        this.loadData(1);
                    } else {
                        Swal.fire('Thất bại!', res.message || 'Có lỗi xảy ra.', 'error');
                    }
                } catch (err) {
                    Swal.fire('Lỗi', 'Không thể kết nối máy chủ', 'error');
                }
            }
        });
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
