// Khởi tạo Toast cấu hình chuẩn của SweetAlert2
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
});

var Category = {
    config: {
        pageSize: 10,
        apiUrl: "https://lms-u2jn.onrender.com/api/category"
    },

    // Hàm khởi tạo - Gọi khi trang load xong
    init: function () {
        Category.loadData(1);
        Category.registerEvents();
    },

    registerEvents: function () {
        const _this = this;
        
        // Form chỉnh sửa danh mục
        $('#frmEditCategory').off('submit').on('submit', function (e) {
            e.preventDefault(); 
            _this.edit(); 
        });

        // Form tạo mới danh mục
        $('#frmCreateCategory').off('submit').on('submit', function (e) {
            e.preventDefault();
            _this.create(); 
        });

        // ==========================================
        // 3. CỤM SỰ KIỆN CHECKBOX HÀNG LOẠT (BULK ACTIONS)
        // ==========================================
        
        // Sự kiện Chọn tất cả (Check-all) - Chừa các ô bị disabled ra
        $(document).off('change', '#check-all').on('change', '#check-all', function () {
            const isChecked = $(this).prop('checked');
            if (isChecked) {
                $('.item-check').not(':disabled').prop('checked', true);
            } else {
                $('.item-check').prop('checked', false);
            }
            _this.toggleBulkActions();
        });

        // Sự kiện tích/bỏ tích từng ô nhỏ lẻ dưới các hàng bảng (Dùng Event Delegation)
        $(document).off('change', '.item-check').on('change', '.item-check', function () {
            _this.toggleBulkActions();
        });
    },

loadData: async function(page) {
    const pageSize = Category.config.pageSize; 
    const apiUrl = Category.config.apiUrl;
    
    if (typeof TableLoader !== 'undefined') TableLoader.show('#category-table-body');
    
    const params = new URLSearchParams({
        page: page,
        pageSize: pageSize,
        keySearch: $('#keySearch').val() || '',
        fromDate: $('#fromDate').val() || '',
        toDate: $('#toDate').val() || '',
        isActive: $('#isActive').val() || -1
    });

    try {
        const token = localStorage.getItem("jwt_token");

        const response = await fetch(`${apiUrl}/list-data?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        // 📍 XỬ LÝ LỖI TRƯỚC KHI THỬ JSON
        if (response.status === 403) {
            window.location.href = "/403.html"; // Điều hướng khi bị cấm
            return;
        }

        if (response.status === 401) {
            alert("Phiên đăng nhập đã hết hạn!");
            window.location.href = "/auth/login.html";
            return;
        }

        if (!response.ok) throw new Error('Mạng lỗi hoặc Server có vấn đề');

        const res = await response.json();

        if (res.success || res.Success) {
            const listData = res.data || res.Data;
            const totalCount = res.total || res.Total;
            const totalPages = Math.ceil(totalCount / pageSize);
            
            Category.renderTable(listData);
            Category.showPaging(totalCount, totalPages, page);
        }
    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu:", error);
    } finally {
        if (typeof TableLoader !== 'undefined') TableLoader.hide('#category-table-body');
    }
},

    renderTable: function (data) {
        let html = '';
        if (!data || data.length === 0) {
            html = '<tr><td colspan="6" class="text-center py-5 text-muted">Không tìm thấy danh mục nào bác ơi!</td></tr>';
        } else {
            data.forEach(item => {
                const hasCourses = item.courseCount > 0;

                html += `
                <tr>
                    <td class="ps-4">
                        <input class="form-check-input item-check" type="checkbox" value="${item.id}" 
                               style="cursor: ${hasCourses ? 'not-allowed' : 'pointer'};"
                               ${hasCourses ? 'disabled' : ''}>
                    </td>
                    <td>
                        <div class="fw-bold text-dark">${item.name}</div>
                        <div class="text-muted" style="font-size: 0.7rem;">ID: #${item.id}</div>
                    </td>
                    <td>${new Date(item.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td class="text-secondary small">${item.description || '<em class="text-muted">Không có mô tả</em>'}</td>
                    <td class="text-center">
                        <span class="badge rounded-pill bg-primary bg-opacity-10 text-primary px-3">
                            ${item.courseCount || 0} khóa học
                        </span>
                    </td>
                    <td class="text-center">
                        <span class="badge ${item.isActive ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} px-3 py-2 rounded-pill fw-bold" style="font-size: 11px;">
                            ${item.isActive ? '<i class="bi bi-check-circle-fill me-1"></i>Hoạt động' : '<i class="bi bi-slash-circle-fill me-1"></i>Tạm khóa'}
                        </span>
                    </td>
                    <td class="text-center">
                        <div class="d-flex justify-content-center gap-2">
                            <button class="btn btn-sm btn-outline-info" title="Xem chi tiết" onclick="Category.detail(${item.id})">
                                <i class="bi bi-eye-fill"></i>
                            </button>
                            
                            <button class="btn btn-sm btn-outline-warning" title="Chỉnh sửa" onclick="Category.openUpdateModal(${item.id})">
                                <i class="bi bi-pencil-square"></i>
                            </button>
                            
                            <button class="btn btn-sm btn-outline-danger ${hasCourses ? 'opacity-50' : ''}" 
                                    ${hasCourses ? "disabled onclick=\"Swal.fire('Bị chặn', 'Danh mục đang chứa khóa học, không được xóa!', 'warning')\"" : `onclick="Category.delete(${item.id})"`} 
                                    title="Xóa danh mục">
                                <i class="bi bi-trash3-fill"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
            });
        }
        $('#category-table-body').html(html);
        Category.toggleBulkActions();
    },

    toggleBulkActions: function () {
        const selectedCount = $('.item-check:checked').not(':disabled').length;
        const $bulkArea = $('#bulk-actions');
        const $countDisplay = $('#selected-count');

        if (selectedCount > 0) {
            $countDisplay.text(selectedCount);
            // SỬA CHỖ NÀY: Vừa hiện, vừa gỡ pointer-events để CHẤP NHẬN click chuột
            $bulkArea.css({ 'opacity': '1', 'pointer-events': 'auto' });
        } else {
            // SỬA CHỖ NÀY: Ẩn đi và KHÓA chuột không cho click lén
            $bulkArea.css({ 'opacity': '0', 'pointer-events': 'none' });
            $('#check-all').prop('checked', false);
        }
    },

    uncheckAll: function() {
        $('#check-all, .item-check').prop('checked', false);
        this.toggleBulkActions();
    },

    softDeleteBulk: function() {
        // Chỉ lấy những ô checkbox không bị disabled (Không chứa khóa học)
        const ids = $('.item-check:checked').not(':disabled').map(function() { 
            return parseInt($(this).val()); 
        }).get();
        
        if (ids.length === 0) return;

        Swal.fire({
            title: `Xóa ${ids.length} danh mục?`,
            text: "Các danh mục này sẽ được chuyển vào thùng rác!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Đồng ý xóa',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    if (typeof GlobalLoader !== 'undefined') GlobalLoader.show();

                    const response = await fetch(`${Category.config.apiUrl}/soft-delete-bulk`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + localStorage.getItem("jwt_token")
                        },
                        body: JSON.stringify(ids)
                    });
                    
                    const res = await response.json();
                    if (!response.ok) throw new Error(res.Message || res.message || 'Lỗi từ server');
                    
                    const isSuccess = res.Success || res.success;
                    if (isSuccess) {
                        Toast.fire({
                            icon: 'success',
                            title: res.Message || res.message || 'Đã chuyển vào thùng rác thành công!'
                        });

                        Category.uncheckAll(); 
                        Category.loadData(1); 
                    } else {
                        Swal.fire('Thất bại', res.Message || res.message || 'Có lỗi xảy ra', 'error');
                    }
                } catch (error) {
                    console.error("Lỗi xóa hàng loạt:", error);
                    Swal.fire('Lỗi hệ thống!', error.message, 'error');
                } finally {
                    if (typeof GlobalLoader !== 'undefined') GlobalLoader.hide();
                }
            }
        });
    },

    resetSearch: function () {
        $('#keySearch').val('');
        $('#fromDate').val('');
        $('#toDate').val('');
        $('#isActive').val('-1');
        this.loadData(1);
    },

    showPaging: function (totalCount, totalPages, currentPage) {
        $('#total-records').text(totalCount);
        if (totalPages <= 1) {
            $('#paging-ul').empty().removeData("twbs-pagination").unbind("page");
            return;
        }
        $('#paging-ul').twbsPagination('destroy');
        $('#paging-ul').twbsPagination({
            totalPages: totalPages,
            visiblePages: 5,
            startPage: currentPage,
            first: '<i class="bi bi-chevron-double-left"></i>',
            prev: '<i class="bi bi-chevron-left"></i>',
            next: '<i class="bi bi-chevron-right"></i>',
            last: '<i class="bi bi-chevron-double-right"></i>',
            onPageClick: function (event, page) {
                if (page !== currentPage) {
                    Category.loadData(page);
                }
            }
        });
    },

    openCreateModal: function(){
        $('#frmCategory')[0].reset();
        $('#categoryModal').modal('show');
    },

   openUpdateModal: async function(id){
        try {
            // 📍 Lại dùng $.ajax để auth.js tự động nhét Token vào
            const res = await $.ajax({
                url: `${this.config.apiUrl}/${id}`,
                type: 'GET'
            });
            
            // $.ajax tự động bóc tách JSON luôn rồi
            const item = res.data || res;      
            
            $('#editId').val(item.id);
            $('#editName').val(item.name);
            $('#editDescription').val(item.description || ''); // Đừng để text 'Không có mô tả' vào ô input, để rỗng cho người ta dễ gõ
            $('#editIsActive').prop('checked', item.isActive); 
            
            const label = $('#lblEditStatus'); 
            if (item.isActive) {
                label.text('Đang Hoạt động').removeClass('text-danger').addClass('text-success');
            } else {
                label.text('Đang Khóa').removeClass('text-success').addClass('text-danger');
            }
            
            $('#editCategoryModal').modal('show');
        } catch (error) {
            console.error("Lỗi khi mở modal update:", error);
            // Nếu lỗi 401 thì hệ thống ngầm tự xử lý xin Token mới rồi
        }
    },

    edit: async function(){
        var form = $('#frmEditCategory');
        var formData = new FormData(form[0]);
        var data = Object.fromEntries(formData.entries());
        data.isActive = $('#editIsActive').is(':checked'); 
        try {
            if (typeof GlobalLoader !== 'undefined') GlobalLoader.show();
            const response = await $.ajax({
                url: `${Category.config.apiUrl}/${data.id}`,
                type: 'PUT',
                contentType: 'application/json',
                data: JSON.stringify(data),
            });

            $('#editCategoryModal').modal('hide'); 
            Category.loadData(1);                  
            form[0].reset();                  
            Toast.fire({ icon: 'success', title: response.message || 'Cập nhật thành công!' });
        } catch (error) {
            console.error("Lỗi khi sửa:", error);
        } finally {
            if (typeof GlobalLoader !== 'undefined') GlobalLoader.hide();
        }
    },

    create: async function() {
        var form = $('#frmCategory');
        var formData = new FormData(form[0]);
        var data = Object.fromEntries(formData.entries());
        data.isActive = $('#txtIsActive').is(':checked'); 

        try {
            if (typeof GlobalLoader !== 'undefined') GlobalLoader.show();
            const response = await $.ajax({
                url: Category.config.apiUrl,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(data),
            });

            $('#categoryModal').modal('hide'); 
            Category.loadData(1);                  
            form[0].reset();                  
            Toast.fire({ icon: 'success', title: response.message || 'Thêm mới thành công!' });
        } catch (error) {
            console.error("Lỗi khi thêm:", error);
        } finally {
            if (typeof GlobalLoader !== 'undefined') GlobalLoader.hide();
        }
    },

  detail: async function(id) {
         try {
            // 📍 Chuyển từ fetch sang $.ajax để được tự động bơm Token
            const res = await $.ajax({
                url: `${this.config.apiUrl}/${id}`,
                type: 'GET'
            });
            
            // $.ajax tự parse JSON và tự quăng lỗi nếu 400, 401, 500
            // Nên xuống được đây là chắc chắn thành công
            const item = res.data || res;      
            
            $('#dtlId').text(item.id);
            $('#dtlName').text(item.name);
            $('#dtlDescription').text(item.description || 'Không có mô tả');
            $('#dtlCreatedAt').text(new Date(item.createdAt).toLocaleString('vi-VN'));
            
            const statusHtml = item.isActive 
                ? '<span class="badge bg-success">Hoạt động</span>' 
                : '<span class="badge bg-danger">Đang khóa</span>';
            $('#dtlStatus').html(statusHtml);
            
            $('#detailModal').modal('show');     
        } catch (error) {
            console.error("Lỗi khi xem chi tiết:", error);
            // Lỗi 401 nếu hết hạn thì auth.js cũng tự động lo việc đi xin Token mới luôn
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
                if (typeof GlobalLoader !== 'undefined') GlobalLoader.show();
                const res = await $.ajax({
                    url: `${Category.config.apiUrl}/${id}`,
                    type: "DELETE"
                });
                Toast.fire({ icon: 'success', title: res.message || 'Đã xóa danh mục.' });
                Category.loadData(1);
            } catch (error) {
                console.error("Lỗi khi xóa:", error);
            } finally {
                if (typeof GlobalLoader !== 'undefined') GlobalLoader.hide();
            }
        }
    },
