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
var Course = {
    categories: [],
    addedDetails: [], // Mảng chứa các object { content, detailType }
    editDetails: [],
    config: {
        pageSize: 10,
        apiUrl: "http://127.0.0.1:5000/api/course"
    },
    CourseLevel : {
        0: "Người mới bắt đầu",
        1: "Trung cấp",
        2: "Nâng cao"
    },
    // 1. Hàm khởi tạo chính
    init: function () {
        debugger
        const userInfoRaw = localStorage.getItem("user_info");
        if (userInfoRaw) {
            const user = JSON.parse(userInfoRaw);
            const roleId = user.role; // 1: Admin, 3: Teacher

            // Hiển thị Header bảng và Section lọc tương ứng
            this.renderHeader(roleId);

            if (roleId === 1) {
                $('#admin-section').show();
                $('#teacher-section').remove();
                this.loadTeacherSelect(); // Chỉ Admin mới load list giảng viên
            } else if (roleId === 3) {
                $('#teacher-section').show();
                $('#admin-section').remove();
            }
        } else {
            // Nếu chưa login thì đá về trang chủ hoặc login
            window.location.href = "/pages/auth/login.html";
            return;
        }

        this.loadData(1);
        this.registerEvents();
        this.loadCategories();
        this.renderLevelDropdown();
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
    },
    toggleBulkActions: function () {
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
        // 1. Sự kiện Lọc/Tìm kiếm
        $('#btnSearch').off('click').on('click', function () {
            Course.loadData(1);
        });

        // 2. Tách riêng sự kiện change thumbnail
        $(document).off('change', '#editFileThumbnail').on('change', '#editFileThumbnail', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => $('#editImgPreview').attr('src', e.target.result);
                reader.readAsDataURL(file);
            }
        });

        // 3. Sự kiện Submit Form Edit
        $('#frmUpdateCourse').off('submit').on('submit', function(e) {
            e.preventDefault();
            Course.edit(); 
        });

    },


