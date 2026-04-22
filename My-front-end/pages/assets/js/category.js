var Category = {
    config: {
        pageSize: 10,
        apiUrl: "https://lms-1mj1.onrender.com/api/category"
    },

    // Hàm khởi tạo - Gọi khi trang load xong
    init: function () {
        Category.loadData(1);
        Category.registerEvents();
    },

    // Đăng ký tất cả sự kiện ở đây (Thay vì viết onclick trong HTML)
    registerEvents: function () {
        $('#btnSearch').off('click').on('click', function () {
            Category.loadData(1);
        });
        $('#frmEditCategory').on('submit', function(e) {
        e.preventDefault(); // CHẶN trang web load lại (cực kỳ quan trọng)
        
        // Sau khi browser check required xong xuôi, nó mới chạy xuống đây
        Category.edit(); 
    });

    },

    // Hàm lấy dữ liệu từ API
     loadData:async function(page) {
        const pageSize = Category.config.pageSize; 
        const apiUrl = Category.config.apiUrl;
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
            Category.renderTable(listData);
            Category.showPaging(totalCount, totalPages, page);

        }

    } catch (error) {

        console.error("Lỗi khi lấy dữ liệu:", error);

    }

},
    renderTable: function (data) {
        let html = '';
        if (!data || data.length === 0) {
            html = '<tr><td colspan="4" class="text-center py-4">Không có dữ liệu</td></tr>';
        } else {
            data.forEach(item => {
                html += `<tr>
                    <td>${item.name}</td>
                    <td>${new Date(item.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td>${item.description || ''}</td>
                    <td class="text-center">
                        <span class="badge ${item.isActive ? 'bg-success' : 'bg-danger'}">
                            ${item.isActive ? 'Hoạt động' : 'Khóa'}
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
                        
                        <button class="btn btn-sm btn-outline-danger" title="Xóa" onclick="Category.delete(${item.id})">
                            <i class="bi bi-trash3-fill"></i>
                        </button>
                    </div>
                </td>
                </tr>`;
            });
        }
        $('#category-table-body').html(html);
    },

    renderPagination: function (total, currentPage) {
        // Logic render phân trang của bạn ở đây...
    },
    openCreateModal: function(){
        $('#frmCategory')[0].reset();
        $('#categoryModal').modal('show');
    },
    openUpdateModal: async function(id){
        try {
        const response = await fetch(`${this.config.apiUrl}/${id}`);
        if (!response.ok) throw new Error('Không lấy được dữ liệu');
        const res = await response.json();
        const item = res.data || res;      
        $('#editId').val(item.id);
        $('#editName').val(item.name);
        $('#editDescription').val(item.description || 'Không có mô tả');
        $('#editIsActive').prop('checked', item.isActive); 
        const label = $('#lblEditStatus'); 
        if (item.isActive) {
            label.text('Đang Hoạt động').removeClass('text-danger').addClass('text-success');
        } else {
            label.text('Đang Khóa').removeClass('text-success').addClass('text-danger');
        }
        $('#editCategoryModal').modal('show');
    } catch (error) {
        console.error("Lỗi khi thêm:", error);
        alert("Có lỗi xảy ra: " + (error.responseJSON?.message || "Không rõ nguyên nhân"));
    }
    },
    edit: async function(){
        var form = $('#frmEditCategory');
        var formData = new FormData(form[0]);
        var data = Object.fromEntries(formData.entries());
        data.isActive = $('#editIsActive').is(':checked'); 
        try {
        const response = await $.ajax({
            url: `${Category.config.apiUrl}/${data.id}`, // Thay bằng URL thật của bạn
            type: 'PUT',
            contentType: 'application/json', // Bắt buộc phải có để [FromBody] hoạt động
            data: JSON.stringify(data),      // Chuyển Object thành chuỗi JSON
        });

        alert(response.message);
        $('#editCategoryModal').modal('hide'); 
        Category.loadData(1);                 
        form[0].reset();                  
        
    } catch (error) {
        console.error("Lỗi khi thêm:", error);
        alert("Có lỗi xảy ra: " + (error.responseJSON?.message || "Không rõ nguyên nhân"));
    }
    },
    create: async function() {
    var form = $('#frmCategory');
    var formData = new FormData(form[0]);
    var data = Object.fromEntries(formData.entries());
    data.isActive = $('#txtIsActive').is(':checked'); 

    try {
        const response = await $.ajax({
            url: Category.config.apiUrl, // Thay bằng URL thật của bạn
            type: 'POST',
            contentType: 'application/json', // Bắt buộc phải có để [FromBody] hoạt động
            data: JSON.stringify(data),      // Chuyển Object thành chuỗi JSON
        });

        alert(response.message);
        $('#categoryModal').modal('hide'); 
        Category.loadData(1);                 
        form[0].reset();                  
        
    } catch (error) {
        console.error("Lỗi khi thêm:", error);
        alert("Có lỗi xảy ra: " + (error.responseJSON?.message || "Không rõ nguyên nhân"));
    }
},
detail: async function(id){
     try {
        const response = await fetch(`${this.config.apiUrl}/${id}`);
        if (!response.ok) throw new Error('Không lấy được dữ liệu');
        const res = await response.json();
        const item = res.data || res;      
        $('#dtlId').text(item.id);
        $('#dtlName').text(item.name);
        $('#dtlDescription').text(item.description || 'Không có mô tả');
        
        $('#dtlCreatedAt').text(new Date(item.createAt).toLocaleString('vi-VN'));
        const statusHtml = item.isActive 
            ? '<span class="badge bg-success">Hoạt động</span>' 
            : '<span class="badge bg-danger">Đang khóa</span>';
        $('#dtlStatus').html(statusHtml);
        $('#detailModal').modal('show');     
        
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
                url: `${Category.config.apiUrl}/${id}`,
                type: "DELETE"
            });
            Swal.fire("Thành công!", res.message || "Đã xóa danh mục.", "success");
            Category.loadData(1);

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
                Category.loadData(page); // Gọi lại hàm load dữ liệu của bạn
            }
        }
    });
}
};


// Chạy khởi tạo
$(document).ready(function () {
    Category.init();
});