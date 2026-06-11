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
    
    // 1. FIX: Chỉ giữ lại TableLoader dùng chung, gạt bỏ hoàn toàn đoạn innerHTML spinner thô sơ cũ
    TableLoader.show('#withdrawal-table-body');

    // Bọc lót dấu ?. phòng hờ trường hợp các phần tử filter chưa load kịp trong DOM
    const keyword = document.getElementById('filterKeyword')?.value.trim() || '';
    const status = document.getElementById('filterStatus')?.value || '';
    const fromDate = document.getElementById('filterFromDate')?.value || '';
    const toDate = document.getElementById('filterToDate')?.value || '';

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

        // XỬ LÝ ĐIỀU HƯỚNG QUYỀN TRUY CẬP (401 / 403)
        if (!response.ok) {
            if (response.status === 401) {
                Toast.fire({
                    icon: 'warning',
                    title: 'Phiên đăng nhập đã hết hạn! Đang quay về trang login...'
                });
                setTimeout(() => { window.location.href = 'login.html'; }, 2000);
                return; 
            }
            if (response.status === 403) {
                window.location.href = '/403.html'; 
                return;
            }
            throw new Error('Lỗi kết nối hệ thống (Cổng API hoặc Database)!');
        }
        
        const result = await response.json();

        if (result.success || result.Success) {
            const listData = result.data || result.Data || [];
            
            // 2. FIX: Khai báo rõ ràng dữ liệu tổng số bản ghi và tổng số trang từ API trả về
            const totalCount = result.total || result.Total || 0;
            const totalPages = Math.ceil(totalCount / this.pageSize);

            // Render dữ liệu ra bảng
            this.renderTable(listData);
            
            // Đổ tổng số bản ghi vào text hiển thị bộ đếm
            $('#total-records').text(totalCount); 
            
            // 3. FIX: Truyền chuẩn xác các tham số đã khai báo vào hàm phân trang dùng chung
            if (typeof this.showPaging === 'function') {
                this.showPaging(totalCount, totalPages, pageIndex);
            }
        } else {
            TableLoader.showError('#withdrawal-table-body', result.message || "Không thể lấy dữ liệu yêu cầu.");
        }

    } catch (error) {
        console.error('Lỗi load danh sách rút tiền:', error);
        // ĐỒNG BỘ: Đẩy thông báo lỗi trực tiếp vào thân bảng qua TableLoader
        TableLoader.showError('#withdrawal-table-body', error.message || 'Mất kết nối máy chủ hệ thống.');
        Toast.fire({
            icon: 'error',
            title: error.message || 'Có lỗi xảy ra khi nạp dữ liệu!'
        });
    }
},

    // ==========================================
    // 2. HÀM ĐỔ DATA VÀO BẢNG HTML (RENDER TABLE)
    // ==========================================
 renderTable: function (items) {
        const tableBody = document.getElementById('withdrawal-table-body');
        tableBody.innerHTML = ''; 

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
            const formattedAmount = new Intl.NumberFormat('vi-VN').format(item.amount);
            const formattedDate = new Date(item.createdAt).toLocaleDateString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });

            // 1. TẠO SẴN CÁC NÚT (Ép cứng kích thước 32x32px để icon luôn tròn xoe và nằm giữa)
            const btnView = `
                <button class="btn btn-sm btn-outline-primary rounded-circle shadow-sm d-flex justify-content-center align-items-center" 
                    style="width: 32px; height: 32px; padding: 0;" title="Xem chi tiết" onclick="Withdrawal.viewDetailAdmin(${item.id})">
                    <i class="bi bi-eye"></i>
                </button>`;
                
            const btnApprove = `
                <button class="btn btn-sm btn-success rounded-circle shadow-sm d-flex justify-content-center align-items-center" 
                    style="width: 32px; height: 32px; padding: 0;" title="Duyệt chi tiền" 
                    onclick="Withdrawal.openApproveModal(${item.id}, '${item.teacherName}', ${item.amount}, '${item.bankName}', '${item.accountNumber}', '${item.accountName}')">
                    <i class="bi bi-check-lg"></i>
                </button>`;
                
            const btnReject = `
                <button class="btn btn-sm btn-outline-danger rounded-circle shadow-sm d-flex justify-content-center align-items-center" 
                    style="width: 32px; height: 32px; padding: 0;" title="Từ chối lệnh" onclick="Withdrawal.openRejectModal(${item.id}, ${item.amount})">
                    <i class="bi bi-x-lg"></i>
                </button>`;
                
            const btnRollback = `
                <button class="btn btn-sm rounded-circle shadow-sm d-flex justify-content-center align-items-center" 
                    style="width: 32px; height: 32px; padding: 0; background-color: #ff9800; color: white;" title="Xác nhận lỗi & Hoàn tiền vào ví" 
                    onclick="Withdrawal.rollbackFriendly(${item.id})">
                    <i class="bi bi-arrow-counterclockwise"></i>
                </button>`;

            let statusBadge = '';
            
            // 2. KHUNG LƯỚI GRID (Chia sẵn 3 cột 32px, giúp các icon thẳng hàng dọc tuyệt đối)
            let actionButtons = `<div class="d-grid gap-2 justify-content-center" style="grid-template-columns: 32px 32px 32px;">`;

            // 3. NHÉT NÚT VÀO LƯỚI THEO TRẠNG THÁI
            if (item.status === 0) { 
                statusBadge = `<span class="badge bg-warning bg-opacity-10 text-warning px-3 py-2 rounded-pill small fw-semibold"><i class="bi bi-clock-history me-1"></i> Chờ xử lý</span>`;
                actionButtons += `${btnView}${btnApprove}${btnReject}`;
            } 
            else if (item.status === 1) { 
                statusBadge = `<span class="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill small fw-semibold"><i class="bi bi-check2-circle me-1"></i> Đã hoàn tất</span>`;
                actionButtons += `${btnView}`;
            } 
            else if (item.status === 2) { 
                statusBadge = `
                    <span class="badge bg-danger bg-opacity-10 text-danger px-3 py-2 rounded-pill small fw-semibold" data-bs-toggle="tooltip" title="${item.note || item.adminNote || 'Không có lý do'}">
                        <i class="bi bi-x-circle me-1"></i> Từ chối
                    </span>`;
                actionButtons += `${btnView}`;
            }
            else if (item.status === 3) {
                statusBadge = `
                    <span class="badge px-3 py-2 rounded-pill small fw-bold shadow-sm" style="background-color: #fce4ec; color: #c2185b;" data-bs-toggle="tooltip" title="Lý do: ${item.disputeReason || 'Lỗi giao dịch'}">
                        <i class="bi bi-headset me-1"></i> Khiếu nại
                    </span>`;
                actionButtons += `${btnView}${btnRollback}`;
            }
            else if (item.status === 4) {
                statusBadge = `
                    <span class="badge px-3 py-2 rounded-pill small fw-semibold shadow-sm" style="background-color: #e0e0e0; color: #424242;" data-bs-toggle="tooltip" title="Lý do hoàn: ${item.adminNote || 'Đã hoàn lại tiền vào ví'}">
                        <i class="bi bi-arrow-return-left me-1"></i> Đã hoàn ví
                    </span>`;
                actionButtons += `${btnView}`;
            }

            actionButtons += `</div>`; // Đóng thẻ grid

            // 4. RENDER DÒNG BẢNG
            const rowHtml = `
                <tr>
                    <td class="py-3 ps-4 fw-bold text-secondary align-middle">#${item.id}</td>
                    <td class="py-3 align-middle">
                        <div class="fw-bold text-dark">${item.teacherName}</div>
                        <div class="text-muted small">${item.teacherEmail}</div>
                    </td>
                    <td class="py-3 fw-bold text-danger align-middle">${formattedAmount} đ</td>
                    <td class="py-3 align-middle">
                        <div class="fw-semibold text-primary"><i class="bi bi-bank me-1"></i> ${item.bankName}</div>
                        <div class="small text-dark mb-0"><b>STK:</b> <code>${item.accountNumber}</code></div>
                        <div class="small text-muted" style="text-transform: uppercase;"><b>TÊN:</b> ${item.accountName}</div>
                    </td>
                    <td class="py-3 text-secondary small align-middle">${formattedDate}</td>
                    <td class="text-center py-3 align-middle">${statusBadge}</td>
                    <td class="text-center py-2 pe-4 align-middle">${actionButtons}</td>
                </tr>`;
            
            tableBody.insertAdjacentHTML('beforeend', rowHtml);
        });

        // Kích hoạt lại Tooltip của Bootstrap sau khi render DOM mới
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
        Toast.fire({ icon: 'warning', title: 'Vui lòng nhập lý do từ chối để Giảng viên biết bác ơi!' });
        $('#modalReject-reason').focus();
        return;
    }

    const token = localStorage.getItem("jwt_token");

    // Đổi trạng thái nút bấm cục bộ
    const btnSubmit = $('#modalReject .btn-danger');
    const originalText = btnSubmit.text();
    btnSubmit.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Đang xử lý...');

    try {
        // 1. KHÓA TOÀN MÀN HÌNH BẢO VỆ TIẾN TRÌNH HOÀN TIỀN/HỦY LỆNH
        GlobalLoader.show();

        const response = await fetch(`${this.baseUrl}/admin/process`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                WithdrawalId: parseInt(id),
                IsApproved: false, // false = Từ chối
                Note: reason       
            })
        });

        const result = await response.json();
        
        if (response.ok && (result.success || result.Success)) {
            Toast.fire({ icon: 'success', title: result.message || 'Đã từ chối lệnh rút tiền thành công!' });
            
            $('#modalReject').modal('hide');
            this.loadData(this.currentPage || 1); 
        } else {
            Toast.fire({ icon: 'error', title: result.message || result.Message || 'Có lỗi xảy ra khi xử lý!' });
        }
    } catch (error) {
        console.error("Lỗi từ chối lệnh:", error);
        Toast.fire({ icon: 'error', title: 'Không thể kết nối đến máy chủ!' });
    } finally {
        // 2. NHẢ KHÓA MÀN HÌNH VÀ PHỤC HỒI NÚT BẤM
        GlobalLoader.hide();
        btnSubmit.prop('disabled', false).text(originalText);
    }
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

    // Đổi trạng thái nút bấm cục bộ chống double-click
    const originalText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Đang xử lý...';
    btnSubmit.disabled = true;

    const token = localStorage.getItem("jwt_token");

    try {
        // 3. KHÓA TOÀN MÀN HÌNH CHẶN SPAM KHI ĐANG TRỪ SỐ DƯ/XUẤT LỆNH CHI TIỀN
        GlobalLoader.show();

        const response = await fetch(`${this.baseUrl}/admin/process`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                WithdrawalId: parseInt(id),
                IsApproved: true, // true = Duyệt thành công
                Note: "Hệ thống phê duyệt - Đã chuyển khoản nhanh qua VietQR."
            })
        });

        const result = await response.json();

        if (response.ok && (result.success || result.Success)) {
            Toast.fire({
                icon: 'success',
                title: result.message || 'Đã phê duyệt và hoàn tất đơn rút tiền!'
            });

            // Sử dụng cú pháp đóng modal Bootstrap 5 gốc để triệt tiêu lỗi bóng mờ
            const modalElement = document.getElementById('modalApprove');
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) modalInstance.hide();

            // Tải lại bảng dữ liệu mới nhất
            this.loadData(1);
        } else {
            Toast.fire({
                icon: 'error',
                title: result.message || result.Message || 'Phê duyệt lệnh thất bại!'
            });
        }
    } catch (error) {
        console.error("Lỗi duyệt lệnh:", error);
        Toast.fire({
            icon: 'error',
            title: 'Lỗi kết nối máy chủ, không thể duyệt lệnh!'
        });
    } finally {
        // 4. LUÔN NHẢ MÀN HÌNH VÀ PHỤC HỒI NÚT BẤM Ở KHỐI FINALLY
        GlobalLoader.hide();
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
    },
    rollbackFriendly: async function(id) {
        // 1. Khung nhập lý do (Vẫn dùng Swal to để gõ chữ)
        const { value: adminNote } = await Swal.fire({
            title: 'Xác nhận hoàn tiền lại vào ví?',
            html: '<p class="text-muted small">Hệ thống sẽ cộng trả lại số tiền này vào ví của giảng viên. Hãy nhập lý do đối soát (VD: Lỗi cổng ngân hàng VCB lúc 14h...).</p>',
            input: 'textarea',
            inputPlaceholder: 'Nhập lý do hoàn tiền tại đây...',
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-arrow-counterclockwise me-1"></i> Xác nhận Hoàn ví',
            confirmButtonColor: '#fd7e14', 
            cancelButtonText: 'Hủy bỏ',
            inputValidator: (value) => {
                if (!value) return 'Bác phải nhập lý do hoàn tiền để làm sao kê đối soát!';
            }
        });

        // 2. Nếu Admin nhập lý do và bấm OK
        if (adminNote) {
            const token = localStorage.getItem('jwt_token');
            
            // Bật Loader của hệ thống
            GlobalLoader.show(); 

            try {
                // Đã fix URL chuẩn và Method POST
                const res = await fetch(`${this.baseUrl}/admin/${id}/rollback`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json' 
                    },
                    // Đã bọc object chuẩn DTO cho C#
                    body: JSON.stringify({ adminNote: adminNote }) 
                });

                if (res.ok) {
                    const result = await res.json();
                    
                    if (result.success) {
                        // Ném Toast Thành công
                        Toast.fire({
                            icon: 'success',
                            title: 'Đã hoàn lại tiền vào ví giảng viên.'
                        });
                        
                        // Đóng modal chi tiết giao dịch lại (Nếu đang mở)
                        $('#withdrawDetailModal').modal('hide'); 
                        
                        // Tải lại bảng (Dùng biến cục bộ this hoặc gọi thẳng tên class)
                        this.loadData(this.currentPage || 1); 
                    } else {
                        Toast.fire({
                            icon: 'error',
                            title: result.message || 'Lỗi xử lý hoàn tiền'
                        });
                    }
                } else {
                    // Bắt lỗi 400 từ Controller nếu validate xịt
                    const errorData = await res.json().catch(() => ({})); 
                    Toast.fire({
                        icon: 'error',
                        title: errorData.message || 'Lỗi xác thực từ máy chủ.'
                    });
                }
            } catch (error) {
                console.error("Lỗi fetch API Hoàn tiền:", error);
                Toast.fire({
                    icon: 'error',
                    title: 'Không thể kết nối đến máy chủ.'
                });
            } finally {
                // Luôn tắt Loader khi xong việc
                GlobalLoader.hide(); 
            }
        }
    },
