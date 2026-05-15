// Khởi tạo SweetAlert2 Toast chung
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

const AdminApp = {
    config: {
        apiUrl: 'http://localhost:5000/api/InstructorApplication', // ĐỔI URL BACKEND CHO ĐÚNG
        tokenKey: 'jwt_token',
        currentPage: 1,
        pageSize: 10
    },
    rejectModal: null,
    detailModal: null,
    init: function() {
        // Khởi tạo Modal của Bootstrap
        const modalElement = document.getElementById('rejectModal');
        if (modalElement) {
            this.rejectModal = new bootstrap.Modal(modalElement);
        }
        const modalDetailElement = document.getElementById('detailModal');
        if (modalDetailElement) this.detailModal = new bootstrap.Modal(modalDetailElement);
        // Gọi dữ liệu trang 1 khi vừa load
        this.loadData(1);
    },

    loadData: async function(page = 1) {
        debugger
        this.config.currentPage = page;
        const keyword = document.getElementById('adminKeySearch').value;
        const status = document.getElementById('adminIsActive').value;
        const tbody = document.getElementById('application-table-body');
        const sort = document.getElementById('adminSort').value;
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Đang tải dữ liệu...</td></tr>`;

        const token = localStorage.getItem(this.config.tokenKey);
        
        try {
          
            let url = `${this.config.apiUrl}?status=${status}&keySearch=${keyword}&page=${page}&pageSize=${this.config.pageSize}&sort=${sort}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const result = await response.json();
                this.renderTable(result.data || result); 
                this.renderPagination(result.totalPages || 1, page);
                document.getElementById('total-records').innerText = result.totalRecords || (result.data ? result.data.length : result.length);
            } else {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Lỗi tải dữ liệu. Vui lòng thử lại.</td></tr>`;
            }
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Không thể kết nối đến máy chủ.</td></tr>`;
        }
    },

    resetSearch: function() {
        document.getElementById('adminKeySearch').value = '';
        document.getElementById('adminIsActive').value = 'Pending';
        document.getElementById('adminFromDate').value = '';
        document.getElementById('adminToDate').value = '';
        this.loadData(1);
    },

    renderTable: function(data) {
        const tbody = document.getElementById('application-table-body');
        tbody.innerHTML = ''; 

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">Không có bản ghi nào.</td></tr>`;
            return;
        }

        data.forEach(app => {
            // KHỐI XỬ LÝ NÚT HÀNH ĐỘNG TÙY THEO TRẠNG THÁI
            let actionButtons = `
                <button onclick="AdminApp.viewDetail(${app.id})" class="action-icon text-info" title="Xem chi tiết">
                    <i class="bi bi-eye"></i>
                </button>
            `;

            if (app.status === 'Pending') {
                actionButtons += `
                    <button onclick="AdminApp.approve(${app.id}, '${app.fullName}')" class="action-icon text-success" title="Duyệt hồ sơ">
                        <i class="bi bi-check-circle"></i>
                    </button>
                    <button onclick="AdminApp.openRejectModal(${app.id}, '${app.fullName}')" class="action-icon text-danger" title="Từ chối">
                        <i class="bi bi-x-circle"></i>
                    </button>
                `;
            } else if (app.status === 'Rejected') {
                // Nút Delete chỉ hiện khi đơn đã bị Rejected
                actionButtons += `
                    <button onclick="AdminApp.deleteApp(${app.id}, '${app.fullName}')" class="action-icon text-secondary" title="Xóa vĩnh viễn hồ sơ">
                        <i class="bi bi-trash3"></i>
                    </button>
                `;
            }

            // Badge trạng thái
            let statusHtml = '';
            if (app.status === 'Approved') statusHtml = `<span class="badge rounded-pill border border-success text-success bg-transparent"><i class="bi bi-check-circle-fill me-1"></i> Đã duyệt</span>`;
            else if (app.status === 'Rejected') statusHtml = `<span class="badge rounded-pill border border-danger text-danger bg-transparent"><i class="bi bi-x-circle-fill me-1"></i> Đã từ chối</span>`;
            else statusHtml = `<span class="badge rounded-pill border border-warning text-warning bg-transparent"><i class="bi bi-hourglass-split me-1"></i> Chờ duyệt</span>`;

            const row = `
                <tr id="row-${app.id}">
                    <td class="ps-4 fw-bold text-dark">ID: ${app.id}</td>
                    <td>
                        <div class="fw-bold text-dark">${app.fullName || 'Chưa rõ tên'}</div>
                        <div class="small text-muted">${app.email || ''}</div>
                    </td>
                    <td><div class="truncate-text text-muted" title="${app.bio}">${app.bio || ''}</div></td>
                    <td><div class="truncate-text text-muted" title="${app.experience}">${app.experience || ''}</div></td>
                    <td class="text-center">
                        <a href="${app.cvUrl}" class="text-primary text-decoration-none" target="_blank" title="Mở file CV">
                            <i class="bi bi-file-earmark-pdf fs-4"></i>
                        </a>
                    </td>
                    <td class="text-center">${statusHtml}</td>
                    <td class="text-center pe-4" style="min-width: 120px;">
                        ${actionButtons}
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    },

    renderPagination: function(totalPages, currentPage) {
        const ul = document.getElementById('paging-ul');
        ul.innerHTML = '';
        if(totalPages <= 1) return;

        ul.innerHTML += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="javascript:void(0)" onclick="AdminApp.loadData(${currentPage - 1})">Trước</a>
        </li>`;

        for (let i = 1; i <= totalPages; i++) {
            ul.innerHTML += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="javascript:void(0)" onclick="AdminApp.loadData(${i})">${i}</a>
            </li>`;
        }

        ul.innerHTML += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="javascript:void(0)" onclick="AdminApp.loadData(${currentPage + 1})">Sau</a>
        </li>`;
    },

   approve: async function(id, name) {
    Swal.fire({
        title: `Phê duyệt hồ sơ?`,
        text: `Bạn có chắc chắn muốn cấp quyền giảng viên cho ${name}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#198754',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Đồng ý Duyệt',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const token = localStorage.getItem(this.config.tokenKey);
            try {
                // SỬA LỖI 404: Đảo {id} lên trước /approve cho khớp C#
                const response = await fetch(`${this.config.apiUrl}/${id}/approve`, { 
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    // SỬA LỖI TOAST: Parse JSON để lấy message từ C# trả về
                    const data = await response.json(); 
                    
                    // Ném data.message vào SweetAlert2 (Toast)
                    this.showToast(data.message, 'success'); 
                    
                    this.loadData(this.config.currentPage);
                } else {
                    const err = await response.json();
                    this.showToast(err.message || 'Lỗi khi duyệt.', 'error');
                }
            } catch (error) {
                this.showToast('Lỗi kết nối máy chủ.', 'error');
            }
        }
    });
},

    // 2. Mở Modal Từ chối
    openRejectModal: function(id, name) {
        document.getElementById('rejectAppId').value = id;
        document.getElementById('rejectUserName').innerText = name;
        document.getElementById('rejectReason').value = ''; 
        if(this.rejectModal) this.rejectModal.show();
    },

    // 3. Thực hiện Từ chối
    submitReject: async function() {
        const id = document.getElementById('rejectAppId').value;
        const reason = document.getElementById('rejectReason').value;
        const btn = document.getElementById('btnSubmitReject');

        if (!reason.trim()) {
            this.showToast('Vui lòng nhập lý do từ chối!', 'warning');
            return;
        }

        const token = localStorage.getItem(this.config.tokenKey);
        try {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang xử lý...';

            const response = await fetch(`${this.config.apiUrl}/${id}/reject`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: reason })
            });

            if (response.ok) {
                this.rejectModal.hide();
                this.showToast(`Đã từ chối hồ sơ #${id}.`, 'success');
                this.loadData(this.config.currentPage);
            } else {
                const err = await response.json();
                this.showToast(err.message || 'Lỗi khi từ chối.', 'error');
            }
        } catch (error) {
            this.showToast('Lỗi kết nối.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerText = 'Xác nhận Từ chối';
        }
    },

    // 4. Xóa vĩnh viễn (Chỉ dành cho đơn Rejected)
    deleteApp: async function(id, name) {
        Swal.fire({
            title: 'Bạn có chắc chắn?',
            text: `Xóa vĩnh viễn hồ sơ bị từ chối của ${name}? Hành động này không thể hoàn tác!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545', // Đỏ cho nguy hiểm
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Đồng ý Xóa',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                const token = localStorage.getItem(this.config.tokenKey);
                try {
                    const response = await fetch(`${this.config.apiUrl}/${id}`, {
                        method: 'DELETE', // Phải gọi API HTTP DELETE
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (response.ok) {
                        this.showToast(`Đã xóa thành công hồ sơ #${id}.`, 'success');
                        
                        // Cập nhật giao diện: Xóa dòng đó đi hoặc load lại bảng
                        document.getElementById(`row-${id}`).remove();
                        let total = parseInt(document.getElementById('total-records').innerText);
                        document.getElementById('total-records').innerText = total > 0 ? total - 1 : 0;
                        
                    } else {
                        const err = await response.json();
                        this.showToast(err.message || 'Lỗi khi xóa hồ sơ.', 'error');
                    }
                } catch (error) {
                    this.showToast('Lỗi kết nối máy chủ.', 'error');
                }
            }
        });
    },

    viewDetail: async function(id) {
        // Bật modal lên và show trạng thái Loading
        this.detailModal.show();
        document.getElementById('detailLoading').style.display = 'block';
        document.getElementById('detailContent').style.display = 'none';

        const token = localStorage.getItem(this.config.tokenKey);

        try {
            // Gọi API GetAppAsync mà bạn vừa viết
            const response = await fetch(`${this.config.apiUrl}/${id}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const app = await response.json();
                
                // Đổ dữ liệu vào Modal
                document.getElementById('detailFullName').innerText = app.fullName || 'Chưa cập nhật';
                document.getElementById('detailEmail').innerText = app.email || 'Chưa cập nhật';
                
                // Format ngày (Ví dụ: 15/05/2026 09:40)
                const dateObj = new Date(app.appliedAt);
                document.getElementById('detailAppliedAt').innerText = isNaN(dateObj.getTime()) ? app.appliedAt : dateObj.toLocaleString('vi-VN');

                document.getElementById('detailBio').innerText = app.bio || 'Không có nội dung';
                document.getElementById('detailExperience').innerText = app.experience || 'Không có nội dung';
                document.getElementById('detailCvUrl').href = app.cvUrl || '#';

                // Xử lý huy hiệu Trạng thái
                let statusHtml = '';
                if (app.status === 'Approved') statusHtml = `<span class="badge bg-success py-2 px-3"><i class="bi bi-check-circle-fill me-1"></i> Đã duyệt</span>`;
                else if (app.status === 'Rejected') statusHtml = `<span class="badge bg-danger py-2 px-3"><i class="bi bi-x-circle-fill me-1"></i> Đã từ chối</span>`;
                else statusHtml = `<span class="badge bg-warning text-dark py-2 px-3"><i class="bi bi-hourglass-split me-1"></i> Chờ duyệt</span>`;
                document.getElementById('detailStatus').innerHTML = statusHtml;

                // Tắt Loading, Hiển thị dữ liệu
                document.getElementById('detailLoading').style.display = 'none';
                document.getElementById('detailContent').style.display = 'block';

            } else {
                this.detailModal.hide();
                this.showToast('Không thể tải chi tiết hồ sơ!', 'error');
            }
        } catch (error) {
            this.detailModal.hide();
            this.showToast('Lỗi kết nối máy chủ!', 'error');
        }
    },

    showToast: function(message, iconType) {
        Toast.fire({
            icon: iconType, // 'success', 'error', 'warning', 'info'
            title: message
        });
    }
};

// Chạy ứng dụng khi DOM tải xong
document.addEventListener('DOMContentLoaded', () => {
    AdminApp.init();
});