trash: {
        init: function() {
            this.loadData(1);
            this.registerTrashEvents();
        },

        registerTrashEvents: function() {
            const _trash = Category.trash;

            // Đăng ký sự kiện Check-All riêng biệt cho màn hình Thùng rác
            $(document).off('change', '#check-all-trash').on('change', '#check-all-trash', function () {
                const isChecked = $(this).prop('checked');
                $('.item-check').prop('checked', isChecked);
                _trash.toggleBulkActions();
            });

            // Lắng nghe tích chọn từng ô nhỏ lẻ
            $(document).off('change', '.item-check').on('change', '.item-check', function () {
                _trash.toggleBulkActions();
            });

            // Gõ phím enter ở ô tìm kiếm rác
            $('#keySearchTrash').off('keypress').on('keypress', function (e) {
                if (e.which === 13) {
                    e.preventDefault();
                    _trash.loadData(1);
                }
            });
            
            // Thay đổi mốc thời gian xóa -> Tự động lọc dữ liệu
            $('#fromDateTrash, #toDateTrash').off('change').on('change', function () {
                _trash.loadData(1);
            });
        },
loadData: async function(page) {
    // 1. Hiển thị loader
    if (typeof TableLoader !== 'undefined') TableLoader.show('#trash-table-body');
    
    // 2. Lấy dữ liệu từ UI
    const params = new URLSearchParams({
        page: page,
        pageSize: Category.config.pageSize || 10,
        keySearch: $('#keySearchTrash').val() || '',
        fromDate: $('#fromDateTrash').val() || '',
        toDate: $('#toDateTrash').val() || ''
    });

    try {
        // 1. Dùng $.ajax để dễ bắt status code
        const res = await $.ajax({
            url: `${Category.config.apiUrl}/list-data?${params.toString()}`,
            type: 'GET',
            headers: { "Authorization": "Bearer " + localStorage.getItem("jwt_token") }
        });

        // Xử lý dữ liệu thành công...
        if (res.success || res.Success) {
            this.renderTable(res.data || res.Data);
            // ...
        }

    } catch (error) {
        // 📍 BẮT LỖI 403 Ở ĐÂY
        if (error.status === 403) {
            console.error("403 Forbidden: Bác không có quyền truy cập!");
            window.location.href = "/error/403.html"; 
            return;
        }

        // Các lỗi khác (401, 500, lỗi mạng)
        console.error("Lỗi khi lấy dữ liệu:", error);
        
        // Nếu lỗi không phải 403, bác cứ hiển thị thông báo bình thường
        if (error.status !== 401) {
            Toast.fire({ icon: 'error', title: 'Không tải được dữ liệu!' });
        }
    }
},
        renderTable: function(data) {
            let html = '';
            if (!data || data.length === 0) {
                html = `<tr><td colspan="5" class="text-center py-5 text-muted">Thùng rác trống rỗng bác ơi!</td></tr>`;
            } else {
                data.forEach(item => {
                    html += `
                    <tr>
                        <td class="ps-4">
                            <input class="form-check-input item-check" type="checkbox" value="${item.id}" style="cursor: pointer;">
                        </td>
                        <td class="fw-bold text-dark">${item.name}</td>
                        <td><span class="badge bg-secondary-subtle text-secondary px-2 py-1"><i class="bi bi-clock-history me-1"></i>${new Date(item.updateAt || item.updatedAt || item.createdAt).toLocaleDateString('vi-VN')}</span></td>
                        <td><small class="text-secondary">${item.description || '<em class="text-muted">Không có mô tả</em>'}</small></td>
                        <td class="text-center">
                            <div class="d-flex justify-content-center gap-2">
                                <button class="btn btn-sm btn-outline-success" onclick="Category.trash.restore(${item.id})" title="Khôi phục danh mục">
                                    <i class="bi bi-arrow-counterclockwise"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="Category.trash.hardDelete(${item.id})" title="Xóa vĩnh viễn khỏi hệ thống">
                                    <i class="bi bi-trash3-fill"></i>
                                </button>
                            </div>
                        </td>
                    </tr>`;
                });
            }
            $('#trash-table-body').html(html);
            this.toggleBulkActions(); // Đảm bảo gom lại trạng thái công cụ sau mỗi lần nạp bảng
        },

        toggleBulkActions: function () {
            const selectedCount = $('.item-check:checked').length;
            const $bulkArea = $('#bulk-actions-trash');
            const $countDisplay = $('#selected-count-trash');

            if (selectedCount > 0) {
                $countDisplay.text(selectedCount);
                $bulkArea.css({ 'opacity': '1', 'pointer-events': 'auto' });
            } else {
                $bulkArea.css({ 'opacity': '0', 'pointer-events': 'none' });
                $('#check-all-trash').prop('checked', false);
            }
        },

        uncheckAll: function() {
            $('#check-all-trash, .item-check').prop('checked', false);
            this.toggleBulkActions();
        },

        getSelectedIds: function() {
            return Array.from($('.item-check:checked')).map(cb => parseInt($(cb).val()));
        },

        restore: function(id) {
            Swal.fire({
                title: 'Khôi phục danh mục?',
                text: "Danh mục này sẽ xuất hiện lại ở danh sách chính!",
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#198754',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Đúng, khôi phục ngay!',
                cancelButtonText: 'Hủy'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        if (typeof GlobalLoader !== 'undefined') GlobalLoader.show();

                        const response = await fetch(`${Category.config.apiUrl}/restore/${id}`, { 
                            method: 'POST',
                            headers: { "Authorization": "Bearer " + localStorage.getItem("jwt_token") }
                        });
                        const res = await response.json();

                        if (res.success || res.Success) {
                            Toast.fire({ icon: 'success', title: res.Message || res.message || 'Danh mục đã được khôi phục!' });
                            this.loadData(1);
                        } else {
                            Swal.fire('Thất bại', res.message || 'Không thể khôi phục bản ghi này.', 'error');
                        }
                    } catch (error) {
                        console.error(error);
                        Swal.fire('Lỗi', 'Không thể kết nối máy chủ.', 'error');
                    } finally {
                        if (typeof GlobalLoader !== 'undefined') GlobalLoader.hide();
                    }
                }
            });
        },

        hardDelete: function(id) {
            Swal.fire({
                title: 'Xóa vĩnh viễn?',
                text: "Hành động này không thể hoàn tác! Toàn bộ dữ liệu liên quan sẽ mất sạch khỏi hệ thống.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Tôi hiểu, cứ xóa đi!',
                cancelButtonText: 'Quay lại'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        if (typeof GlobalLoader !== 'undefined') GlobalLoader.show();

                        const response = await fetch(`${Category.config.apiUrl}/hard-delete/${id}`, { 
                            method: 'DELETE',
                            headers: { "Authorization": "Bearer " + localStorage.getItem("jwt_token") }
                        });
                        const res = await response.json();

                        if (res.success || res.Success) {
                            Toast.fire({ icon: 'success', title: res.Message || res.message || 'Bản ghi đã bay màu vĩnh viễn!' });
                            this.loadData(1);
                        } else {
                            Swal.fire('Bị chặn dữ liệu', res.message || 'Danh mục dính ràng buộc nâng cao, không thể phá hủy cứng!', 'error');
                        }
                    } catch (error) {
                        console.error(error);
                    } finally {
                        if (typeof GlobalLoader !== 'undefined') GlobalLoader.hide();
                    }
                }
            });
        },

        restoreBulk: function() {
            const ids = this.getSelectedIds();
            if (ids.length === 0) return;

            Swal.fire({
                title: `Khôi phục ${ids.length} danh mục?`,
                text: "Các mục được chọn sẽ hoạt động trở lại trên toàn sàn học.",
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#198754',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Đồng ý khôi phục loạt',
                cancelButtonText: 'Hủy'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        if (typeof GlobalLoader !== 'undefined') GlobalLoader.show();

                        const response = await fetch(`${Category.config.apiUrl}/restore-bulk`, {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + localStorage.getItem("jwt_token") 
                            },
                            body: JSON.stringify(ids)
                        });

                        const res = await response.json();
                        if (res.success || res.Success) {
                            Toast.fire({ icon: 'success', title: res.Message || res.message || `Đã cứu sống thành công ${ids.length} danh mục.` });
                            this.uncheckAll(); 
                            this.loadData(1);    
                        } else {
                            Swal.fire('Thất bại!', res.message || 'Có lỗi xảy ra khi khôi phục loạt.', 'error');
                        }
                    } catch (error) {
                        console.error(error);
                    } finally {
                        if (typeof GlobalLoader !== 'undefined') GlobalLoader.hide();
                    }
                }
            });
        },

        deleteBulk: function() {
            const ids = this.getSelectedIds();
            if (ids.length === 0) return;

            Swal.fire({
                title: `PHÁ HỦY VĨNH VIỄN ${ids.length} MỤC?`,
                text: "Dữ liệu danh mục sẽ bị xóa sổ hoàn toàn khỏi cơ sở dữ liệu và không thể hoàn tác!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Xóa sạch không giữ lại',
                cancelButtonText: 'Hủy'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        if (typeof GlobalLoader !== 'undefined') GlobalLoader.show();

                        const response = await fetch(`${Category.config.apiUrl}/hard-delete-bulk`, {
                            method: 'DELETE', 
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + localStorage.getItem("jwt_token")
                            },
                            body: JSON.stringify(ids)
                        });
                        const res = await response.json();
                        
                        if (res.success || res.Success) {
                            Toast.fire({ icon: 'success', title: res.Message || res.message || `Hệ thống đã dọn sạch ${ids.length} mục.` });
                            this.uncheckAll();
                            this.loadData(1);
                        } else {
                            Swal.fire('Thất bại!', res.message || 'Một số danh mục dính ràng buộc khóa ngoại không thể xóa cứng bừa bãi.', 'error');
                        }
                    } catch (error) {
                        console.error(error);
                    } finally {
                        if (typeof GlobalLoader !== 'undefined') GlobalLoader.hide();
                    }
                }
            });
        },

        resetSearch: function() {
            $('#keySearchTrash').val('');
            $('#fromDateTrash').val('');
            $('#toDateTrash').val('');
            this.loadData(1);
        },

        showPaging: function (totalCount, totalPages, currentPage) {
            $('#total-records').text(totalCount);
            if (totalPages <= 1) {
                $('#paging-ul').empty().removeData("twbs-pagination").unbind("page");
                return;
            }
            $('#paging-ul').twbsPagination('destroy');
            
            // Ép từ mảng context `this` về chính xác để gọi loadData phân trang rác
            const _trash = this;
            $('#paging-ul').twbsPagination({
                totalPages: totalPages,
                visiblePages: 5,
                startPage: currentPage,
                first: '<i class="bi bi-chevron-double-left"></i>', 
                prev: '<i class="bi bi-chevron-left"></i>',
                next: '<i class="bi bi-chevron-right"></i>',
                last: '<i class="bi bi-chevron-double-right"></i>',
                onPageClick: function (event, page) {
                    if (page !== currentPage) {
                        _trash.loadData(page); 
                    }
                }
            });
        }
    }
};