viewDetailAdmin: async function(id) {
        const token = localStorage.getItem('jwt_token');
        try {
            const res = await fetch(`${this.baseUrl}/admin/${id}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const responseData = await res.json();
                const data = responseData.data || responseData;

                // Đổ dữ liệu vào HTML (Sử dụng jQuery)
                $('#dtlAdminCode').text(`#${data.id}`);
                $('#dtlAdminAmount').text(new Intl.NumberFormat('vi-VN').format(data.amount) + " đ");
                $('#dtlAdminTeacher').text(data.teacherName);
                $('#dtlAdminBank').text(data.bankName);
                $('#dtlAdminSTK').text(data.accountNumber);
                $('#dtlAdminAccountName').text(data.accountName); // Nhớ đổ cả Tên tài khoản
                
                // Khung lý do khiếu nại (Gộp cả Note của hệ thống nếu có)
               let noteHtml = "";
                if (data.note) noteHtml += `<div class="mb-1"><b>Ghi chú duyệt:</b> ${data.note}</div>`;
                if (data.disputeReason) noteHtml += `<div class="mb-1 text-danger"><b>Lý do khiếu nại:</b> ${data.disputeReason}</div>`;
                if (data.adminNote) noteHtml += `<div class="mb-0 text-success"><b>Admin phản hồi:</b> ${data.adminNote}</div>`;
                
                if (noteHtml) {
                    $('#dtlAdminDisputeReason').html(noteHtml);
                    // Dùng class của Bootstrap để hiện (thêm d-flex, bỏ d-none)
                    $('#dtlAdminDisputeBox').removeClass('d-none').addClass('d-flex'); 
                } else {
                    // Xóa sạch text cũ để chống lưu "bóng ma"
                    $('#dtlAdminDisputeReason').html(''); 
                    // Dùng class của Bootstrap để ẩn (thêm d-none, bỏ d-flex)
                    $('#dtlAdminDisputeBox').removeClass('d-flex').addClass('d-none');
                }

                // Render nút bấm
                let footerHtml = '';
                if (data.status === 3) { 
                    footerHtml = `
                        <button class="btn btn-warning fw-bold text-white rounded-pill px-4" 
                                onclick="Withdrawal.rollbackFriendly(${data.id})">
                            <i class="bi bi-arrow-counterclockwise me-1"></i> Xác nhận lỗi & Hoàn tiền vào ví
                        </button>
                        <button class="btn btn-secondary rounded-pill px-3" data-bs-dismiss="modal">Đóng</button>`;
                } else {
                    footerHtml = `<button class="btn btn-secondary rounded-pill px-4" data-bs-dismiss="modal">Đóng</button>`;
                }
                $('#admin-modal-footer').html(footerHtml);

                // ==========================================
                // BẬT MODAL AN TOÀN BẰNG JQUERY (CHỐNG LỖI)
                // ==========================================
                // Thay vì dùng bootstrap.Modal.getOrCreateInstance, ta dùng hàm của jQuery
                $('#withdrawDetailAdminModal').modal('show');
                // ==========================================

            } else {
                Swal.fire('Lỗi', 'Không tìm thấy thông tin chi tiết của lệnh khiếu nại này.', 'error');
            }
        } catch (error) {
            console.error("Lỗi tự động mở chi tiết đơn: ", error);
        }
    },
  exportExcel: async function() {
    const token = localStorage.getItem('jwt_token'); // 📍 Đổi thành 'jwt_token' cho khớp hàm 1

    try {
        // 1. 📍 SỬA LOADER: Dùng đúng đối tượng GlobalLoader giống hệt hàm 1
        if (typeof GlobalLoader !== 'undefined') {
            GlobalLoader.show();
        }

        // 2. Thu thập bộ lọc hiện tại trên giao diện
        const keyword = document.getElementById('filterKeyword')?.value.trim() || '';
        const status = document.getElementById('filterStatus')?.value || '';
        const fromDate = document.getElementById('filterFromDate')?.value || '';
        const toDate = document.getElementById('filterToDate')?.value || '';

        const params = new URLSearchParams({
            keyword: keyword,
            status: status,
            fromDate: fromDate,
            toDate: toDate
        });

        // Nối params vào URL endpoint (Đảm bảo đúng đường dẫn API rút tiền của bác)
        const url = `${this.baseUrl}/export-excel?${params.toString()}`;

        // 3. Gửi request lên Backend kèm Token phân quyền
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}` 
            }
        });

        if (!response.ok) {
            throw new Error('Có lỗi xảy ra khi xuất file từ hệ thống.');
        }

        // 4. Chuyển dữ liệu nhận được thành kiểu blob và kích hoạt tải file về máy
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        
        // Đặt tên file đi kèm ngày tháng năm hiện tại giống hàm 1 cho chuyên nghiệp
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        link.download = `Danh_Sach_Rut_Tien_${today}.xlsx`;
        
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);

        // 5. 📍 SỬA TOAST: Dùng Toast.fire đồng bộ phong cách với trang đơn hàng
        if (typeof Toast !== 'undefined') {
            Toast.fire({ icon: 'success', title: 'Đã xuất và tải file Excel thành công!' });
        } else {
            showToast("Xuất và tải file Excel thành công!", "success");
        }

    } catch (error) {
        console.error("Lỗi xuất Excel rút tiền: ", error);
        // 📍 SỬA THÔNG BÁO LỖI: Dùng Swal.fire giống hàm 1 nhìn giao diện cực sang
        if (typeof Swal !== 'undefined') {
            Swal.fire('Lỗi hệ thống', 'Không thể kết nối máy chủ để kết xuất dữ liệu Excel.', 'error');
        } else {
            showToast("Thất bại: " + error.message, "error");
        }
    } finally {
        // 6. 🚨 SỬA LOADER HIDE: Đảm bảo tắt Loader chuẩn xác để mở khóa màn hình
        if (typeof GlobalLoader !== 'undefined') {
            GlobalLoader.hide();
        }
    }
}
};

// Tự động chạy tải dữ liệu khi Admin vừa load trang xong
document.addEventListener("DOMContentLoaded", () => {
    Withdrawal.loadData(1);
});
$(document).ready(function () {
    // 1. Đọc URL để lấy các tham số điều hướng từ thông báo
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const withdrawId = urlParams.get('id');

    // 2. BỘ LỌC THÔNG MINH (Tự động nhảy trạng thái bảng theo loại thông báo)
    if (action === 'view_dispute') {
        // Nếu là thông báo KHIẾU NẠI -> Ép bộ lọc sang danh sách "Đang khiếu nại" (Value = 3)
        $('#filterStatus').val('3');
    } 
    else if (action === 'new_request') {
        // Nếu là thông báo RÚT TIỀN MỚI -> Ép bộ lọc sang danh sách "Chờ xử lý" (Value = 0)
        $('#filterStatus').val('0');
    }

    // 3. TẢI DANH SÁCH (Bảng dưới nền sẽ tự động load đúng danh sách đã lọc ở bước 2)
    Withdrawal.loadData(1);

    // 4. TỰ ĐỘNG BẬT MODAL CHI TIẾT ĐƠN GIAO DỊCH
    if (withdrawId) { 
        // Delay 500ms chờ danh sách render xong cho mượt
        setTimeout(() => {
            Withdrawal.viewDetailAdmin(withdrawId);
        }, 500);

        // Xóa sạch các tham số ?action=...&id=... trên thanh địa chỉ để tránh Admin F5 bị bật lại modal
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    }
});