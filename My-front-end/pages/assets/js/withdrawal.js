// Cấu hình Toast hiển thị thông báo
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

const Withdrawal = {
    baseUrl: 'https://lms-u2jn.onrender.com/api/Withdrawal', // Cổng Backend C# của bác
    pageSize: 10,
    currentPage: 1,
   loadData: async function (pageIndex = 1) {
        this.currentPage = pageIndex;
        const tableBody = document.getElementById('withdrawal-table-body');
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5 text-muted">
                    <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    Đang tải dữ liệu hệ thống...
                </td>
            </tr>`;

        const keyword = document.getElementById('filterKeyword').value.trim();
        const status = document.getElementById('filterStatus').value;
        const fromDate = document.getElementById('filterFromDate').value;
        const toDate = document.getElementById('filterToDate').value;

        const params = new URLSearchParams({
            keyword: keyword,
            status: status,
            fromDate: fromDate,
            toDate: toDate,
            pageIndex: pageIndex,
            pageSize: this.pageSize
        });

        const token = localStorage.getItem("jwt_token");

        try {
            const response = await fetch(`${this.baseUrl}/admin/list?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            // ================================================================
            // XỬ LÝ ĐIỀU HƯỚNG WEB KHI KHÔNG CÓ QUYỀN (401 / 403)
            // ================================================================
            if (!response.ok) {
                if (response.status === 401) {
                    // 401 Unauthorized: Chưa đăng nhập hoặc token bốc hơi
                    Toast.fire({
                        icon: 'warning',
                        title: 'Phiên đăng nhập đã hết hạn! Đang quay về trang login...'
                    });
                    setTimeout(() => {
                        window.location.href = 'login.html'; // Đường dẫn trang đăng nhập của bác
                    }, 2000);
                    return; // Chặn không cho chạy code phía dưới
                }
                
                if (response.status === 403) {
                    // 403 Forbidden: Đã đăng nhập nhưng là Giảng viên/Học viên, KHÔNG PHẢI ADMIN!
                    // Đá thẳng họ sang trang báo lỗi 403
                    window.location.href = '/403.html'; // Bác tạo file 403.html chung thư mục nhé
                    return;
                }

                throw new Error('Lỗi kết nối hệ thống (Cổng API hoặc Database)!');
            }
            
            const result = await response.json();

            if (result.success) {
                this.renderTable(result.data);
                document.getElementById('total-records').innerText = result.total;
                this.renderPagination(result.total, pageIndex);
            } else {
                this.showErrorRow("Không thể lấy dữ liệu yêu cầu.");
            }

        } catch (error) {
            console.error('Lỗi load danh sách rút tiền:', error);
            this.showErrorRow(error.message);
            Toast.fire({
                icon: 'error',
                title: error.message
            });
        }
    },

    // ==========================================
    // 2. HÀM ĐỔ DATA VÀO BẢNG HTML (RENDER TABLE)
    // ==========================================
    renderTable: function (items) {
        const tableBody = document.getElementById('withdrawal-table-body');
        tableBody.innerHTML = ''; // Xóa sạch dữ liệu cũ/loading đi

        if (!items || items.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5 text-muted">
                        <i class="bi bi-inbox fs-4 d-block mb-2"></i> Không tìm thấy yêu cầu rút tiền nào khớp.
                    </td>
                </tr>`;
            return;
        }

        items.forEach(item => {
            // Định dạng tiền tệ VND (Ví dụ: 500.000 đ)
            const formattedAmount = new Intl.NumberFormat('vi-VN').format(item.amount);
            
            // Định dạng ngày tạo (Ngày/Tháng/Năm)
            const formattedDate = new Date(item.createdAt).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            let statusBadge = '';
            let actionButtons = '';
            if (item.status === 0) { 
                statusBadge = `<span class="badge bg-warning bg-opacity-10 text-warning px-3 py-2 rounded-pill small fw-semibold"><i class="bi bi-clock-history me-1"></i> Chờ xử lý</span>`;
                
                // Đã thêm: bankName, accountNumber, accountName vào trong hàm onclick của nút Duyệt
                actionButtons = `
                    <div class="d-flex justify-content-center gap-2">
                        <button class="btn btn-sm btn-success rounded-circle" title="Duyệt chi tiền" 
                            onclick="Withdrawal.openApproveModal(${item.id}, '${item.teacherName}', ${item.amount}, '${item.bankName}', '${item.accountNumber}', '${item.accountName}')">
                            <i class="bi bi-check-lg"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger rounded-circle" title="Từ chối lệnh" 
                            onclick="Withdrawal.openRejectModal(${item.id}, ${item.amount})">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>`;
            }
                        else if (item.status === 1) { 
                statusBadge = `<span class="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill small fw-semibold"><i class="bi bi-check2-circle me-1"></i> Đã hoàn tất</span>`;
                actionButtons = `<span class="text-muted small">N/A</span>`;
            } 
            else if (item.status === 2) { 
                statusBadge = `
                    <span class="badge bg-danger bg-opacity-10 text-danger px-3 py-2 rounded-pill small fw-semibold" data-bs-toggle="tooltip" title="${item.note || 'Không có lý do'}">
                        <i class="bi bi-x-circle me-1"></i> Đã từ chối
                    </span>`;
                actionButtons = `<button class="btn btn-sm btn-light border text-secondary rounded-circle" title="Xem lý do từ chối" onclick="alert('Lý do hủy: ${item.note || "Không rõ"}')"><i class="bi bi-info-circle"></i></button>`;
            }

            // Tiến hành dựng chuỗi HTML cho dòng <tr>
            const rowHtml = `
                <tr>
                    <td class="py-3 ps-4 fw-bold text-secondary">#${item.id}</td>
                    <td class="py-3">
                        <div class="fw-bold text-dark">${item.teacherName}</div>
                        <div class="text-muted small">${item.teacherEmail}</div>
                    </td>
                    <td class="py-3 fw-bold text-danger">${formattedAmount} đ</td>
                    <td class="py-3">
                        <div class="fw-semibold text-primary"><i class="bi bi-bank me-1"></i> ${item.bankName}</div>
                        <div class="small text-dark mb-0"><b>STK:</b> <code>${item.accountNumber}</code></div>
                        <div class="small text-muted" style="text-transform: uppercase;"><b>TÊN:</b> ${item.accountName}</div>
                    </td>
                    <td class="py-3 text-secondary small">${formattedDate}</td>
                    <td class="text-center py-3">${statusBadge}</td>
                    <td class="text-center py-3 pe-4">${actionButtons}</td>
                </tr>`;
            
            tableBody.insertAdjacentHTML('beforeend', rowHtml);
        });

        // Kích hoạt tính năng Tooltip của Bootstrap (Nếu có dùng để di chuột xem lý do hủy)
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    },
    openRejectModal: function(id, amount) {
        // Format lại tiền tệ cho đẹp mắt
        const formatVND = new Intl.NumberFormat('vi-VN').format(amount) + " đ";

        // Bơm dữ liệu vào các ID trong Modal mà bác đã đánh dấu
        $('#modalReject-id').text(id);
        $('#modalReject-amount').text(formatVND);
        $('#modalReject-hiddenId').val(id); // Lưu ngầm ID để tí nữa Submit dùng tới
        
        // Xóa trắng lý do của lần mở trước (nếu có)
        $('#modalReject-reason').val('');

        // Mở Modal lên
        $('#modalReject').modal('show');
    },
    submitReject: async function() {
        const id = $('#modalReject-hiddenId').val();
        const reason = $('#modalReject-reason').val().trim();

        // Validate: Bắt buộc nhập lý do
        if (!reason) {
            Swal.fire({ icon: 'warning', title: 'Thiếu thông tin', text: 'Vui lòng nhập lý do từ chối để Giảng viên biết!'});
            $('#modalReject-reason').focus();
            return;
        }

        const token = localStorage.getItem("jwt_token");

        // Đổi trạng thái nút bấm để chống Spam click
        const btnSubmit = $('#modalReject .btn-danger');
        const originalText = btnSubmit.text();
        btnSubmit.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Đang xử lý...');

        try {
            // Gọi cái API Process (dùng chung) mà anh em mình vừa viết
            const res = await fetch(`${this.baseUrl}/admin/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    WithdrawalId: parseInt(id),
                    IsApproved: false, // false = Từ chối
                    Note: reason       // Kèm lý do
                })
            });

          const result = await res.json();
            
            if (res.ok && result.success) {
                Toast.fire({ icon: 'success', title: result.message });
                
                $('#modalReject').modal('hide');
                this.loadData(this.currentPage); 
            } else {
                Toast.fire({ icon: 'error', title: result.message || 'Có lỗi xảy ra khi xử lý!' });
            }
        } catch (error) {
            Toast.fire({ icon: 'error', title: 'Không thể kết nối đến máy chủ!' });
        } finally {
            btnSubmit.prop('disabled', false).text(originalText);
        }
    },
    renderPagination: function (totalRecords, currentPage) {
        const pagingUl = document.getElementById('paging-ul');
        pagingUl.innerHTML = '';
        
        const totalPages = Math.ceil(totalRecords / this.pageSize);
        if (totalPages <= 1) return; // Nếu chỉ có 1 trang thì ẩn luôn thanh chuyển trang

        // Nút Quay lại (Previous)
        pagingUl.insertAdjacentHTML('beforeend', `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-item page-link" href="javascript:void(0)" onclick="Withdrawal.loadData(${currentPage - 1})"><i class="bi bi-chevron-left"></i></a>
            </li>`);

        // Sinh các số trang (1, 2, 3...)
        for (let i = 1; i <= totalPages; i++) {
            pagingUl.insertAdjacentHTML('beforeend', `
                <li class="page-item ${currentPage === i ? 'active' : ''}">
                    <a class="page-item page-link" href="javascript:void(0)" onclick="Withdrawal.loadData(${i})">${i}</a>
                </li>`);
        }

        // Nút Tiếp theo (Next)
        pagingUl.insertAdjacentHTML('beforeend', `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-item page-link" href="javascript:void(0)" onclick="Withdrawal.loadData(${currentPage + 1})"><i class="bi bi-chevron-right"></i></a>
            </li>`);
    },

    // ==========================================
    // 4. HÀM RESET BỘ LỌC (LÀM MỚI TÌM KIẾM)
    // ==========================================
    resetFilter: function () {
        document.getElementById('filterKeyword').value = '';
        document.getElementById('filterStatus').value = '0'; // Trở về mặc định chờ duyệt
        document.getElementById('filterFromDate').value = '';
        document.getElementById('filterToDate').value = '';
        this.loadData(1); // Tải lại trang đầu tiên
    },

    // Hàm phụ hiển thị dòng thông báo lỗi lên table
    showErrorRow: function (msg) {
        document.getElementById('withdrawal-table-body').innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5 text-danger fw-semibold">
                    <i class="bi bi-exclamation-triangle fs-4 d-block mb-2"></i> Thất bại: ${msg}
                </td>
            </tr>`;
    },
    openApproveModal: function (id, teacherName, amount, bankName, accountNumber, accountName) {
        // Đổ các thông tin cơ bản vào Modal
        document.getElementById('modalApprove-id').innerText = `#${id}`;
        document.getElementById('modalApprove-teacherName').innerText = teacherName;
        document.getElementById('modalApprove-amount').innerText = new Intl.NumberFormat('vi-VN').format(amount) + " đ";
        
        // Gài ID ngầm vào thẻ hidden input để lúc nhấn xác nhận còn biết duyệt đơn nào
        document.getElementById('modalApprove-hiddenId').value = id;

        // --- TỰ ĐỘNG SINH MÃ VIETQR ĐỂ ADMIN QUÉT TRÊN ĐIỆN THOẠI ---
        // Sử dụng API miễn phí của VietQR để gen ảnh QR động
        const bankBin = this.getBankBin(bankName); // Chuẩn hóa tên ngân hàng thành mã rút gọn (VD: Vietcombank -> VCB)
        const description = encodeURIComponent(`LMS chuyen khoan rut tien GD ${id}`);
        const encodedAccountName = encodeURIComponent(accountName);
        
        // Link API VietQR chuẩn để tự điền số tiền và nội dung chuyển khoản
        const qrUrl = `https://img.vietqr.io/image/${bankBin}-${accountNumber}-compact.png?amount=${amount}&addInfo=${description}&accountName=${encodedAccountName}`;
        
        // Gán link ảnh vào thẻ img trong modal
        document.getElementById('modalApprove-qrImg').src = qrUrl;

        // Kích hoạt hiển thị Modal bằng Bootstrap 5
        const modalElement = document.getElementById('modalApprove');
        const modalInstance = new bootstrap.Modal(modalElement);
        modalInstance.show();
    },
    submitApprove: async function () {
        const id = document.getElementById('modalApprove-hiddenId').value;
        const btnSubmit = document.querySelector("#modalApprove .btn-success");

        // Đổi trạng thái nút bấm để chống bấm double-click liên tục
        const originalText = btnSubmit.innerHTML;
        btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Đang xử lý...';
        btnSubmit.disabled = true;

        const token = localStorage.getItem("jwt_token");

        try {
            // Gọi trỏ đúng vào Endpoint duyệt đơn của Admin
            const response = await fetch(`${this.baseUrl}/admin/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    WithdrawalId: parseInt(id),
                    IsApproved: true, // true nghĩa là Duyệt thành công
                    Note: "Hệ thống phê duyệt - Đã chuyển khoản nhanh qua VietQR."
                })
            });

            const result = await response.json();

            if (response.ok) {
                Toast.fire({
                    icon: 'success',
                    title: result.message || 'Đã phê duyệt và hoàn tất đơn rút tiền!'
                });

                // Đóng modal sau khi duyệt xong
                const modalElement = document.getElementById('modalApprove');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) modalInstance.hide();

                // Tải lại bảng dữ liệu mới nhất (để cập nhật trạng thái dòng vừa duyệt thành "Đã hoàn tất")
                this.loadData(1);
            } else {
                Toast.fire({
                    icon: 'error',
                    title: result.message || 'Phê duyệt thất bại!'
                });
            }
        } catch (error) {
            console.error("Lỗi duyệt lệnh:", error);
            Toast.fire({
                icon: 'error',
                title: 'Lỗi kết nối máy chủ, không thể duyệt lệnh!'
            });
        } finally {
            // Khôi phục lại trạng thái nút bấm ban đầu
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
        }
    },
    getBankBin: function (bankName) {
        if (!bankName) return 'MB'; // Mặc định nếu không có tên ngân hàng
        const name = bankName.toLowerCase();
        
        if (name.includes('vietcombank') || name.includes('vcb')) return 'VCB';
        if (name.includes('mb') || name.includes('quandoi') || name.includes('military')) return 'MB';
        if (name.includes('techcombank') || name.includes('tcb')) return 'TCB';
        if (name.includes('vietinbank')) return 'ICB';
        if (name.includes('bidv')) return 'BIDV';
        if (name.includes('agribank')) return 'VBA';
        if (name.includes('acb')) return 'ACB';
        if (name.includes('sacombank')) return 'STB';
        if (name.includes('tpbank')) return 'TPB';
        
        return 'MB'; // Không khớp cái nào thì nhảy về MB làm dự phòng
    }
};

// Tự động chạy tải dữ liệu khi Admin vừa load trang xong
document.addEventListener("DOMContentLoaded", () => {
    Withdrawal.loadData(1);
});