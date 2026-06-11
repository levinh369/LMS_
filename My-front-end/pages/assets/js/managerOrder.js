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
const AdminOrder = {
    config: {
        pageSize: 10,
        apiUrl: "https://lms-u2jn.onrender.com/api/order" // Đúng Route bác đã viết ở Controller
    },

   init: function () {
    const userInfoRaw = localStorage.getItem("user_info");
    if (userInfoRaw) {
        const user = JSON.parse(userInfoRaw);
        const roleId = parseInt(user.role);
        if (roleId == 3) {
            // Ẩn đi phát là các ô khác tự chia lại tiền/độ rộng ngay lập tức
            document.getElementById("teacherFilterContainer").style.display = "none";
        }else{
            AdminOrder.loadTeacherSelect();
        }
    }
    AdminOrder.renderTableHeader();
    AdminOrder.loadData(1);
},

    // 1. LẤY DANH SÁCH DỮ LIỆU
  loadData: async function(page) {
    const { pageSize, apiUrl } = AdminOrder.config;
    const token = localStorage.getItem('jwt_token');
    TableLoader.show('#admin-order-table-body');

    // Cứ lấy trực tiếp từ các ô input/select, không cần if/else check role ở đây nữa
    const params = new URLSearchParams({
        page: page,
        pageSize: pageSize,
        keySearch: $('#adminSearch').val() || '',
        fromDate: $('#adminFromDate').val() || '', 
        toDate: $('#adminToDate').val() || '',    
        status: $('#adminStatusFilter').val(),
        teacherId: $('#adminTeacherFilter').val() || 0 // Cứ gửi lên, BE tự xử lý phân quyền
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
renderTableHeader: function() {
    const userInfoRaw = localStorage.getItem("user_info");
    const user = JSON.parse(userInfoRaw);
    const roleId = parseInt(user.role);

    let headerHtml = `
        <tr>
            <th class="ps-4">Mã Đơn</th>
            <th>Khách Hàng</th>
            <th>Khóa Học</th>
    `;

    // Cột Giảng viên chỉ hiển thị nếu KHÔNG PHẢI là Giảng viên (RoleId != 3 -> Tức là Admin)
    if (roleId !== 3) {
        headerHtml += `<th>Giảng viên</th>`;
    }

    headerHtml += `
            <th>Số Tiền</th>
            <th class="text-center">Trạng Thái</th>
            <th class="text-center">Hành Động</th>
        </tr>
    `;

    $('#admin-order-table-header').html(headerHtml);
},
    renderTable: function(orders) {
    const userInfoRaw = localStorage.getItem("user_info");
    const user = JSON.parse(userInfoRaw);
    const roleId = parseInt(user.role);

    const html = orders.map(o => {
        // 1. Kiểm tra an toàn dữ liệu từ C# (tùy thuộc DTO trả về)
        const orderId = o.id || o.orderId;
        const customerName = o.user?.fullName || o.customerName || "Khách hàng";
        const customerEmail = o.user?.email || o.customerEmail || "";
        const avatar = o.user?.avatar || o.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(customerName)}&background=random`;
        const courseTitle = o.course?.title || o.courseTitle || "Khóa học học";
        const teacherName = o.course?.user?.fullName || o.teacherName || "Giảng viên"; // Tên GV nếu có
        const totalAmount = o.amount || o.totalAmount || 0;
        const status = o.status;

        // 2. Xây dựng cột Giảng viên động
        let teacherColumn = '';
        if (roleId !== 3) {
            // Nếu là Admin thì sinh thêm chuỗi HTML cho cột Giảng viên
            teacherColumn = `<td><span class="badge bg-light text-dark border">${teacherName}</span></td>`;
        }

        // 3. Xử lý phân quyền cụm nút bấm Hành Động
        let actionButtons = '';
        
        if (roleId === 3) {
            // NẾU LÀ TEACHER: Chỉ cho phép XEM, tuyệt đối không có nút duyệt/hủy
            actionButtons = `
                <button class="btn btn-sm btn-light w-100" title="Xem chi tiết" onclick="AdminOrder.viewDetail(${orderId})">
                    <i class="bi bi-eye text-primary"></i> <small class="text-primary fw-semibold">Xem</small>
                </button>
            `;
        } else {
            // NẾU LÀ ADMIN: Giữ nguyên Group nút cũ (Có Duyệt/Hủy khi Pending)
            actionButtons = `
                <button class="btn btn-sm btn-light border-end" title="Xem chi tiết" onclick="AdminOrder.viewDetail(${orderId})">
                    <i class="bi bi-eye text-primary"></i>
                </button>
            `;

            if (status === 'Pending' || status === 0) {
                actionButtons += `
                    <button class="btn btn-sm btn-light border-end" title="Duyệt đơn" 
                            onclick="AdminOrder.updateStatus(${orderId}, 1)">
                        <i class="bi bi-check-circle text-success"></i>
                    </button>
                    <button class="btn btn-sm btn-light" title="Hủy đơn hàng" 
                            onclick="AdminOrder.updateStatus(${orderId}, 3)">
                        <i class="bi bi-x-circle text-danger"></i>
                    </button>
                `;
            } else {
                actionButtons += `
                    <button class="btn btn-sm btn-light disabled" style="opacity: 0.5;">
                        <i class="bi bi-slash-circle"></i>
                    </button>
                `;
            }
        }

        // 4. Trả về dòng tr hoàn chỉnh
        return `
            <tr>
                <td class="ps-4 fw-bold text-dark">#ORD-${orderId}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${avatar}" class="user-avatar me-2" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover;">
                        <div>
                            <div class="fw-semibold text-dark">${customerName}</div>
                            <small class="text-muted" style="font-size: 0.7rem;">${customerEmail}</small>
                        </div>
                    </div>
                </td>
                <td><div class="text-primary fw-semibold" style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${courseTitle}">${courseTitle}</div></td>
                
                ${teacherColumn} <td><span class="fw-bold">${totalAmount.toLocaleString()}đ</span></td>
                <td class="text-center">${this.getStatusBadge(status)}</td>
                <td class="text-center">
                    <div class="btn-group shadow-sm" style="border-radius: 8px; overflow: hidden;">
                        ${actionButtons}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Tính toán lại colspan: Nếu là Admin thì colspan=7 (vì có thêm cột GV), Teacher thì colspan=6
    const totalColumns = roleId === 3 ? 6 : 7;
    $('#admin-order-table-body').html(orders.length ? html : `<tr><td colspan="${totalColumns}" class="text-center py-5 text-muted">Không tìm thấy đơn hàng nào thỏa mãn điều kiện lọc</td></tr>`);
},
loadTeacherSelect: async function() {
    const token = localStorage.getItem("jwt_token");
    try {
        // SỬA LẠI DÒNG NÀY: Bỏ ${} đi, nối chuỗi bình thường
        const response = await fetch(`https://lms-u2jn.onrender.com/api/Course/get-all-teachers`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const res = await response.json();
        
        if (res.success || res.Success) {
            let html = '<option value="0">Tất cả </option>';
            const teachers = res.data || res.Data;
            
            // Render thẻ option
            teachers.forEach(t => {
                html += `<option value="${t.id}">${t.fullName}</option>`;
            });
            
            // Đổ vào HTML
            $('#adminTeacherFilter').html(html);
        }
    } catch (error) { 
        console.error("Lỗi load giảng viên:", error); 
    }
},
   showPaging: function (totalCount, totalPages, currentPage) {
    // 1. FIX: Sửa từ '#total-recordss' về đúng '#total-records' khớp với HTML
    $('#total-records').text(totalCount);
    
    // Nếu chỉ có 1 trang hoặc không có dữ liệu thì xóa sạch thanh phân trang và dừng lại
    if (totalPages <= 1) {
        $('#paging-ul').empty().removeData("twbs-pagination").unbind("page");
        return;
    }
    
    // Hủy phân trang cũ để tạo cái mới khớp với số lượng trang hiện tại
    $('#paging-ul').twbsPagination('destroy');
    $('#paging-ul').twbsPagination({
        totalPages: totalPages,
        visiblePages: 5,
        startPage: currentPage,
        first: '<i class="bi bi-chevron-double-left"></i>',
        prev: '<i class="bi bi-chevron-left"></i>',
        next: '<i class="bi bi-chevron-right"></i>',
        last: '<i class="bi bi-chevron-double-right"></i>',
        
        onPageClick: (event, page) => {
            if (page !== currentPage) {
                if (typeof this.loadData === 'function') {
                    this.loadData(page);
                }
            }
        }
    });
},
viewDetail: async function(id) {
    const token = localStorage.getItem('jwt_token');
    
    // Lấy Role để check phân quyền hiển thị
    const userInfoRaw = localStorage.getItem("user_info");
    const user = JSON.parse(userInfoRaw);
    const roleId = parseInt(user.role);

    try {
        const response = await fetch(`${this.config.apiUrl}/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error("Lỗi gọi API");
        const res = await response.json();
        
        // Xử lý thông minh: Lấy res.data nếu API bọc trong chuẩn chuẩn DTO, không thì lấy chính nó
        const o = res.data || res.Data || res; 

        // 1. Đổ dữ liệu cột trái (Thông tin chung)
        $('#dtlOrderCode').text(o.orderCode);
        $('#dtlCustomerName').text(o.customerName);
        $('#dtlCustomerEmail').text(o.customerEmail);
        $('#dtlCourseTitle').text(o.courseTitle);
        $('#dtlTeacherName').text(o.teacherName || 'Hệ thống');

        // 2. Đổ dữ liệu cột phải (Tiền nong)
        $('#dtlAmount').text((o.totalAmount || 0).toLocaleString() + 'đ');
        $('#dtlAppliedRate').text(o.appliedRate || 0);
        $('#dtlTeacherAmount').text((o.teacherAmount || 0).toLocaleString() + 'đ');
        $('#dtlAdminAmount').text((o.adminAmount || 0).toLocaleString() + 'đ');
        
        $('#dtlCreatedAt').text(new Date(o.createdAt).toLocaleString('vi-VN'));
        $('#dtlStatusBadge').html(this.getStatusBadge(o.status)); 

        // 3. Đổ dữ liệu VNPay
        $('#dtlVnpayTranNo').text(o.transactionId || 'N/A');
        $('#dtlTransactionStatus').text(o.transactionStatus || 'N/A');
        $('#dtlOrderDesc').text(o.orderDescription || 'Không có mô tả');

        // 4. PHÂN QUYỀN HIỂN THỊ THEO ROLE
        if (roleId === 3) { // NẾU LÀ GIẢNG VIÊN
            // 4.1 Ẩn dòng doanh thu sàn
            $('#adminRevenueRow').hide();
            
            // 4.2 Ẩn tên giảng viên và cái nhãn <p> nằm ngay phía trên nó
            $('#dtlTeacherName').hide();
            $('#dtlTeacherName').prev('p').hide(); 
        } else { // NẾU LÀ ADMIN
            // Hiện đầy đủ tất cả
            $('#adminRevenueRow').show();
            
            $('#dtlTeacherName').show();
            $('#dtlTeacherName').prev('p').show();
        }

        // Bật Modal
        const myModal = new bootstrap.Modal(document.getElementById('adminOrderDetailModal'));
        myModal.show();
    } catch (err) {
        console.error(err);
        Toast.fire({
            icon: 'error',
            title: 'Không lấy được thông tin chi tiết'
        });
    }
},
updateStatus: function(id, statusValue) {
        const config = {
            1: { title: 'Xác nhận duyệt đơn hàng này?', icon: 'question', btn: 'Duyệt ngay!', color: '#1cc88a' }, 
            3: { title: 'Xác nhận hủy đơn hàng này?', icon: 'warning', btn: 'Hủy đơn!', color: '#e74a3b' }        
        };

        const action = config[statusValue];

        Swal.fire({
            title: action.title,
            icon: action.icon,
            showCancelButton: true,
            confirmButtonColor: action.color,
            cancelButtonColor: '#6c757d',
            confirmButtonText: action.btn,
            cancelButtonText: 'Đóng'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // 3. KHÓA MÀN HÌNH BẢO VỆ GIAO DỊCH DUYỆT/HỦY ĐƠN HÀNG
                    GlobalLoader.show();

                    const token = localStorage.getItem('jwt_token');
                    const response = await fetch(`${this.config.apiUrl}/${id}/status`, {
                        method: 'PUT',
                        headers: { 
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json' 
                        },
                        body: statusValue 
                    });

                    if (response.ok) {
                        // ĐỒNG BỘ: Nổ Toast góc phải cực mượt thay vì Swal popup to đùng
                        Toast.fire({
                            icon: 'success',
                            title: statusValue === 1 ? 'Đã duyệt đơn hàng thành công!' : 'Đã hủy đơn hàng thành công!'
                        });
                        this.loadData(1);
                    } else {
                        const errRes = await response.json().catch(() => ({}));
                        Toast.fire({
                            icon: 'error',
                            title: errRes.message || 'Cập nhật trạng thái đơn thất bại!'
                        });
                    }
                } catch (error) {
                    console.error("Lỗi cập nhật trạng thái đơn:", error);
                    Toast.fire({ icon: 'error', title: 'Không thể kết nối đến máy chủ!' });
                } finally {
                    // LUÔN TẮT GLOBAL LOADER KHI XỬ LÝ XONG
                    GlobalLoader.hide();
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
        $('#adminStatusFilter').val('-1');
        this.loadData(1);
    },
    exportExcel: async function() {
        const { apiUrl } = AdminOrder.config;
        const token = localStorage.getItem('jwt_token');

        // 1. Móc đúng bộ lọc Admin đang chọn trên giao diện để gửi lên API
        const params = new URLSearchParams({
            keySearch: $('#adminSearch').val() || '',
            fromDate: $('#adminFromDate').val() || '', 
            toDate: $('#adminToDate').val() || '',    
            status: $('#adminStatusFilter').val(),
            teacherId: $('#adminTeacherFilter').val() || 0
        });

        try {
            // Hiện màn hình chờ Loading chặn thao tác spam nút
            if (typeof GlobalLoader !== 'undefined') GlobalLoader.show();

            // 2. Gọi API lấy file nhị phân (Blob)
            const response = await fetch(`${apiUrl}/export-excel?${params.toString()}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Không thể xuất file Excel lúc này.');

            // Nhận dữ liệu trả về dạng Blob (Binary Large Object)
            const blob = await response.blob();
            
            // 3. Thủ thuật tạo Link ngầm để kích hoạt trình duyệt tự động tải file xuống máy
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Đặt tên file đi kèm ngày tháng năm hiện tại
            const today = new Date().toISOString().slice(0,10).replace(/-/g, "");
            a.download = `Bao_Cao_Doanh_Thu_${today}.xlsx`;
            
            document.body.appendChild(a);
            a.click(); // Kích nổ lệnh tải
            
            // Xóa link ngầm giải phóng bộ nhớ ram browser
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            // Báo Toast chúc mừng
            Toast.fire({ icon: 'success', title: 'Đã xuất và tải file Excel thành công!' });

        } catch (error) {
            console.error("Lỗi xuất Excel: ", error);
            Swal.fire('Lỗi hệ thống', 'Không thể kết nối máy chủ để kết xuất dữ liệu Excel.', 'error');
        } finally {
            // Tắt loader giải phóng màn hình
            if (typeof GlobalLoader !== 'undefined') GlobalLoader.hide();
        }
    }
};

$(document).ready(() => AdminOrder.init());