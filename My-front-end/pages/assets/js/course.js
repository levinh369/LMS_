var Course = {
    categories: [],
    addedDetails: [], // Mảng chứa các object { content, detailType }
    editDetails: [],
    config: {
        pageSize: 10,
        apiUrl: "https://lms-1mj1.onrender.com/api/course"
    },
    CourseLevel : {
        0: "Người mới bắt đầu",
        1: "Trung cấp",
        2: "Nâng cao"
    },
    // Hàm khởi tạo - Gọi khi trang load xong
    init: function () {
        Course.loadData(1);
        Course.registerEvents();
        Course.loadCategories();
        Course.renderLevelDropdown();
    },

   registerEvents: function () {
    $('#btnSearch').off('click').on('click', function () {
        Course.loadData(1);
    });

    // Tách riêng sự kiện change thumbnail
    $(document).on('change', '#editFileThumbnail', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => $('#editImgPreview').attr('src', e.target.result);
            reader.readAsDataURL(file);
        }
    });

    $('#frmUpdateCourse').off('submit').on('submit', function(e) {
        e.preventDefault();
        Course.edit(); 
    });
},

    // Hàm lấy dữ liệu từ API
     loadData:async function(page) {
        const pageSize = Course.config.pageSize; 
        const apiUrl = Course.config.apiUrl;
        const params = new URLSearchParams({
            page: page,
            pageSize: pageSize,

            keySearch: $('#keySearch').val() || '',

            fromDate: $('#fromDate').val() || '',

            isActive: $('#isActive').val() || -1

        });
    try {

        debugger;

        const response = await fetch(`${apiUrl}/list-data?${params.toString()}`);
        if (!response.ok) throw new Error('Mạng lỗi hoặc Server có vấn đề');
        const res = await response.json();
        console.log("Dữ liệu thực tế từ API:", res);

        // Kiểm tra res.success hoặc res.Success tùy theo Backend trả về

        if (res.success || res.Success) {

            const listData = res.data || res.Data;

            const totalCount = res.total || res.Total;
            const totalPages = Math.ceil(totalCount / pageSize);
            Course.renderTable(listData);
            Course.showPaging(totalCount, totalPages, page);

        }

    } catch (error) {

        console.error("Lỗi khi lấy dữ liệu:", error);

    }

},
 renderLevelDropdown : function() {
    let html = '';
    for (let key in Course.CourseLevel) {
        html += `<option value="${key}">${Course.CourseLevel[key]}</option>`;
    }
    $('#txtLevel').append(html);
    $('#editDdlLevel').append(html);
    
},
renderTable: function (data) {
    let html = '';
    
    if (!data || data.length === 0) {
        html = '<tr><td colspan="8" class="text-center py-4 text-muted">Không tìm thấy khóa học nào</td></tr>';
    } else {
        data.forEach(item => {
            const formattedPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price);
            const levelName = Course.CourseLevel[item.level] || 'Chưa xác định';

            html += `
                <tr>
                    <td class="ps-4">
                        <img src="${item.thumbnailUrl || '../assets/img/default.png'}" class="thumbnail-img shadow-sm" style="width:70px; height:45px; object-fit:cover; border-radius:8px" alt="Thumbnail">
                    </td>
                    <td>
                        <div class="fw-bold text-dark">${item.title}</div>
                        <small class="text-muted">ID: ${item.courseId}</small>
                    </td>
                    <td>
                        <span class="badge bg-light text-primary border">${item.categoryName || 'Chưa phân loại'}</span>
                    </td>
                    <td>
                        <span class="small text-secondary"><i class="bi bi-bar-chart-fill me-1"></i>${levelName}</span>
                    </td>
                    <td class="text-center">
                        <div class="fw-bold">${item.totalChapters || 0}</div>
                        <small class="text-muted" style="font-size: 0.7rem;">Chương</small>
                    </td>
                    <td class="fw-bold text-danger">
                        ${item.price === 0 ? '<span class="text-success">Miễn phí</span>' : formattedPrice}
                    </td>
                    <td class="text-center">
                        <span class="badge ${item.isActive ? 'bg-success' : 'bg-danger'}">
                            ${item.isActive ? 'Hoạt động' : 'Khóa'}
                        </span>
                    </td>
                    <td class="text-center">
                        <div class="d-flex justify-content-center gap-2">
                           <button class="btn btn-sm btn-outline-primary" title="Quản lý chương học" 
                                    onclick="chapter.openModal(${item.courseId})">
                                <i class="bi bi-journal-text"></i>
                            </button> 
                            <button class="btn btn-sm btn-outline-info" title="Xem chi tiết" onclick="Course.detail(${item.courseId})">
                                <i class="bi bi-eye-fill"></i>
                            </button>

                            <button class="btn btn-sm btn-outline-warning" title="Chỉnh sửa" onclick="Course.openUpdateModal(${item.courseId})">
                                <i class="bi bi-pencil-square"></i>
                            </button>

                            <button class="btn btn-sm btn-outline-danger" title="Xóa" onclick="Course.delete(${item.courseId})">
                                <i class="bi bi-trash3-fill"></i>
                            </button>
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
        console.log("Dùng dữ liệu danh mục từ cache");
        return; 
    }

    try {
        console.log("Gọi API lấy danh mục...");
        const response = await fetch(`https://lms-1mj1.onrender.com/api/Category`);
        const result = await response.json(); 
        Course.categories = result.data || []; 
        let filterHtml = '<option value="">Tất cả danh mục</option>';
        let modalHtml = '<option value="">-- Chọn danh mục --</option>';

        // 3. Lúc này Course.categories đã là mảng, chạy forEach ngon lành
        Course.categories.forEach(item => {
            const option = `<option value="${item.id}">${item.name}</option>`;
            filterHtml += option;
            modalHtml += option;
        });

        // Đổ dữ liệu vào các Select
        $('#filterCategory').html(filterHtml);
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
    openUpdateModal: async function(id){
        try {
        const response = await fetch(`${this.config.apiUrl}/${id}`);
        if (!response.ok) throw new Error('Không lấy được dữ liệu');
        const res = await response.json();
        const item = res.data || res;      
        $('#editCourseId').val(item.courseId);
        $('#editTxtTitle').val(item.title);
        $('#editTxtDescription').val(item.description || 'Không có mô tả');
        $('#editIsActive').prop('checked', item.isActive); 
        $('#editDdlCategoryId').val(item.categoryId);
        $('#editTxtPrice').val(item.price);
        $('#editTxtIsActive').prop('checked', item.isActive); 
        $('#editDdlLevel').val(item.level);
        debugger
        Course.editDetails = (item.courseDetails || []).map(d => ({
            content: d.content,
            detailType: d.detailType
        }));

        // Gọi hàm vẽ lại danh sách chi tiết lên giao diện
        Course.renderDetails('edit');
        const label = $('#editLblStatus'); 
        if (item.isActive) {
            label.text('Đang Hoạt động').removeClass('text-danger').addClass('text-success');
        } else {
            label.text('Đang Khóa').removeClass('text-success').addClass('text-danger');
        }
        let thumb = item.thumbnailUrl;
        if (!thumb || thumb === "ok") thumb = "https://placehold.co/400x250?text=No+Thumbnail";
        $('#editImgPreview').attr('src', thumb);
        $('#updateCourseModal').modal('show');
    } catch (error) {
        console.error("Lỗi khi thêm:", error);
        alert("Có lỗi xảy ra: " + (error.responseJSON?.message || "Không rõ nguyên nhân"));
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
        const statusHtml = item.isActive 
            ? '<span class="badge bg-success">Hoạt động</span>' 
            : '<span class="badge bg-danger">Đang khóa</span>';
        $('#dtlStatusBadge').html(statusHtml);
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
            Swal.fire("Thành công!", res.message || "Đã xóa danh mục.", "success");
            Course.loadData(1);

        } catch (error) {
            console.error("Lỗi khi xóa:", error);
            Swal.fire("Lỗi!", "Không thể xóa bản ghi này.", "error");
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
};


// Chạy khởi tạo
$(document).ready(function () {
    Course.init();
});