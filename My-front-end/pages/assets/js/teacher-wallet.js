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

const withdrawTeacher = {
    baseUrl: 'https://lms-u2jn.onrender.com/api/Withdrawal', // Đổi port cho chuẩn với BE của bác
    pageSize: 5, 
    currentStatus: -1, // -1: Tất cả, 0: Chờ duyệt, 1: Thành công, 2: Thất bại
    currentPage: 1,
    // Khởi chạy khi load trang
    init: function() {
        this.loadStats();
        this.loadData(1);
    },

    // ===============================================
    // 1. GỌI API LOAD THỐNG KÊ (4 THẺ ĐẦU TRANG)
    // ===============================================
    loadStats: async function() {
        const token = localStorage.getItem("jwt_token");
        try {
            const res = await fetch(`${this.baseUrl}/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const result = await res.json();
                this.renderStats(result.data);
            }
        } catch (error) {
            console.error("Lỗi lấy thống kê: ", error);
        }
    },

    renderStats: function(data) {
        const formatVND = val => new Intl.NumberFormat('vi-VN').format(val) + " đ";
        
        $('#stat-available').text(formatVND(data.availableBalance));
        $('#stat-pending').text(formatVND(data.pendingAmount));
        $('#stat-pending-count').text(data.pendingCount);
        $('#stat-withdrawn').text(formatVND(data.totalWithdrawn));
        
        // Đổ luôn vào số dư trong Modal rút tiền
        $('#modal-available-balance').text(formatVND(data.availableBalance));
    },

    loadData: async function(pageIndex = 1) {
        // 1. Cập nhật biến currentPage mỗi khi hàm này được gọi
        this.currentPage = pageIndex;

        const token = localStorage.getItem("jwt_token");
        const tbody = $('#teacher-history-body');
        
        // Hiện loading
        tbody.html('<tr><td colspan="6" class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>');

        try {
            // Truyền this.currentPage xuống API
            const res = await fetch(`${this.baseUrl}/history-teacher?pageIndex=${this.currentPage}&pageSize=${this.pageSize}&status=${this.currentStatus}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const result = await res.json();
                // Pass biến xuống renderHistory
                this.renderHistory(result.data, result.total, this.currentPage);
            }
        } catch (error) {
            tbody.html('<tr><td colspan="6" class="text-center py-5 text-danger">Lỗi kết nối máy chủ.</td></tr>');
        }
    },
renderHistory: function(data, total, pageIndex) {
        const tbody = $('#teacher-history-body');
        tbody.empty();

        if (!data || data.length === 0) {
            tbody.html('<tr><td colspan="7" class="text-center py-5 text-muted"><i class="bi bi-receipt fs-1 d-block mb-3 text-light"></i><span class="fw-medium">Chưa có giao dịch rút tiền nào.</span></td></tr>');
            $('#total-records').text('0');
            this.showPaging(0, 0, pageIndex); 
            return;
        }

        data.forEach(item => {
            let statusHtml = '';
            let bankIconHtml = '';
            
            // THÊM BIẾN DẤU (CỘNG/TRỪ) VÀ MÀU SẮC TIỀN TỆ
            let amountSign = '-'; 
            let amountClass = 'text-dark';
            
            let viewBtn = `
                <button class="btn btn-sm btn-light border rounded-circle shadow-sm" style="width: 32px; height: 32px; padding: 0;" title="Xem chi tiết" onclick="withdrawTeacher.viewDetail(${item.id})">
                    <i class="bi bi-eye text-secondary"></i>
                </button>`;
            let actionHtml = viewBtn; 

            if (item.status === 0) {
                // 0: ĐANG XỬ LÝ (Tiền bị giam -> Trừ)
                statusHtml = `<span class="badge bg-warning bg-opacity-10 text-warning px-3 py-2 rounded-pill small fw-semibold"><i class="bi bi-hourglass-split me-1"></i>Đang xử lý</span>`;
                bankIconHtml = `<div class="d-flex justify-content-center align-items-center bg-light text-secondary rounded-circle" style="width: 40px; height: 40px;"><i class="bi bi-bank fs-5"></i></div>`;
                amountSign = '-';
                amountClass = 'text-dark fw-bold';
                
            } else if (item.status === 1) {
                // 1: HOÀN TẤT (Tiền đã ra khỏi ví -> Trừ màu đỏ)
                statusHtml = `<span class="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill small fw-semibold"><i class="bi bi-check-circle-fill me-1"></i>Hoàn tất</span>`;
                bankIconHtml = `<div class="d-flex justify-content-center align-items-center bg-success bg-opacity-10 text-success rounded-circle" style="width: 40px; height: 40px;"><i class="bi bi-bank fs-5"></i></div>`;
                amountSign = '-';
                amountClass = 'text-danger fw-bold'; // Đã rút thành công thì hiện màu đỏ cho đúng logic trừ tiền
                
                actionHtml = `
                    <div class="d-flex flex-nowrap gap-2 justify-content-center align-items-center">
                        ${viewBtn}
                        <button class="btn btn-sm btn-outline-danger fw-semibold rounded-pill px-3 shadow-sm text-nowrap" onclick="withdrawTeacher.dispute(${item.id})" title="Báo lỗi nếu chưa nhận được tiền">
                            <i class="bi bi-exclamation-triangle me-1"></i> Báo lỗi
                        </button>
                    </div>`;
                    
            } else if (item.status === 2) {
                // 2: TỪ CHỐI (Tiền được trả lại -> Cộng màu xanh)
                statusHtml = `<span class="badge bg-danger bg-opacity-10 text-danger px-3 py-2 rounded-pill small fw-semibold"><i class="bi bi-x-circle-fill me-1"></i>Từ chối</span>`;
                bankIconHtml = `<div class="d-flex justify-content-center align-items-center bg-danger bg-opacity-10 text-danger rounded-circle" style="width: 40px; height: 40px;"><i class="bi bi-x-circle fs-5"></i></div>`;
                amountSign = '+';
                amountClass = 'text-success fw-bold'; 
                
            } else if (item.status === 3) {
                // 3: ĐANG KHIẾU NẠI (Tiền vẫn đang bị giam -> Trừ)
                statusHtml = `<span class="badge px-3 py-2 rounded-pill small fw-semibold" style="background: #fce4ec; color: #c2185b;"><i class="bi bi-headset me-1"></i>Đang khiếu nại</span>`;
                bankIconHtml = `<div class="d-flex justify-content-center align-items-center rounded-circle" style="width: 40px; height: 40px; background: #fce4ec; color: #c2185b;"><i class="bi bi-shield-exclamation fs-5"></i></div>`;
                amountSign = '-';
                amountClass = 'text-dark fw-bold'; 
                
            } else if (item.status === 4) {
                // 4: ĐÃ HOÀN VÍ (Tiền được trả lại -> Cộng màu xanh)
                statusHtml = `<span class="badge px-3 py-2 rounded-pill small fw-semibold shadow-sm" style="background: #f5f5f5; color: #616161;"><i class="bi bi-arrow-return-left me-1"></i>Đã hoàn ví</span>`;
                bankIconHtml = `<div class="d-flex justify-content-center align-items-center bg-secondary bg-opacity-10 text-secondary rounded-circle" style="width: 40px; height: 40px;"><i class="bi bi-arrow-counterclockwise fs-5"></i></div>`;
                amountSign = '+';
                amountClass = 'text-success fw-bold'; 
            }

            const dateObj = new Date(item.createdAt);
            const formatVND = new Intl.NumberFormat('vi-VN').format(item.amount) + " đ";
            const noteText = item.note || item.adminNote;
            
            const noteHtml = noteText 
                ? `<div class="text-truncate text-muted small" style="max-width: 160px;" data-bs-toggle="tooltip" title="${noteText}">${noteText}</div>` 
                : `<span class="text-muted small">---</span>`;

            // ÁP DỤNG BIẾN amountSign VÀ amountClass VÀO CỘT TIỀN TỆ
            const tr = `
                <tr class="align-middle transition-all table-hover-row">
                    <td class="ps-4">
                        <span class="badge bg-light border text-secondary font-monospace px-2 py-1">#WD${item.id}</span>
                    </td>
                    <td>
                        <div class="d-flex align-items-center gap-3 py-1">
                            ${bankIconHtml}
                            <div class="d-flex flex-column">
                                <span class="fw-bold text-dark" style="font-size: 0.9rem;">${item.bankName}</span>
                                <span class="text-muted small font-monospace">•••• ${item.accountNumber.slice(-4)}</span>
                            </div>
                        </div>
                    </td>
                    <td class="font-monospace fs-6 ${amountClass}">${amountSign} ${formatVND}</td>
                    <td>
                        <div class="d-flex flex-column text-nowrap">
                            <span class="fw-semibold text-dark small">${dateObj.toLocaleDateString('vi-VN')}</span>
                            <span class="text-muted" style="font-size: 0.8rem;"><i class="bi bi-clock me-1"></i>${dateObj.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                    </td>
                    <td>${statusHtml}</td>
                    <td>${noteHtml}</td>
                    <td class="pe-4 text-center">
                        ${actionHtml}
                    </td>
                </tr>
            `;
            tbody.append(tr);
        });

        const totalPages = Math.ceil(total / this.pageSize);
        this.showPaging(total, totalPages, pageIndex);

        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    },

   dispute: async function(payoutId) {
        // 1. Khung nhập lý do vẫn dùng Swal
        const { value: reason } = await Swal.fire({
            title: 'Báo cáo lỗi giao dịch',
            html: '<p class="text-muted small">Vui lòng kiểm tra kỹ ứng dụng ngân hàng trước khi báo lỗi. Ghi rõ thời gian bạn đã kiểm tra.</p>',
            input: 'textarea',
            inputPlaceholder: 'Ví dụ: Đã qua 24h nhưng tôi chưa nhận được tiền về thẻ Vietcombank...',
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-send me-1"></i> Gửi khiếu nại',
            cancelButtonText: 'Hủy bỏ',
            confirmButtonColor: '#dc3545',
            inputValidator: (value) => {
                if (!value) return 'Bạn cần nhập lý do để Admin có thể đối soát với ngân hàng!';
            }
        });

        // 2. Nếu User đã nhập lý do và bấm Gửi
        if (reason) {
            const token = localStorage.getItem('jwt_token');
            
            // BẬT LOADER CỦA HỆ THỐNG
            GlobalLoader.show(); 
            
            try {
                const res = await fetch(`${this.baseUrl}/${payoutId}/dispute`, { 
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({ reason: reason }) 
                });
                
                if (res.ok) {
                    const result = await res.json();
                    if (result.success) {
                        Toast.fire({
                            icon: 'success',
                            title: 'Đã gửi khiếu nại thành công!'
                        });
                        this.loadData(this.currentPage); 
                    } else {
                        Toast.fire({
                            icon: 'error',
                            title: result.message || 'Lỗi hệ thống'
                        });
                    }
                } else {
                    const errorData = await res.json().catch(() => ({})); 
                    Toast.fire({
                        icon: 'error',
                        title: errorData.message || 'Có lỗi xảy ra khi gửi yêu cầu.'
                    });
                }
            } catch (error) {
                console.error("Lỗi fetch API khiếu nại:", error);
                Toast.fire({
                    icon: 'error',
                    title: 'Không thể kết nối đến máy chủ.'
                });
            } finally {
                // LUÔN LUÔN TẮT LOADER KHI XONG VIỆC (Dù thành công hay sập mạng)
                GlobalLoader.hide(); 
            }
        }
    },
    filter: function(status) {
        this.currentStatus = status;
        this.loadData(1);
    },
   viewDetail: async function(id) {
        const token = localStorage.getItem('jwt_token');
        
        try {
            // GlobalLoader sẽ tự động lo phần xoay xoay ở đây
            const res = await fetch(`${this.baseUrl}/${id}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                const responseData = await res.json();
                const data = responseData.data || responseData; 
                
                const formatVND = new Intl.NumberFormat('vi-VN').format(data.amount) + " đ";
                
                // 1. Đổ dữ liệu text cơ bản
                $('#dtlCode').text(`#WD${data.id}`);
                $('#dtlBankName').text(data.bankName || '---');
                $('#dtlAccountNo').text(data.accountNumber || '---');
                $('#dtlAccountName').text(data.accountName || '---');
                
                // Format lại ngày giờ (VD: 14:30 - 26/05/2026)
                const dateObj = new Date(data.createdAt);
                const timeString = `${dateObj.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} - ${dateObj.toLocaleDateString('vi-VN')}`;
                $('#dtlCreatedAt').text(timeString);
                
                // 2. Xử lý logic Ghi chú
                if (data.note || data.disputeReason || data.adminNote) {
                    let noteText = "";
                    if (data.note) noteText += `<div class="mb-1"><b>Ghi chú duyệt:</b> ${data.note}</div>`;
                    if (data.disputeReason) noteText += `<div class="mb-1 text-danger"><b>Lý do báo lỗi:</b> ${data.disputeReason}</div>`;
                    if (data.adminNote) noteText += `<div class="mb-0 text-success"><b>Admin phản hồi:</b> ${data.adminNote}</div>`;
                    
                    $('#dtlNote').html(noteText);
                    $('#dtlNoteBox').show();
                } else {
                    $('#dtlNoteBox').hide();
                    $('#dtlNote').html('---');
                }

                // 3. Xử lý Badge trạng thái và Định dạng số tiền
                let badge = "";
                let amountElem = $('#dtlAmount');
                
                // Reset lại toàn bộ class màu sắc trước khi gán mới
                amountElem.removeClass('text-success text-danger text-muted text-dark text-decoration-line-through fw-bold');

                if (data.status === 0) {
                    // Đang xử lý: Bị giam tiền -> Trừ màu đen
                    badge = `<span class="badge bg-warning bg-opacity-10 text-warning px-3 py-2 rounded-pill"><i class="bi bi-hourglass-split me-1"></i> Đang chờ duyệt</span>`;
                    amountElem.addClass('text-dark fw-bold').text("- " + formatVND);
                    
                } else if (data.status === 1) {
                    // Hoàn tất: Rút thành công -> Trừ màu đỏ
                    badge = `<span class="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill"><i class="bi bi-check-circle me-1"></i> Đã chuyển khoản</span>`;
                    amountElem.addClass('text-danger fw-bold').text("- " + formatVND);
                    
                } else if (data.status === 2) {
                    // Từ chối: Hủy đơn -> Cộng lại màu xanh
                    badge = `<span class="badge bg-danger bg-opacity-10 text-danger px-3 py-2 rounded-pill"><i class="bi bi-x-circle me-1"></i> Bị từ chối</span>`;
                    amountElem.addClass('text-success fw-bold').text("+ " + formatVND);
                    
                } else if (data.status === 3) {
                    // Đang khiếu nại: Đang chờ check lỗi -> Trừ màu đen
                    badge = `<span class="badge px-3 py-2 rounded-pill" style="background: #fce4ec; color: #c2185b;"><i class="bi bi-headset me-1"></i> Đang khiếu nại</span>`;
                    amountElem.addClass('text-dark fw-bold').text("- " + formatVND);
                    
                } else if (data.status === 4) {
                    // Đã hoàn ví: Admin check xong, bơm lại tiền -> Cộng màu xanh
                    badge = `<span class="badge px-3 py-2 rounded-pill shadow-sm" style="background: #f5f5f5; color: #616161;"><i class="bi bi-arrow-return-left me-1"></i> Đã hoàn ví</span>`;
                    amountElem.addClass('text-success fw-bold').text("+ " + formatVND);
                }
                
                $('#dtlStatusBadge').html(badge);

                // 4. Gọi Bootstrap kích hoạt hiển thị Modal
                const detailModal = new bootstrap.Modal(document.getElementById('withdrawDetailModal'));
                detailModal.show();
                
            } else {
                Swal.fire('Lỗi', 'Không thể lấy dữ liệu chi tiết.', 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Lỗi', 'Lỗi kết nối đến máy chủ.', 'error');
        }
    },
    // ===============================================
    // 5. GỬI YÊU CẦU RÚT TIỀN (SUBMIT FORM)
    // ===============================================
    submitWithdraw: async function() {
        const amount = $('#wd-amount').val();
        const bankName = $('#wd-bank').val();
        const accNum = $('#wd-acc-num').val();
        const accName = $('#wd-acc-name').val();

        if (!amount || !bankName || !accNum || !accName) {
            Toast.fire({ icon: 'warning', title: 'Vui lòng điền đủ thông tin!' });
            return;
        }

        const token = localStorage.getItem("jwt_token");
        const btnSubmit = $('#btn-submit-wd');
        btnSubmit.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span> Đang xử lý...');

        try {
            const res = await fetch(`${this.baseUrl}/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    Amount: parseFloat(amount),
                    BankName: bankName,
                    AccountNumber: accNum,
                    AccountHolderName: accName
                })
            });

            const result = await res.json();
            if (res.ok && result.success) {
                Toast.fire({ icon: 'success', title: result.message });
                $('#modalRequestWithdraw').modal('hide');
                $('#frmWithdraw')[0].reset();
                
                // Reload lại ví và bảng
                this.loadStats();
                this.loadData(1);
            } else {
                Toast.fire({ icon: 'error', title: result.message || 'Lỗi xử lý giao dịch' });
            }
        } catch (error) {
            Toast.fire({ icon: 'error', title: 'Lỗi kết nối máy chủ' });
        } finally {
            btnSubmit.prop('disabled', false).html('Xác nhận rút tiền');
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
                withdrawTeacher.loadData(page); // Gọi lại hàm load dữ liệu của bạn
            }
        }
    });
},
};

// Auto chạy khi tải trang xong
$(document).ready(() => {
    withdrawTeacher.init();
});
$(document).ready(function () {
    // 1. Tải danh sách giao dịch như bình thường
    withdrawTeacher.loadData(1);

    // 2. Đọc URL xem có lệnh mở chi tiết không
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const detailId = urlParams.get('id');

    // NẾU CÓ LỆNH XEM CHI TIẾT
    if (action === 'view_detail' && detailId) {
        // Delay 500ms chờ cái bảng load xong DOM thì mới bật Modal cho mượt
        setTimeout(() => {
            withdrawTeacher.viewDetail(detailId);
        }, 500);

        // Dọn dẹp sạch thanh địa chỉ URL (xóa đoạn ?action=...&id=...)
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    }
});