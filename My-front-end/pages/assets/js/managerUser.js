// Cấu hình Toast dùng chung
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

var Manager = {
    config: {
        pageSize: 10,
        apiUrl: "https://lms-1mj1.onrender.com/api/user"
    },

    init: function () {
        this.loadData(1);
        
        $('#keySearch').on('keypress', function(e) {
            if (e.which == 13) Manager.loadData(1);
        });

        // Lắng nghe thay đổi switch trạng thái trên modal
        $(document).on('change', '#modalIsActive', function() {
            Manager.updateStatusLabel($(this).is(':checked'));
        });
    },

    loadData: async function(page) {
        const pageSize = this.config.pageSize; 
        const params = new URLSearchParams({
            page: page,
            pageSize: pageSize,
            keySearch: $('#keySearch').val() || '',
            roleId: $('#roleId').val() || -1,
            isActive: $('#isActive').val() || -1
        });

        try {
            const response = await fetch(`${this.config.apiUrl}/list-data?${params.toString()}`, {
                headers: { "Authorization": "Bearer " + localStorage.getItem("jwt_token") }
            });

            const res = await response.json();

            if (res.success || res.Success) {
                const list = res.data || res.Data || [];
                const totalCount = res.total || res.Total || 0;
                const totalPages = Math.ceil(totalCount / pageSize);

                this.renderTable(list);
                this.showPaging(totalCount, totalPages, page);
                $('#total-records').text(totalCount); 
            }
        } catch (error) {
            Toast.fire({ icon: 'error', title: 'Không thể kết nối đến máy chủ' });
        }
    },

    renderTable: function (data) {
        let html = '';
        if (!data || data.length === 0) {
            html = '<tr><td colspan="7" class="text-center p-4">Không có dữ liệu</td></tr>';
        } else {
            data.forEach(item => {
                let roleClass = item.roleId == 1 ? 'bg-danger' : (item.roleId == 3 ? 'bg-info' : 'bg-secondary');
                let statusBadge = item.isActive ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger';
                let statusText = item.isActive ? 'Hoạt động' : 'Bị khóa';

                html += `
                <tr>
                    <td class="ps-4 text-muted small">#${item.id}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${item.avatarUrl || '../assets/img/default-avatar.png'}" class="user-avatar me-3" style="width:30px; height:30px; border-radius:50%">
                            <div class="fw-bold">${item.fullName}</div>
                        </div>
                    </td>
                    <td class="small">${item.email}</td>
                    <td><span class="badge ${roleClass}">${item.roleName}</span></td>
                    <td class="text-center small text-muted">${new Date(item.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td class="text-center">
                        <span role="button" onclick="Manager.toggleStatus(${item.id})" 
                              class="badge rounded-pill ${statusBadge}" style="cursor: pointer;">
                            ${statusText}
                        </span>
                    </td>
                    <td class="text-center">
                        <div class="btn-group">
                            <button onclick="Manager.openDetail(${item.id})" class="btn btn-sm btn-light border"><i class="bi bi-eye text-primary"></i></button>
                            <button onclick="Manager.openEdit(${item.id})" class="btn btn-sm btn-light border"><i class="bi bi-pencil-square text-warning"></i></button>
                            <button onclick="Manager.deleteUser(${item.id}, '${item.fullName}')" class="btn btn-sm btn-light border"><i class="bi bi-trash text-danger"></i></button>
                        </div>
                    </td>
                </tr>`;
            });
        }
        $('#user-table-body').html(html);
    },

   openCreateModal: function () {
        this.resetForm();
        $('#modalTitle').text('Thêm Người Dùng Mới');
        
        // 1. Mở khóa Email để nhập khi thêm mới
        $('#emailInput').prop('readonly', false).removeClass('bg-light'); 
        
        // 2. ẨN dòng Ngày tạo đi (vì chưa có user thì lấy đâu ra ngày tạo)
        $('#createdAtContainer').hide();
        
        $('#passArea').show();
        this.setReadOnly(false);
        $('.modal-footer').show();
        bootstrap.Modal.getOrCreateInstance('#userModal').show();
    },

    openEdit: async function (id) {
        this.resetForm();
        $('#modalTitle').text('Cập Nhật Người Dùng');
        
        // 1. Vô hiệu hóa Email (Chỉ đọc) khi sửa
        $('#email').prop('readonly', true).addClass('bg-light'); 
        
        // 2. HIỆN dòng Ngày tạo lên
        $('#createdAtContainer').show();
        
        $('#passArea').hide();
        this.setReadOnly(false);
        $('.modal-footer').show();

        bootstrap.Modal.getOrCreateInstance('#userModal').show();
        await this.loadDetail(id);
    },

    openDetail: async function (id) {
        this.resetForm();
        $('#modalTitle').text('Chi Tiết Người Dùng');
        
        // 1. Xem chi tiết thì đương nhiên Email phải là Chỉ đọc
        $('#emailInput').prop('readonly', true).addClass('bg-light');
        
        // 2. Hiện Ngày tạo
        $('#createdAtContainer').show();
        
        $('#passArea').hide();
        this.setReadOnly(true); 
        $('.modal-footer').hide();

        bootstrap.Modal.getOrCreateInstance('#userModal').show();
        await this.loadDetail(id);
    },
    loadDetail: async function (id) {
    try {
        const response = await fetch(`${this.config.apiUrl}/${id}`, {
            headers: { "Authorization": "Bearer " + localStorage.getItem("jwt_token") }
        });
        const res = await response.json();
        const data = res.data; 

        if (data) {
            // Dùng context để chỉ tìm input BÊN TRONG form của modal
            const $form = $('#frmUser'); 

            $form.find('#userId').val(data.id);
            $form.find('#fullName').val(data.fullName || '');
            $form.find('#emailInput').val(data.email || '');
            $form.find('#modalRoleId').val(data.roleId);
            
            // Log ra xem thực tế nó có gán được không
            console.log("Giá trị vừa gán vào fullName:", $form.find('#fullName').val());

            // Switch và Avatar bạn bảo chạy rồi thì giữ nguyên
            $('#modalIsActive').prop('checked', data.isActive);
            this.updateStatusLabel(data.isActive);
            $('#userAvatarPreview').attr('src', data.avatarUrl || '../assets/img/default-avatar.png');
            $('#createdAtLabel').text(data.createdAt ? new Date(data.createdAt).toLocaleString('vi-VN') : '--/--/----');
        }
    } catch (error) {
        console.error("Lỗi:", error);
    }
},

    save: async function () {
        const id = $('#userId').val();
        const isUpdate = id && id > 0;
        let dto = {
        fullName: $('#frmUser #fullName').val(),
        roleId: parseInt($('#modalRoleId').val()),
        isActive: $('#modalIsActive').is(':checked')
        };

        // 2. Nếu là THÊM MỚI (isUpdate = false)
        if (!isUpdate) {
        // Lấy thêm Email và Password
        // Lưu ý: emailInput phải khớp với tên thuộc tính trong Class C# của bạn
        dto.email = $('#frmUser #emailInput').val(); 
        dto.password = $('#frmUser #passwordInput').val(); 
        debugger
        // Kiểm tra nhanh ở client (validate)
        if (!dto.email || !dto.password) {
            Toast.fire({ icon: 'warning', title: 'Vui lòng nhập đầy đủ Email và Mật khẩu khi tạo mới!' });
            return;
        }
    }

        try {
            const response = await fetch(isUpdate ? `${this.config.apiUrl}/${id}` : this.config.apiUrl, {
                method: isUpdate ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', "Authorization": "Bearer " + localStorage.getItem("jwt_token") },
                body: JSON.stringify(dto)
            });
            const res = await response.json();
            if (res.success || res.Success) {
                Toast.fire({ icon: 'success', title: isUpdate ? 'Đã cập nhật!' : 'Đã thêm mới!' });
                bootstrap.Modal.getOrCreateInstance('#userModal').hide();
                this.loadData(1);
            }
        } catch (error) {
            Toast.fire({ icon: 'error', title: 'Lỗi khi lưu dữ liệu' });
        }
    },

    toggleStatus: async function(id) {
        try {
            const response = await fetch(`${this.config.apiUrl}/toggle-status/${id}`, {
                method: 'PATCH',
                headers: { "Authorization": "Bearer " + localStorage.getItem("jwt_token") }
            });
            const res = await response.json();
            if (res.success || res.Success) {
                Toast.fire({ icon: 'success', title: res.message || 'Đã đổi trạng thái' });
                this.loadData(1); 
            }
        } catch (error) {
            Toast.fire({ icon: 'error', title: 'Lỗi kết nối' });
        }
    },

    deleteUser: function(id, name) {
        Swal.fire({
            title: 'Xóa người dùng?',
            text: `Bạn có chắc muốn xóa "${name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Xóa luôn!',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                const response = await fetch(`${this.config.apiUrl}/${id}`, {
                    method: 'DELETE',
                    headers: { "Authorization": "Bearer " + localStorage.getItem("jwt_token") }
                });
                const res = await response.json();
                if (res.success || res.Success) {
                    Toast.fire({ icon: 'success', title: 'Đã xóa thành công' });
                    this.loadData(1);
                }
            }
        });
    },

    setReadOnly: function (isReadOnly) {
        $('#fullName, #email, #modalRoleId').prop('readonly', isReadOnly);
        $('#modalRoleId, #modalIsActive').prop('disabled', isReadOnly);
    },

    resetForm: function () {
        $('#frmUser')[0].reset();
        $('#userId').val('');
        this.updateStatusLabel(true);
    },

    updateStatusLabel: function(isActive) {
        const label = $('#statusLabel');
        if(isActive) label.text('Đang hoạt động').addClass('text-success').removeClass('text-danger');
        else label.text('Bị khóa').addClass('text-danger').removeClass('text-success');
    },

    showPaging: function (totalCount, totalPages, currentPage) {
        if (totalPages <= 1) {
            $('#paging-ul').empty().removeData("twbs-pagination").unbind("page");
            return;
        }
        $('#paging-ul').twbsPagination('destroy');
        $('#paging-ul').twbsPagination({
            totalPages: totalPages,
            visiblePages: 5,
            startPage: currentPage,
            first: '«', prev: '‹', next: '›', last: '»',
            onPageClick: (event, page) => { if (page !== currentPage) this.loadData(page); }
        });
    }
};

$(document).ready(() => Manager.init());