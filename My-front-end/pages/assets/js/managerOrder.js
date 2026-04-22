const AdminOrder = {
    config: {
        pageSize: 10,
        apiUrl: "https://lms-u2jn.onrender.com/api/order" // Đúng Route bác đã viết ở Controller
    },

    init: function () {
        AdminOrder.loadData(1);
       
    },

    // 1. LẤY DANH SÁCH DỮ LIỆU
    loadData: async function(page) {
        const { pageSize, apiUrl } = AdminOrder.config;
        const token = localStorage.getItem('jwt_token');

        // Map đúng ID của các ô Input trong HTML bác gửi
        const params = new URLSearchParams({
            page: page,
            pageSize: pageSize,
            keySearch: $('#adminSearch').val() || '',
            fromDate: $('#adminFromDate').val() || '', // Thêm từ ngày
            toDate: $('#adminToDate').val() || '',     // Thêm đến ngày
            status: $('#adminStatusFilter').val() === 'All' ? -1 : this.mapStatus($('#adminStatusFilter').val())
        });

        try {
            const response = await fetch(`${apiUrl}/list-data?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Mạng lỗi hoặc Server có vấn đề');
            
            const res = await response.json();

            if (res.success) {
                this.renderTable(res.data);
                const totalPages = Math.ceil(res.total / pageSize);
                this.showPaging(res.total, totalPages, page);
            }
        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu:", error);
        }
    },

    // 2. VẼ BẢNG
    renderTable: function(orders) {
    const html = orders.map(o => `
        <tr>
            <td class="ps-4 fw-bold text-dark">#ORD-${o.orderId}</td>
            <td>
                <div class="d-flex align-items-center">
                    <img src="${o.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(o.customerName)}&background=random`}" 
                         class="user-avatar me-2" 
                         style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <div class="fw-semibold text-dark">${o.customerName}</div>
                        <small class="text-muted" style="font-size: 0.7rem;">${o.customerEmail}</small>
                    </div>
                </div>
            </td>
            <td><div class="text-primary fw-semibold" style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${o.courseTitle}</div></td>
            <td><span class="fw-bold">${o.totalAmount.toLocaleString()}đ</span></td>
            <td class="text-center">${this.getStatusBadge(o.status)}</td>
           <td class="text-center">
    <div class="btn-group shadow-sm" style="border-radius: 8px; overflow: hidden;">
        <button class="btn btn-sm btn-light border-end" title="Xem chi tiết" onclick="AdminOrder.viewDetail(${o.orderId})">
            <i class="bi bi-eye text-primary"></i>
        </button>

        ${(o.status === 'Pending' || o.status === 0) ? `
            <button class="btn btn-sm btn-light border-end" title="Duyệt đơn" 
                    onclick="AdminOrder.updateStatus(${o.orderId}, 1)">
                <i class="bi bi-check-circle text-success"></i>
            </button>
            
            <button class="btn btn-sm btn-light" title="Hủy đơn hàng" 
                    onclick="AdminOrder.updateStatus(${o.orderId}, 3)">
                <i class="bi bi-x-circle text-danger"></i>
            </button>
        ` : `
            <button class="btn btn-sm btn-light disabled" style="opacity: 0.5;">
                <i class="bi bi-slash-circle"></i>
            </button>
        `}
    </div>
</td>
        </tr>
    `).join('');
    
    $('#admin-order-table-body').html(orders.length ? html : '<tr><td colspan="6" class="text-center py-5 text-muted">Không tìm thấy đơn hàng nào thỏa mãn điều kiện lọc</td></tr>');
},

    // 3. XỬ LÝ PHÂN TRANG
    showPaging: function (totalCount, totalPages, currentPage) {
        $('#admin-total-records').text(totalCount);
        if (totalPages <= 1) {
            $('#order-pagination').empty().removeData("twbs-pagination").unbind("page");
            return;
        }
        $('#order-pagination').twbsPagination('destroy');
        $('#order-pagination').twbsPagination({
            totalPages: totalPages,
            visiblePages: 5,
            startPage: currentPage,
            first: '<i class="bi bi-chevron-double-left"></i>',
            prev: '<i class="bi bi-chevron-left"></i>',
            next: '<i class="bi bi-chevron-right"></i>',
            last: '<i class="bi bi-chevron-double-right"></i>',
            onPageClick: function (event, page) {
                if (page !== currentPage) {
                    AdminOrder.loadData(page);
                }
            }
        });
    },

    // 4. XEM CHI TIẾT (GỌI API)
    viewDetail: async function(id) {
        const token = localStorage.getItem('jwt_token');
        try {
            const response = await fetch(`${this.config.apiUrl}/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const o = await response.json();

            $('#dtlOrderCode').text(o.orderCode);
            $('#dtlCustomerName').text(o.customerName);
            $('#dtlCustomerEmail').text(o.customerEmail);
            $('#dtlCourseTitle').text(o.courseTitle);
            $('#dtlAmount').text(o.totalAmount.toLocaleString() + 'đ');
            $('#dtlCreatedAt').text(new Date(o.createdAt).toLocaleString('vi-VN'));
            $('#dtlStatusBadge').html(this.getStatusBadge(o.status));
            $('#dtlVnpayTranNo').text(o.transactionId || 'N/A');
            $('#dtlOrderDesc').text(o.orderDescription || 'Không có mô tả');

            const myModal = new bootstrap.Modal(document.getElementById('adminOrderDetailModal'));
            myModal.show();
        } catch (err) {
            Swal.fire('Lỗi', 'Không lấy được thông tin chi tiết', 'error');
        }
    },

    // 5. DUYỆT ĐƠN (GỌI API CONFIRM)
 // 1. Hàm dùng chung để cập nhật trạng thái (Duyệt, Hủy, Lỗi...)
updateStatus: function(id, statusValue) {
    // statusValue bây giờ sẽ là 1 (Success), 3 (Cancelled), v.v.
    const config = {
        1: { title: 'Duyệt đơn?', icon: 'warning', btn: 'Duyệt!', color: '#1cc88a' }, // Success
        3: { title: 'Hủy đơn?', icon: 'error', btn: 'Hủy!', color: '#e74a3b' }        // Cancelled
    };

    const action = config[statusValue];

    Swal.fire({
        title: action.title,
        icon: action.icon,
        showCancelButton: true,
        confirmButtonColor: action.color,
        confirmButtonText: action.btn
    }).then(async (result) => {
        if (result.isConfirmed) {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(`${this.config.apiUrl}/${id}/status`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' 
                },
                body: statusValue // Gửi thẳng con số, không cần JSON.stringify nếu là số đơn giản
            });

            if (response.ok) {
                Swal.fire('Thành công!', 'Trạng thái đã cập nhật.', 'success');
                this.loadData(1);
            }
        }
    });
},
    // 6. CÁC HÀM BỔ TRỢ
    loadRevenue: async function() {
        try {
            const response = await fetch(`${this.config.apiUrl}/revenue/monthly`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
            });
            const res = await response.json();
            $('#total-revenue').text((res.revenue || 0).toLocaleString() + 'đ');
        } catch (e) {}
    },

    getStatusBadge: function(status) {
        switch (status) {
            case 'Success': return '<span class="badge-status bg-success-subtle text-success border border-success">Thành công</span>';
            case 'Pending': return '<span class="badge-status bg-warning-subtle text-warning-emphasis border border-warning">Chờ xử lý</span>';
            case 'Cancelled': return '<span class="badge-status bg-secondary-subtle text-secondary border border-secondary">Đã hủy</span>';
            case 'Failed': return '<span class="badge-status bg-danger-subtle text-danger border border-danger">Lỗi</span>';
            default: return `<span class="badge-status bg-info-subtle">${status}</span>`;
        }
    },

    mapStatus: function(statusStr) {
        const map = { 'Pending': 0, 'Success': 1, 'Failed': 2, 'Cancelled': 3 };
        return map[statusStr] ?? -1;
    },

    applySearch: function() { this.loadData(1); },
    resetSearch: function() {
        $('#adminSearch').val('');
        $('#adminFromDate').val(''); // Reset ngày
        $('#adminToDate').val('');   // Reset ngày
        $('#adminStatusFilter').val('All');
        this.loadData(1);
    },
};

$(document).ready(() => AdminOrder.init());