loadTeacherSelect: async function() {
        const token = localStorage.getItem("jwt_token");
        try {
            const response = await fetch(`${this.config.apiUrl}/get-all-teachers`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const res = await response.json();
            if (res.success || res.Success) {
                let html = '<option value="0">Tất cả giảng viên</option>';
                const teachers = res.data || res.Data;
                teachers.forEach(t => {
                    html += `<option value="${t.id}">${t.fullName}</option>`;
                });
                $('#adminFilterTeacher').html(html);
            }
        } catch (error) { console.error("Lỗi load giảng viên:", error); }
    },

    // 3. Lấy dữ liệu khóa học từ Server
    loadData: async function(page) {
        const userInfoRaw = localStorage.getItem("user_info");
        const user = JSON.parse(userInfoRaw);
        const roleId = user.role;

        let queryParams = {
            page: page,
            pageSize: this.config.pageSize
        };

        // Lấy dữ liệu từ các ô Input khớp với ID trong HTML của bác
        if (roleId === 1) { // ADMIN
            queryParams.keySearch = $('#adminKeySearch').val() || '';
            queryParams.teacherId = $('#adminFilterTeacher').val() || 0;
            queryParams.fromDate = $('#adminFromDate').val() || '';
            queryParams.toDate = $('#adminToDate').val() || '';
            queryParams.isActive = $('#adminIsActive').val() || -1;
            queryParams.categoryId = $('#adminFilterCategory').val() || 0;
        } else { // TEACHER
            queryParams.keySearch = $('#teacherKeySearch').val() || '';
            queryParams.isActive = $('#teacherIsActive').val() || -1;
            queryParams.categoryId = $('#teacherFilterCategory').val() || 0
        }

        const params = new URLSearchParams(queryParams);

        try {
            const token = localStorage.getItem("jwt_token"); 
            const response = await fetch(`${this.config.apiUrl}/list-data?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) return window.location.href = "/pages/auth/login.html";
            
            const res = await response.json();
            if (res.success || res.Success) {
                const listData = res.data || res.Data;
                const totalCount = res.total || res.Total;
                const totalPages = Math.ceil(totalCount / this.config.pageSize);
                
                this.renderTable(listData, roleId);
                this.showPaging(totalCount, totalPages, page);
                $('#total-records').text(totalCount);
            }
        } catch (error) { console.error("Lỗi load data:", error); }
    },
 renderLevelDropdown : function() {
    let html = '';
    for (let key in Course.CourseLevel) {
        html += `<option value="${key}">${Course.CourseLevel[key]}</option>`;
    }
    $('#txtLevel').append(html);
    $('#editDdlLevel').append(html);
    
},
renderHeader: function(roleId) {
        let html = `
            <tr>
            ${roleId === 3 ? '<th class="ps-4" style="width: 50px;"><input class="form-check-input" type="checkbox" id="check-all"></th>' : ''}
                <th class="ps-4" style="width: 80px;">Ảnh</th>
                <th>Tiêu đề</th>
                ${roleId === 1 ? '<th>Giảng viên</th>' : ''}
                <th>Danh mục</th>
                <th>Trình độ</th>
                <th class="text-center">Chương</th>
                <th>Giá</th>
                <th class="text-center">Trạng thái</th>
                <th class="text-center">Hành động</th>
            </tr>`;
        $('#table-head').html(html);
    },

    // 5. Render nội dung bảng
renderTable: function (data, roleId) {
    let html = '';
    
    if (!data || data.length === 0) {
        html = `<tr><td colspan="10" class="text-center py-4 text-muted">Không tìm thấy khóa học nào</td></tr>`;
    } else {
        data.forEach(item => {
            const formattedPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price);
            const levelName = this.CourseLevel[item.level] || 'Chưa xác định';
            const isLockedByAdmin = item.lockedByRole === 'Admin';

            html += `
                <tr>
                ${roleId === 3 ? `
                <td class="ps-4">
                    <input class="form-check-input item-check" type="checkbox" value="${item.courseId}">
                </td>` : ''}
                    <td class="ps-4">
                        <img src="${item.thumbnailUrl || '../assets/img/default.png'}" style="width:70px; height:45px; object-fit:cover; border-radius:8px">
                    </td>
                    <td>
                        <div class="fw-bold text-dark">${item.title}</div>
                        <small class="text-muted">ID: ${item.courseId}</small>
                    </td>
                    
                    ${roleId === 1 ? `<td><div class="small fw-bold">${item.instructorName || 'Chưa rõ'}</div><small class="text-muted">ID: ${item.instructorId}</small></td>` : ''}
                    
                    <td><span class="badge bg-light text-primary border">${item.categoryName || 'N/A'}</span></td>

                   <td><span class="small text-secondary"><i class="bi bi-bar-chart-fill me-1"></i>${levelName}</span></td>

                    <td class="text-center"><div class="fw-bold">${item.totalChapters || 0}</div></td>
                    <td class="fw-bold text-danger">${item.price === 0 ? 'Miễn phí' : formattedPrice}</td>
                    
<td class="text-center">
    <button class="btn btn-sm px-3 py-1 rounded-pill fw-bold shadow-sm transition-all
            ${isLockedByAdmin ? 'btn-outline-danger' : (item.isActive ? 'btn-light-success text-success border-success' : 'btn-light-secondary text-secondary border-secondary')} 
            ${roleId !== 1 && isLockedByAdmin ? 'opacity-50' : ''}" 
            style="min-width: 110px; font-size: 0.75rem; border: 1.5px solid !important; line-height: 1.2;"
            onclick="${roleId !== 1 && isLockedByAdmin 
                ? "Swal.fire({icon: 'error', title: 'Bị chặn', text: 'Khóa học này đã bị Admin niêm phong!', confirmButtonColor: '#d33'})" 
                : `Course.toggleStatus(${item.courseId})`}"
            ${roleId !== 1 && isLockedByAdmin ? 'disabled' : ''}>
        
        <i class="bi ${isLockedByAdmin ? 'bi-shield-lock-fill' : (item.isActive ? 'bi-check-circle-fill' : 'bi-pause-circle-fill')} me-1"></i>
        <span>${isLockedByAdmin ? 'Niêm phong' : (item.isActive ? 'Hoạt động' : 'Tạm ẩn')}</span>
    </button>
</td>

                    <td class="text-center">
                        <div class="d-flex justify-content-center gap-2">
                            <button class="btn btn-sm btn-outline-info" onclick="Course.detail(${item.courseId})" title="Xem chi tiết"><i class="bi bi-eye"></i></button>
                            <button class="btn btn-sm btn-outline-primary" onclick="chapter.openModal(${item.courseId})" title="Quản lý bài học"><i class="bi bi-journal-text"></i></button> 
                            <button class="btn btn-sm btn-outline-warning" onclick="Course.openUpdateModal(${item.courseId})" title="Chỉnh sửa"><i class="bi bi-pencil-square"></i></button>
                            
                            ${roleId === 3 ? `
                                <button class="btn btn-sm btn-outline-danger ${isLockedByAdmin ? 'opacity-50' : ''}" 
                                         onclick="${isLockedByAdmin ? "Swal.fire('Bị chặn', 'Khóa học đang bị niêm phong, không thể xóa lúc này!', 'warning')" : `Course.delete(${item.courseId})`}" 
                                         ${isLockedByAdmin ? 'disabled' : ''}
                                         title="Xóa tạm">
                                    <i class="bi bi-trash3-fill"></i>
                                </button>
                            ` : ``}
                        </div>
                    </td>
                </tr>`;
        });
    }
    $('#course-table-body').html(html);
},

    openCreateModal: function(){
        $('#frmCourse')[0].reset();
        // Course.addedDetails=[];
        // Course.renderDetails();
        $('#courseModal').modal('show');
    },
    
loadCategories: async function () {
    if (Array.isArray(Course.categories) && Course.categories.length > 0) {
        return; 
    }

    try {
        const response = await fetch(`http://127.0.0.1:5000/api/Category`);
        const result = await response.json(); 
        Course.categories = result.data || []; 

        let filterHtml = '<option value="0">Tất cả danh mục</option>'; // Để value 0 cho đồng bộ với các filter khác
        let modalHtml = '<option value="">-- Chọn danh mục --</option>';

        Course.categories.forEach(item => {
            const option = `<option value="${item.id}">${item.name}</option>`;
            filterHtml += option;
            modalHtml += option;
        });
        const userInfo = JSON.parse(localStorage.getItem("user_info"));
        if (userInfo.role === 1) {
            $('#adminFilterCategory').html(filterHtml);
        } else {
            $('#teacherFilterCategory').html(filterHtml);
        }

        // Các select trong Modal (thêm/sửa) thì luôn cần đổ vào
        $('#ddlCategoryId').html(modalHtml);
        $('#editDdlCategoryId').html(modalHtml);

    } catch (error) {
        console.error("Lỗi load danh mục:", error);
    }
},
create: async function() {
    var form = $('#frmCourse')[0];
    var formData = new FormData(form); // Nó sẽ tự động hốt 'ThumbnailFile' vì đã có name
    if (Course.addedDetails && Course.addedDetails.length > 0) {
            Course.addedDetails.forEach((item, index) => {
                formData.append(`CourseDetails[${index}].Content`, item.content);
                formData.append(`CourseDetails[${index}].DetailType`, item.detailType);
            });
        }
    // Checkbox vẫn phải set thủ công vì nó không tự lấy true/false
    formData.set('IsActive', $('#txtIsActive').is(':checked'));
    Swal.fire({
            title: 'Đang xử lý...',
            text: 'Vui lòng chờ trong giây lát khi hệ thống tải ảnh lên Cloud',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading(); // Hiển thị spinner quay quay của SweetAlert2
            }
        });
        const btnSave = $('#btnSave');
        btnSave.prop('disabled', true);
    try {
        const response = await $.ajax({
            url: Course.config.apiUrl,
            type: 'POST',
            data: formData,
            processData: false, // Bắt buộc
            contentType: false,  // Bắt buộc
        });

        Swal.fire({
            icon: 'success',
            title: 'Thành công!',
            text: response.message || "Khóa học đã được lưu",
            timer: 2000,
            showConfirmButton: false
        });
        $('#courseModal').modal('hide');
        Course.loadData(1);
        form.reset();
        $('#imgPreview').hide();
        Course.addedDetails = []; 
        $('#listDetails').html('<li class="list-group-item small text-muted text-center py-3">Chưa có chi tiết nào</li>');
        // ... reload data
    } catch (error) {
        if (error.responseJSON) {
            // Lỗi từ Server (400, 500...)
            console.error("Lỗi từ Server:", error.responseJSON);
            Swal.fire('Lỗi API', JSON.stringify(error.responseJSON.errors), 'error');
        } else {
            // Lỗi Logic JS (Ví dụ sai tên biến)
            console.error("Lỗi Logic JS:", error.message);
            Swal.fire('Lỗi hệ thống', 'Có lỗi xảy ra trong mã xử lý giao diện.', 'error');
        }
    }
    finally {
        btnSave.prop('disabled', false); 
    }
},
    openUpdateModal: async function(id) {
    try {
        const response = await fetch(`${this.config.apiUrl}/${id}`);
        if (!response.ok) throw new Error('Không lấy được dữ liệu');
        const res = await response.json();
        const item = res.data || res;

        // Kiểm tra trạng thái niêm phong
        const isLockedByAdmin = item.lockedByRole === 'Admin';

        // Đổ dữ liệu vào các field cơ bản
        $('#editCourseId').val(item.courseId);
        $('#editTxtTitle').val(item.title);
        $('#editTxtDescription').val(item.description || 'Không có mô tả');
        $('#editDdlCategoryId').val(item.categoryId);
        $('#editTxtPrice').val(item.price);
        $('#editDdlLevel').val(item.level);

        // --- XỬ LÝ TRẠNG THÁI ---
        const checkbox = $('#editTxtIsActive');
        checkbox.prop('checked', item.isActive);

        // Nếu Admin khóa thì disable checkbox, không cho Teacher tự ý mở lại
        if (isLockedByAdmin) {
            checkbox.prop('disabled', true);
            $('#editLblStatus')
                .text('Đang bị Admin Niêm phong')
                .removeClass('text-success')
                .addClass('text-danger fw-bold');
            
            // Hiện thông báo cảnh báo trong Modal
            if ($('#lockAlert').length === 0) {
                $('#updateCourseModal .modal-body').prepend(`
                    <div id="lockAlert" class="alert alert-warning small py-2">
                        <i class="bi bi-shield-lock-fill me-1"></i> 
                        Khóa học này đang bị Admin niêm phong. Bạn chỉ có thể chỉnh sửa nội dung, không thể thay đổi trạng thái hoạt động.
                    </div>
                `);
            }
        } else {
            checkbox.prop('disabled', false);
            $('#lockAlert').remove(); // Xóa cảnh báo nếu khóa học bình thường
            
            const label = $('#editLblStatus');
            if (item.isActive) {
                label.text('Đang Hoạt động').removeClass('text-danger').addClass('text-success');
            } else {
                label.text('Đang Tạm ẩn').removeClass('text-success').addClass('text-danger');
            }
        }
        Course.editDetails = (item.courseDetails || []).map(d => ({
            content: d.content,
            detailType: d.detailType
        }));
        Course.renderDetails('edit');

        // Xử lý ảnh (như cũ của bác)
        let thumb = item.thumbnailUrl;
        if (!thumb || thumb === "ok") thumb = "https://placehold.co/400x250?text=No+Thumbnail";
        $('#editImgPreview').attr('src', thumb);

        $('#updateCourseModal').modal('show');
    } catch (error) {
        console.error("Lỗi khi load modal:", error);
        alert("Có lỗi xảy ra khi lấy thông tin khóa học.");
    }
},
  edit: async function() {
    const courseId = $('#editCourseId').val(); // Lấy ID chuẩn
    console.log("Đang gửi ID lên URL:", courseId); // Để bác tự kiểm tra

    var form = $('#frmUpdateCourse')[0];
    var formData = new FormData(form); 

    // 1. Ép kiểu IsActive chuẩn boolean cho C#
    formData.set('IsActive', $('#editTxtIsActive').is(':checked'));
    formData.set('Id', courseId); 
    if (Course.editDetails && Course.editDetails.length > 0) {
        Course.editDetails.forEach((item, index) => {
            formData.append(`CourseDetails[${index}].Content`, item.content);
            formData.append(`CourseDetails[${index}].DetailType`, item.detailType);
        });
    }
    Swal.fire({
        title: 'Đang lưu thay đổi...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const response = await $.ajax({
            // 3. Đảm bảo URL có ID số (Ví dụ: /api/course/5)
            url: `${this.config.apiUrl}/${courseId}`, 
            type: 'PUT',
            data: formData,
            processData: false,
            contentType: false,
        });

        Swal.fire("Thành công!", "Đã cập nhật khóa học", "success");
        $('#updateCourseModal').modal('hide');
        this.loadData(1);

    } catch (error) {
        console.error("Lỗi chi tiết từ Server:", error.responseJSON);
        // Nếu bị lỗi 400, dòng này sẽ hiện đúng cái IsActive hay ID bị lỗi
        let errorDetail = error.responseJSON?.errors 
                          ? JSON.stringify(error.responseJSON.errors) 
                          : "Cập nhật thất bại";
        Swal.fire("Lỗi!", errorDetail, "error");
    }
},
detail: async function(id){
     try {
        const response = await fetch(`${this.config.apiUrl}/${id}`);
        if (!response.ok) throw new Error('Không lấy được dữ liệu');
        const res = await response.json();
        const item = res.data || res;      
        $('#dtlId').text(item.courseId);
        $('#dtlCategory').text(item.categoryName)
        $('#dtlName').text(item.name);
        $('#dtlDescription').text(item.description || 'Chưa có mô tả.');
        $('#dtlDescriptionShort').text(item.description || 'Chưa có tóm tắt.');
        const levelName = Course.CourseLevel[item.level] || 'Chưa xác định';
        $('#dtlLevel').text(levelName);
        let benefitsHtml = '';
        let requirementsHtml = '';
        (item.courseDetails || []).forEach(d => {
            if (d.detailType === 0) { // Lợi ích
                benefitsHtml += `
                    <li class="mb-2 d-flex align-items-start">
                        <i class="bi bi-check2-circle text-success me-2 mt-1"></i>
                        <span>${d.content}</span>
                    </li>`;
            } else { // Yêu cầu
                requirementsHtml += `
                    <li class="mb-2 d-flex align-items-start">
                        <i class="bi bi-info-circle text-warning me-2 mt-1"></i>
                        <span>${d.content}</span>
                    </li>`;
            }
        });
        $('#dtlListBenefits').html(benefitsHtml || '<li class="text-muted italic small">Chưa cập nhật lợi ích</li>');
        $('#dtlListRequirements').html(requirementsHtml || '<li class="text-muted italic small">Không có yêu cầu đặc biệt</li>');
        let chaptersHtml = '';
        const chapters = item.chapters || [];

        if (chapters.length > 0) {
            chapters.forEach((ch, index) => {
                chaptersHtml += `
                    <div class="list-group-item d-flex align-items-center py-3 border-start-0 border-end-0">
                        <span class="badge bg-primary rounded-circle me-3 d-flex align-items-center justify-content-center" 
                            style="width: 28px; height: 28px; font-size: 12px;">
                            ${index + 1}
                        </span>
                        <div class="flex-grow-1">
                            <span class="fw-bold text-dark">${ch.title}</span>
                        </div>
                        <span class="badge bg-light text-secondary border small">Chương ${ch.order || index + 1}</span>
                    </div>`;
            });
        } else {
            chaptersHtml = `
                <div class="text-center p-4">
                    <i class="bi bi-journal-x fs-2 text-muted d-block mb-2"></i>
                    <span class="text-muted small">Chưa có nội dung chương trình học</span>
                </div>`;
        }

        $('#dtlChapterList').html(chaptersHtml);
        $('#dtlChapterCount').text(`${chapters.length} chương`);
        if (item.price === 0) {
            $('#dtlPrice').html('<span class="text-success">Miễn phí</span>');
        } else {
            const formattedPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price);
            $('#dtlPrice').text(formattedPrice);
        }
        let thumb = item.thumbnailUrl;
        if (!thumb) {
            thumb = "https://placehold.co/600x400?text=No+Image";
        }
        $('#dtlThumbnail').attr('src', thumb);
        $('#dtlCreatedAt').text(new Date(item.createAt).toLocaleString('vi-VN'));
       const isLockedByAdmin = item.lockedByRole === 'Admin';

        let statusHtml = '';
        if (item.isActive) {
            statusHtml = '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Đang hoạt động</span>';
        } else {
            if (isLockedByAdmin) {
                // Hiển thị gắt hơn để giảng viên biết là do Admin can thiệp
                statusHtml = `
                    <span class="badge bg-danger shadow-sm">
                        <i class="bi bi-shield-lock-fill me-1"></i>Niêm phong bởi Quản trị viên
                    </span>
                    <div class="mt-2 small text-danger italic">
                        <i class="bi bi-exclamation-triangle me-1"></i> Khóa học vi phạm chính sách hoặc đang chờ kiểm duyệt lại.
                    </div>`;
            } else {
                statusHtml = '<span class="badge bg-secondary"><i class="bi bi-eye-slash-fill me-1"></i>Đang tạm ẩn</span>';
            }
        }

        $('#dtlStatusBadge').html(statusHtml);

        // Hiển thị thêm thông báo cảnh báo nếu bị khóa (tùy chọn)
        if (isLockedByAdmin) {
            $('#dtlId').closest('.modal-content').find('.modal-header').addClass('bg-light-danger');
        } else {
            $('#dtlId').closest('.modal-content').find('.modal-header').removeClass('bg-light-danger');
        }

        $('#detailCourseModal').modal('show');    
            
        } catch (error) {
            console.error("Lỗi khi thêm:", error);
            alert("Có lỗi xảy ra: " + (error.responseJSON?.message || "Không rõ nguyên nhân"));
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
            const res = await $.ajax({
                url: `${Course.config.apiUrl}/${id}`,
                type: "DELETE"
            });
            Toast.fire({
                            icon: 'success',
                            title: 'Khôi phục khóa học thành công!' 
                        });

            Course.loadData(1);

        } catch (error) {
            console.error("Lỗi khi xóa:", error);
            Toast.fire("Lỗi!", "Không thể xóa bản ghi này.", "error");
        }
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
                Course.loadData(page); // Gọi lại hàm load dữ liệu của bạn
            }
        }
    });
},
addDetail: function() {
        const content = document.getElementById('txtDetailContent').value.trim();
        const type = document.getElementById('ddlDetailType').value;

        if (content === "") {
            alert("Vui lòng nhập nội dung!");
            return;
        }

        // Đẩy vào mảng
        Course.addedDetails.push({
            content: content,
            detailType: parseInt(type)
        });

        // Reset input và vẽ lại danh sách
        document.getElementById('txtDetailContent').value = "";
        Course.renderDetails();
    },

    // 2. Hàm xóa một dòng detail
    removeDetail: function(index) {
        Course.addedDetails.splice(index, 1);
        Course.renderDetails();
    },
