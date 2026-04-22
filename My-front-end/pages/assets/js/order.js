const OrderApp = {
    init: function () {
        this.fetchOrders();
    },
    currentOrders: [],
    fetchOrders: function () {
        const token = localStorage.getItem("jwt_token");
        const $list = $('#orderList');
        const $noOrder = $('#noOrder');

        $.ajax({
            url: "https://lms-u2jn.onrender.com/api/User/my-orders", // Thay bằng URL API thật của bác
            type: 'GET',
            headers: { "Authorization": "Bearer " + token },
            success: (res) => {
                const orders = res.data || res;
                OrderApp.currentOrders = res.data || res;
                $list.empty();

                if (!orders || orders.length === 0) {
                    $noOrder.removeClass('d-none');
                    return;
                }

                let html = '';
                orders.forEach(order => {
                    html += this.generateOrderHtml(order);
                });
                $list.append(html);
            },
            error: (err) => {
                console.error("Lỗi lấy đơn hàng:", err);
                $list.html('<div class="text-center text-danger p-5">Không thể tải danh sách đơn hàng. Vui lòng thử lại!</div>');
            }
        });
    },

    generateOrderHtml: function (order) {
        // Xử lý logic hiển thị dựa trên Status từ DTO của bác
        const isSuccess = order.status === "Success" || order.status === "1";
        
        const statusBadge = isSuccess 
            ? `<div class="status-badge status-success"><i class="bi bi-check-circle-fill me-1"></i> Thanh toán thành công</div>`
            : `<div class="status-badge status-pending"><i class="bi bi-clock-history me-1"></i> Đang chờ thanh toán</div>`;

        const actionButtons = isSuccess
            ? `<button class="btn btn-detail btn-sm" onclick="OrderApp.viewInvoice('${order.orderCode}')">Xem hóa đơn</button>
               <a href="/learn/learning.html?id=${order.courseId}" class="btn btn-learn btn-sm">Vào học ngay</a>`
            : `<button class="btn btn-detail btn-sm text-danger border-danger">Hủy đơn</button>
               <button onclick="Detail.handlePayment(${order.courseId},${order.orderId})" class="btn btn-warning btn-sm fw-bold rounded-3 px-4 shadow-sm">Thanh toán ngay</button>`;

        const formattedDate = new Date(order.createdAt).toLocaleDateString('vi-VN');
        const formattedPrice = new Intl.NumberFormat('vi-VN').format(order.totalAmount) + 'đ';

        return `
            <div class="order-item shadow-sm">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div class="text-muted small">Mã đơn: <b>#${order.orderCode}</b> | ${formattedDate}</div>
                    ${statusBadge}
                </div>
                
                <div class="d-flex align-items-center mb-3 ${!isSuccess ? 'text-secondary' : ''}" style="${!isSuccess ? 'opacity: 0.8;' : ''}">
                    <img src="${order.avatarUrl || '/img/default-course.png'}" class="course-preview me-3">
                    <div class="flex-grow-1">
                        <h5 class="fw-bold mb-1">${order.courseTitle}</h5>
                        <div class="text-muted small">Giảng viên: System</div>
                    </div>
                    <div class="text-end">
                        <div class="price ${!isSuccess ? 'text-secondary' : ''}">${formattedPrice}</div>
                    </div>
                </div>

                <div class="d-flex justify-content-end gap-2 pt-3 border-top">
                    ${actionButtons}
                </div>
            </div>`;
    },
viewInvoice: function (orderCode) {
    const order = this.currentOrders.find(o => o.orderCode === orderCode);
    if (!order) return;

    // Lấy thông tin khách hàng từ localStorage (user_info)
    const userInfoString = localStorage.getItem("user_info");
    let userInfo = {};
    try {
        userInfo = userInfoString ? JSON.parse(userInfoString) : {};
    } catch (e) {
        console.error("Lỗi parse user_info:", e);
    }

    const name = userInfo.username || userInfo.FullName || "Người dùng LMS";
    const email = userInfo.email || "Chưa cập nhật";

    const invoiceHtml = `
        <div class="invoice-wrapper p-2">
            <div class="d-flex justify-content-between align-items-start mb-4">
                <div>
                    <h4 class="fw-bold text-primary mb-1">LMS PRO</h4>
                    <p class="small text-muted mb-0">Hệ thống học lập trình trực tuyến</p>
                </div>
                <div class="text-end">
                    <h5 class="fw-bold mb-0">HÓA ĐƠN</h5>
                    <span class="badge bg-success">ĐÃ THANH TOÁN</span>
                </div>
            </div>

            <hr>

            <div class="row mb-4">
                <div class="col-7">
                    <p class="small text-muted mb-1 text-uppercase">Khách hàng:</p>
                    <p class="fw-bold mb-0">${name}</p>
                    <p class="small text-muted">${email}</p>
                </div>
                <div class="col-5 text-end">
                    <p class="small text-muted mb-1 text-uppercase">Mã đơn hàng:</p>
                    <p class="fw-bold mb-1">#${order.orderCode}</p>
                    <p class="small text-muted">${new Date(order.createdAt).toLocaleString('vi-VN')}</p>
                </div>
            </div>

            <div class="table-responsive mb-4">
                <table class="table table-bordered">
                    <thead class="bg-light">
                        <tr>
                            <th class="small text-uppercase">Nội dung khóa học</th>
                            <th class="text-end small text-uppercase">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <div class="fw-bold text-dark">${order.courseTitle}</div>
                                <div class="small text-muted">Thời hạn: Sử dụng vĩnh viễn</div>
                            </td>
                            <td class="text-end fw-bold align-middle">
                                ${new Intl.NumberFormat('vi-VN').format(order.totalAmount)}đ
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="d-flex justify-content-end mt-4">
                <div style="min-width: 320px; width: 100%; max-width: 400px;">
                    <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom border-light">
                        <span class="text-muted fw-medium small">Phương thức thanh toán</span>
                        <span class="text-dark fw-bold small">
                            <i class="bi bi-wallet2 text-primary me-2"></i>Cổng VNPAY
                        </span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom border-light">
                        <span class="text-muted fw-medium small">Tạm tính</span>
                        <span class="text-dark fw-bold small">${new Intl.NumberFormat('vi-VN').format(order.totalAmount)}đ</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom border-light">
                        <span class="text-muted fw-medium small">Giảm giá</span>
                        <span class="text-success fw-bold small">- 0đ</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center pt-3 mt-2">
                        <span class="text-dark fw-bold text-uppercase small" style="letter-spacing: 1px;">Thanh toán thực tế</span>
                        <span class="fw-bold text-primary fs-3">
                            ${new Intl.NumberFormat('vi-VN').format(order.totalAmount)}đ
                        </span>
                    </div>
                    <div class="text-end mt-2">
                        <small class="text-muted italic" style="font-size: 0.7rem;">(Đã bao gồm các loại thuế và phí dịch vụ)</small>
                    </div>
                </div>
            </div>

            <div class="mt-5 pt-3 border-top text-center">
                <p class="small text-muted mb-1">Cảm ơn bác <b>${name}</b> đã ủng hộ đội ngũ!</p>
                <div class="d-flex justify-content-center gap-3 mt-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg" width="60" class="opacity-50" title="Mã xác thực hóa đơn">
                    <div class="text-start" style="font-size: 0.7rem; color: #aaa;">
                        Mã xác thực: ${btoa(order.orderCode).substring(0, 12).toUpperCase()}<br>
                        Hệ thống tự động ký duyệt.
                    </div>
                </div>
            </div>
        </div>
    `;

    $('#invoiceContent').html(invoiceHtml);
    const modal = new bootstrap.Modal(document.getElementById('invoiceModal'));
    modal.show();
}
};

// Khởi chạy khi trang load xong
$(document).ready(function () {
    OrderApp.init();
});