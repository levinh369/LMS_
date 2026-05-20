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
            tbody.html('<tr><td colspan="6" class="text-center py-5 text-muted"><i class="bi bi-inbox fs-3 d-block mb-2"></i>Chưa có giao dịch nào.</td></tr>');
            $('#total-records').text('0');
            this.showPaging(0, 0, pageIndex); // Xóa phân trang
            return;
        }

        data.forEach(item => {
            let statusHtml = '';
            let bankIconHtml = '';
            let amountClass = 'text-dark';

            if (item.status === 0) {
                statusHtml = `<span class="badge-ft ft-pending">Đang xử lý</span>`;
                bankIconHtml = `<div class="bank-icon-box"><i class="bi bi-bank2"></i></div>`;
            } else if (item.status === 1) {
                statusHtml = `<span class="badge-ft ft-success">Hoàn tất</span>`;
                bankIconHtml = `<div class="bank-icon-box text-success bg-success bg-opacity-10"><i class="bi bi-bank2"></i></div>`;
                amountClass = 'text-success';
            } else {
                statusHtml = `<span class="badge-ft ft-danger">Thất bại</span>`;
                bankIconHtml = `<div class="bank-icon-box text-danger bg-danger bg-opacity-10"><i class="bi bi-exclamation-triangle"></i></div>`;
                amountClass = 'text-dark text-decoration-line-through';
            }

            const dateObj = new Date(item.createdAt);
            const formatVND = new Intl.NumberFormat('vi-VN').format(item.amount) + " đ";
            
            const tr = `
                <tr>
                    <td class="ps-4 text-muted fw-semibold small">#WD${item.id}</td>
                    <td>
                        <div class="d-flex align-items-center gap-3">
                            ${bankIconHtml}
                            <div>
                                <div class="fw-bold text-dark mb-1">${item.bankName}</div>
                                <div class="text-muted small" style="font-family: monospace;">*${item.accountNumber.slice(-4)}</div>
                            </div>
                        </div>
                    </td>
                    <td class="fw-bold ${amountClass}">- ${formatVND}</td>
                    <td class="text-muted small">
                        <div class="fw-semibold text-dark">${dateObj.toLocaleDateString('vi-VN')}</div>
                        ${dateObj.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td>${statusHtml}</td>
                    <td class="pe-4 text-muted small">${item.note || '---'}</td>
                </tr>
            `;
            tbody.append(tr);
        });

        // TÍNH TOÁN VÀ GỌI TWBS-PAGINATION
        const totalPages = Math.ceil(total / this.pageSize);
        this.showPaging(total, totalPages, pageIndex);
    },
    // renderPagination: function(total, currentPage) {
    //     const ul = $('#paging-ul');
    //     ul.empty();
    //     const totalPages = Math.ceil(total / this.pageSize);
    //     if(totalPages <= 1) return;

    //     // Nút Prev
    //     ul.append(`<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link border-0 ${currentPage === 1 ? 'text-muted' : ''}" href="javascript:void(0)" onclick="withdrawTeacher.loadData(${currentPage - 1})"><i class="bi bi-chevron-left"></i></a></li>`);

    //     // Các nút số
    //     for(let i = 1; i <= totalPages; i++){
    //         const activeClass = currentPage === i ? 'active' : '';
    //         const aClass = currentPage === i ? 'bg-light text-dark fw-bold' : 'text-muted';
    //         ul.append(`<li class="page-item ${activeClass}"><a class="page-link border-0 ${aClass}" href="javascript:void(0)" onclick="withdrawTeacher.loadData(${i})">${i}</a></li>`);
    //     }

    //     // Nút Next
    //     ul.append(`<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link border-0 ${currentPage === totalPages ? 'text-muted' : ''}" href="javascript:void(0)" onclick="withdrawTeacher.loadData(${currentPage + 1})"><i class="bi bi-chevron-right"></i></a></li>`);
    // },

    // ===============================================
    // 4. LỌC TRẠNG THÁI (Gắn vào Dropdown Menu)
    // ===============================================
    filter: function(status) {
        this.currentStatus = status;
        this.loadData(1);
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