addDetailToEdit : function() {
        const content = document.getElementById('editTxtDetailContent').value.trim();
        const type = document.getElementById('editDdlDetailType').value;

        if (content === "") {
            alert("Vui lòng nhập nội dung!");
            return;
        }

        // Đẩy vào mảng
        Course.editDetails.push({
            content: content,
            detailType: parseInt(type)
        });

        // Reset input và vẽ lại danh sách
        document.getElementById('editTxtDetailContent').value = "";
        document.getElementById('editTxtDetailContent').focus();
        Course.renderDetails('edit');
    },

    // 2. Hàm xóa một dòng detail
    removeDetailFromEdit : function(index) {
        Course.editDetails.splice(index, 1);
        Course.renderDetails('edit');
    },
    // 3. Hàm hiển thị danh sách lên UI
    // Cấu trúc hàm dùng chung
renderDetails: function(type) { 
    // type = 'add' hoặc 'edit'
    const isEdit = type === 'edit';
    debugger
    const listUl = document.getElementById(isEdit ? 'editListDetails' : 'listDetails');
    const dataArray = isEdit ? Course.editDetails : Course.addedDetails;
    const deleteFunc = isEdit ? 'removeDetailFromEdit' : 'removeDetail';

    if (dataArray.length === 0) {
        listUl.innerHTML = '<li class="list-group-item small text-muted text-center py-3">Trống</li>';
        return;
    }
listUl.innerHTML = dataArray.map((item, index) => `
        <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-bottom">
            <div class="small">
                <span class="badge ${item.detailType == 0 ? 'bg-success' : 'bg-warning'} me-2">
                    ${item.detailType == 0 ? 'Lợi ích' : 'Yêu cầu'}
                </span>
                <span class="text-dark">${item.content}</span> </div>
            <button type="button" class="btn btn-sm text-danger p-0" onclick="Course.${deleteFunc}(${index})">
                <i class="bi bi-x-circle-fill"></i>
            </button>
        </li>
    `).join('');
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
            text: "Bạn có chắc chắn muốn thay đổi trạng thái hiển thị của khóa học này?",
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
                    url: `http://127.0.0.1:5000/api/Course/toggle-status/${id}?role=${roleName}`,
                    type: 'PUT',
                    contentType: 'application/json',
                    success: function (res) {
                        if (res.success) {
                            Swal.fire('Thành công!', res.message, 'success');
                            Course.loadData(1); 
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
softDeleteBulk: function() {
    const ids = $('.item-check:checked').map(function() { 
        return parseInt($(this).val()); 
    }).get();
    
    if (ids.length === 0) return;

    Swal.fire({
        title: `Xóa ${ids.length} khóa học?`,
        text: "Các khóa học này sẽ được chuyển vào thùng rác!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Hủy',
        showLoaderOnConfirm: true, 
        preConfirm: async () => {
            try {
                const response = await fetch(`${Course.config.apiUrl}/soft-delete-bulk`, {
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
                Course.uncheckAll(); 
                Course.loadData(1); 
            } else {
                Swal.fire('Thất bại', result.value.Message || result.value.message || 'Có lỗi xảy ra', 'error');
            }
        }
    });
},
trash: {
        init: function() {
            this.loadData(1);
            this.loadCategoriesTrash();
            Course.registerCheckboxEvents();
        },

        loadData: async function(page) {
            const keySearch = $('#trashKeySearch').val() || "";
            const categoryId = $('#trashFilterCategory').val() || 0;
            const pageSize = Course.config.pageSize;
           const url = `${Course.config.apiUrl}/list-deleted?page=${page}&pageSize=${pageSize}&keySearch=${encodeURIComponent(keySearch)}&categoryId=${categoryId}`;
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
                console.error("Lỗi load thùng rác khóa học:", error);
            }
        },

        renderTable: function(data) {
            const tbody = document.getElementById('course-trash-table-body');
            if (!tbody) return;

            let html = '';
            if (!data || data.length === 0) {
                html = '<tr><td colspan="5" class="text-center py-5 text-muted">Thùng rác trống</td></tr>';
            } else {
                data.forEach(item => {
                    html += `
                    <tr>
                     <td class="ps-4">
                        <input class="form-check-input item-check" type="checkbox" value="${item.courseId}">
                    </td>
                        <td class="ps-4">
                            <img src="${item.thumbnailUrl || '/assets/img/default-course.png'}" class="course-img shadow-sm">
                        </td>
                        <td>
                            <div class="fw-bold text-dark">${item.title}</div>
                            <small class="text-muted">ID: ${item.courseId}</small>
                        </td>
                        <td><span class="badge bg-light text-dark border">${item.categoryName || 'N/A'}</span></td>
                        <td><span class="text-danger small fw-bold">${new Date(item.deletedAt || item.updatedAt).toLocaleDateString('vi-VN')}</span></td>
                        <td class="text-center">
                            <button class="btn-action btn-restore me-1" onclick="Course.trash.restore(${item.courseId})" title="Khôi phục">
                                <i class="bi bi-arrow-counterclockwise"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="Course.trash.hardDelete(${item.courseId})" title="Xóa vĩnh viễn">
                                <i class="bi bi-trash3-fill"></i>
                            </button>
                        </td>
                    </tr>`;
                });
            }
            tbody.innerHTML = html;
        },
resetFilter: function() {
    // 1. Reset ô tìm kiếm về rỗng
    $('#trashKeySearch').val('');
    
    // 2. Reset select danh mục về giá trị mặc định (0)
    $('#trashFilterCategory').val('0');
    
    // 3. Gọi lại hàm loadData để lấy lại toàn bộ danh sách ban đầu (trang 1)
    this.loadData(1);
},
        restore: function(id) {
            Swal.fire({
                title: 'Khôi phục khóa học?',
                text: "Khóa học này sẽ quay lại danh sách hiển thị chính.",
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#198754',
                confirmButtonText: 'Đồng ý',
                cancelButtonText: 'Hủy'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    const response = await fetch(`${Course.config.apiUrl}/restore/${id}`, { method: 'POST' });
                    const res = await response.json();
                    if (res.success || res.Success) {
                        Toast.fire({
                            icon: 'success',
                            title: 'Khôi phục khóa học thành công!' 
                        });
                        Course.uncheckAll();
                        this.loadData(1);
                    }
                }
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
                    const response = await fetch(`${Course.config.apiUrl}/hard-delete/${id}`, { method: 'DELETE' });
                    const res = await response.json();
                    if (res.success || res.Success) {
                        Toast.fire('Đã xóa!', 'Khóa học đã bị xóa vĩnh viễn.', 'success');
                        this.loadData(1);
                    } else {
                        Toast.fire('Thất bại!', res.message || 'Có lỗi xảy ra.', 'error');
                    }
                }
            });
        },
        showPaging: function(totalCount, currentPage) {
            const totalPages = Math.ceil(totalCount / Course.config.pageSize);
            $('#paging-ul').twbsPagination('destroy');
            if (totalPages > 0) {
                $('#paging-ul').twbsPagination({
                    totalPages: totalPages,
                    startPage: currentPage,
                    visiblePages: 5,
                    onPageClick: (event, page) => { if (page !== currentPage) this.loadData(page); }
                });
            }
        },
    restoreBulk: function() {
    const ids = this.getSelectedIds();
    if (ids.length === 0) return;

    Swal.fire({
        title: `Khôi phục ${ids.length} khóa học?`,
        text: "Các Khóa học được chọn sẽ hoạt động trở lại bình thường.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#1976d2',
        confirmButtonText: 'Đồng ý khôi phục',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch(`${Course.config.apiUrl}/restore-bulk`, {
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
                        title: apiMessage || `Đã khôi phục thành công ${ids.length} khóa học.` 
                    });
                    Course.uncheckAll(); 
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
                text: "Dữ liệu khóa học sẽ bị xóa sạch hoàn toàn, hành động này không thể hoàn tác!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'Xóa sạch ngay',
                cancelButtonText: 'Hủy'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const response = await fetch(`${Course.config.apiUrl}/hard-delete-bulk`, {
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
          showPaging: function(totalCount, currentPage) {
            const totalPages = Math.ceil(totalCount / Course.config.pageSize);
            $('#paging-ul').twbsPagination('destroy');
            if (totalPages > 0) {
                $('#paging-ul').twbsPagination({
                    totalPages: totalPages,
                    startPage: currentPage,
                    visiblePages: 5,
                    onPageClick: (event, page) => { if (page !== currentPage) this.loadData(page); }
                });
            }
        },
     loadCategoriesTrash: async function () {
        const selectEl = document.getElementById('trashFilterCategory');

        try {
            const response = await fetch(`http://127.0.0.1:5000/api/Category`);
            const result = await response.json(); 
            Course.categories = result.data || []; 
            let filterHtml = '<option value="0">-- Tất cả danh mục --</option>';
            Course.categories.forEach(item => {
                filterHtml += `<option value="${item.id}">${item.name}</option>`;
            });
            const trashSelect = document.getElementById('trashFilterCategory');
            if (trashSelect) {
                trashSelect.innerHTML = filterHtml;
            }

        } catch (error) {
            console.error("Lỗi khi tải danh mục thùng rác:", error);
        }
}
}
};


