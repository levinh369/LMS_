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
window.DashboardTeacher = {
    onlineCount: 0, 
    revenueChartInstance: null,
    progressChartInstance: null,

    // 1. Hàm khởi chạy chính khi trang load xong
    init: function () {
        // Cấu hình dải ngày mặc định (Hôm nay và 7 ngày trước) nếu các ô input chưa có giá trị
        if (!$("#filter-start-date").val() || !$("#filter-end-date").val()) {
            const today = new Date();
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(today.getDate() - 6);

            $("#filter-end-date").val(today.toISOString().split('T')[0]);
            $("#filter-start-date").val(sevenDaysAgo.toISOString().split('T')[0]);
        }

        // Tải dữ liệu mặc định lần đầu tiên
        this.loadData();

        // Sự kiện khi nhấn nút "Áp dụng" lọc khoảng thời gian
        $(document).on("click", "#btn-submit-filter", () => {
            this.loadData();
        });

        // Sự kiện Tìm kiếm Khóa học bằng Client-side (Ẩn/Hiện dòng trực tiếp)
        $(document).on("keyup", "#search-course-input", function () {
            let keyword = $(this).val().toLowerCase().trim();
            $(this).closest(".panel").find("table tbody tr").each(function () {
                let courseName = $(this).find(".course-name").text().toLowerCase();
                if (courseName.indexOf(keyword) > -1) {
                    $(this).show();
                } else {
                    $(this).hide();
                }
            });
        });

        $(document).on("click", "#btn-reset-filter", () => {
            const today = new Date();
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(today.getDate() - 6); 

            // Đổ lại ngày mặc định vào 2 ô input date trên giao diện
            $("#filter-end-date").val(today.toISOString().split('T')[0]);
            $("#filter-start-date").val(sevenDaysAgo.toISOString().split('T')[0]);

            // Gọi hàm loadData để kéo lại dữ liệu của 7 ngày mặc định
            this.loadData();
        });

        // Sự kiện Tìm kiếm Học viên Online (Client-side)
        $(document).on("keyup", "#search-online-input", function () {
            let keyword = $(this).val().toLowerCase().trim();
            $("#online-students-container .online-item").each(function () {
                let studentName = $(this).find(".online-name").text().toLowerCase();
                if (studentName.indexOf(keyword) > -1) {
                    $(this).show();
                } else {
                    $(this).hide();
                }
            });
        });
    },

    // 2. Hàm CORE: Gọi API bốc dữ liệu từ Backend C# về
    loadData: function () {
    const token = localStorage.getItem("jwt_token") || localStorage.getItem("token");
    const startDate = $("#filter-start-date").val();
    const endDate = $("#filter-end-date").val();

    // Xây dựng đường dẫn URL kèm Query String lọc ngày tháng
    let apiUrl = "https://lms-u2jn.onrender.com/api/DashBoard/dashboard-data";
    if (startDate && endDate) {
        apiUrl += `?startDate=${startDate}&endDate=${endDate}`;
    }

    $.ajax({
        url: apiUrl,
        type: "GET",
        headers: { "Authorization": "Bearer " + token },
        beforeSend: function() {
            // 1. Bật loader của SweetAlert2 ngay khi bắt đầu gửi request
            Swal.fire({
                title: 'Đang trích xuất dữ liệu...',
                allowOutsideClick: false, // Ngăn người dùng click ra ngoài tắt mất khi đang load
                didOpen: () => { 
                    Swal.showLoading(); 
                }
            });
            $(".stat-value").css("opacity", "0.5");
        },
        success: (response) => {
            // Đổ dữ liệu chữ/số vào HTML
            this.renderDashboardData(response);
            
            // Vẽ lại 2 biểu đồ (Cột doanh thu & Tròn tiến độ)
            if (typeof this.initCharts === "function") {
                this.initCharts(response);
            }
        },
        error: (err) => {
            console.error("❌ Không thể lấy dữ liệu Dashboard giảng viên:", err);
            if(err.status === 401) {
                // Thay vì alert thô, dùng luôn Swal thông báo lỗi cho đồng bộ
                Swal.fire('Hết hạn phiên', 'Vui lòng đăng nhập lại!', 'error');
            } else {
                Swal.fire('Lỗi', 'Không thể tải dữ liệu dashboard!', 'error');
            }
        },
        complete: function() {
            // 2. DÙ THÀNH CÔNG HAY LỖI: Đều đóng loader và trả lại độ sáng cho text
            $(".stat-value").css("opacity", "1");
            
            // Chỉ đóng nếu Swal đang hiển thị loading, tránh đè lên Swal thông báo lỗi ở tầng error
            if (Swal.isLoading()) {
                Swal.close();
            }
        }
    });
},

    openWithDrawModal: function(){
        $('#withdrawForm')[0].reset();
        $('#withdrawModal').modal('show');
    },

   renderDashboardData: function (data) {
    // Hàm phụ hỗ trợ định dạng tiền VNĐ nhanh gọn
    const formatVND = (num) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
            .format(num ?? 0).replace("₫", "đ");
    };

    // --- RENDER KHỐI HẠNG THÀNH VIÊN (RANK CARD) ---
    const currentRank = data.rankName || "Đồng"; 
    const currentTitle = data.rankTitle || "Hạng Đồng";
    const currentCommission = data.commissionRate ?? 0; 

    // 🔥 ĐÃ SỬA: Logic tự động đổi Emoji Huy chương theo Rank từ DB
    let rankIcon = "🥉"; // Mặc định là Đồng
    const rankUpper = currentRank.toUpperCase();
    
    if (rankUpper.includes("BẠC") || rankUpper.includes("SILVER")) {
        rankIcon = "🥈";
    } else if (rankUpper.includes("VÀNG") || rankUpper.includes("GOLD")) {
        rankIcon = "🥇";
    } else if (rankUpper.includes("KIM CƯƠNG") || rankUpper.includes("DIAMOND")) {
        rankIcon = "💎";
    }

    // Đổ data động vào HTML (Bỏ hoàn toàn fix cứng)
    $("#lbl-rank-icon").text(rankIcon);
    $("#lbl-rank-name").text(currentTitle);
    $("header h1").text(`Xin chào, Giảng viên ${data.teacherName || 'Giảng viên'}! 👋`);
    
    let rankNameHtml = `${currentTitle} <span class="commission-tag">Hoa hồng thực nhận: ${currentCommission}%</span>`;
    $(".rank-info .rank-name").html(rankNameHtml);

    // Tính toán tỷ lệ phần trăm tiến trình thăng hạng
    let progressPercent = 0;
    const targetRevenue = data.targetRevenueForRank || 25000000; // Mốc động từ API (ví dụ mốc Bạc: 25.000.000)
    const currentRevenue = data.currentRevenueForRank || 0;

    if (targetRevenue > 0) {
        progressPercent = (currentRevenue / targetRevenue) * 100;
        if (progressPercent > 100) progressPercent = 100; 
    }
    
    $(".progress-labels span:last-child").html(`<strong>${formatVND(currentRevenue)}</strong> / ${formatVND(targetRevenue)}`);
    $(".progress-bar .progress-fill").css("width", progressPercent + "%");

    // ✨ THIẾT KẾ MỚI CHUẨN LOGIC: Tính toán số tiền còn thiếu để thăng hạng (Né từ "Chúc mừng" vô lý khi tài khoản bằng 0)
    if (targetRevenue > currentRevenue) {
        let missingRevenue = targetRevenue - currentRevenue; // Lấy mốc Bạc (25tr) trừ đi doanh thu hiện tại (0đ)
        $(".rank-info p").html(`Tài khoản của bạn đang ở mức <strong>${currentTitle}</strong>. Bạn cần tích lũy thêm <strong>${formatVND(missingRevenue)}</strong> doanh thu nữa để thăng cấp lên <strong>${data.nextRankName || 'Bạc'}</strong>.`);
    } else {
        $(".rank-info p").html(`Chúc mừng! Bạn đã xuất sắc đạt cấp bậc cao nhất hệ thống: <strong>${currentRank}</strong>.`);
    }

    // --- RENDER THÊ THỐNG KÊ NHANH (STATS GRID) ---
    const cards = $(".stats-grid .stat-card");
    
    // Cột 1: Gross
    cards.eq(0).find(".stat-value").text(formatVND(data.totalGrossRevenue));
    cards.eq(0).find(".stat-change").text(data.revenueChangeText || "Chưa có biến động");
    
    // Cột 2: Phí sàn
    cards.eq(1).find(".stat-value").text("-" + formatVND(data.platformFee));
    cards.eq(1).find(".stat-change").text(`Khấu trừ ${100 - currentCommission}% dựa theo hạng ${currentRank}`);
    
    // Cột 3: Thực nhận Net
    cards.eq(2).find(".stat-value").text(formatVND(data.netRevenue));
    
    // Cột 4: Số dư ví khả dụng
    cards.eq(3).find(".stat-value").text(formatVND(data.availableBalance));
    const balance = data.availableBalance || 0;
    const formattedBalance = new Intl.NumberFormat('vi-VN').format(balance);
    const displayBalanceElem = document.getElementById("displayAvailableBalance");
    if (displayBalanceElem) {
        displayBalanceElem.innerText = formattedBalance + " VNĐ";
    }

    // --- RENDER BẢNG HIỆU SUẤT KHÓA HỌC (COURSE PERFORMANCE TABLE) ---
    let tableRows = "";
    if (data.coursePerformances && data.coursePerformances.length > 0) {
        data.coursePerformances.forEach(course => {
            let badge = course.isPro ? '<span class="badge-pro">PRO</span>' : '<span class="badge-free">MIỄN PHÍ</span>';
            tableRows += `
                <tr>
                    <td class="course-name">${course.courseName} ${badge}</td>
                    <td><i class="bi bi-people me-1 text-muted"></i>${course.studentCount}</td>
                    <td class="fw-semibold">${formatVND(course.grossRevenue)}</td>
                    <td class="text-success fw-semibold">${formatVND(course.netRevenue)}</td>
                </tr>`;
        });
    } else {
        tableRows = `<tr><td colspan="4" class="text-center text-muted py-4">Không có dữ liệu khóa học phát sinh doanh thu trong kỳ này.</td></tr>`;
    }
    $(".panel table tbody").html(tableRows);

    // --- RENDER DANH SÁCH GIAO DỊCH GẦN NHẤT ---
    let txHtml = "";
    if (data.recentTransactions && data.recentTransactions.length > 0) {
        data.recentTransactions.forEach(tx => {
            let amtClass = tx.isIncome ? 'up fw-semibold' : 'text-danger fw-semibold';
            let prefix = tx.isIncome ? '+' : '-';
            txHtml += `
                <div style="display: flex; justify-content: space-between; padding: 11px 0; border-bottom: 1px solid #f1f5f9;">
                    <span><i class="bi bi-wallet2 me-2 text-secondary"></i>${tx.description}</span>
                    <span class="${amtClass}">${prefix}${formatVND(tx.amount)}</span>
                </div>`;
        });
    } else {
        txHtml = `<div class="text-muted text-center py-3">Không có giao dịch nào phát sinh gần đây.</div>`;
    }
    $("#recent-transactions-container").html(txHtml);
},
    // 4. Hàm dựng và cập nhật dữ liệu vẽ Biểu đồ Chart.js
    initCharts: function (data) {
        // Khử trùng biểu đồ cũ nếu đã tồn tại để tránh lỗi đè chuột (Hover lag)
        if (this.revenueChartInstance) this.revenueChartInstance.destroy();
        if (this.progressChartInstance) this.progressChartInstance.destroy();

        // A. CẤU HÌNH BIỂU ĐỒ CỘT DOANH THU ĐỘNG
        const ctxRevenue = document.getElementById('revenueChart').getContext('2d');
        this.revenueChartInstance = new Chart(ctxRevenue, {
            type: 'bar',
            data: {
                labels: data.chartLabels, 
                datasets: [{
                    label: 'Doanh thu',
                    data: data.weeklyRevenue, 
                    backgroundColor: '#4f46e5',
                    borderRadius: 5,
                    hoverBackgroundColor: '#4338ca'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ' Doanh thu: ' + new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(context.raw || 0);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { borderDash: [4, 4], color: '#f1f5f9' },
                        ticks: {
                            callback: function(value) {
                                return value >= 1000000 ? (value / 1000000) + 'M' : new Intl.NumberFormat('vi-VN').format(value);
                            }
                        }
                    },
                    x: { grid: { display: false } }
                }
            }
        });

        // B. CẤU HÌNH BIỂU ĐỒ TRÒN TIẾN ĐỘ HỌC TẬP
        $(".donut-center-text .total").text(data.totalStudentsCount);
        
        const legendItems = $(".chart-legend .legend-item");
        legendItems.eq(0).find("strong").text(data.completedPercentage + "%");
        legendItems.eq(1).find("strong").text(data.learningPercentage + "%");
        legendItems.eq(2).find("strong").text(data.notStartedPercentage + "%");

        const ctxProgress = document.getElementById('progressChart').getContext('2d');
        this.progressChartInstance = new Chart(ctxProgress, {
            type: 'doughnut',
            data: {
                labels: ['Đã hoàn thành', 'Đang học', 'Chưa bắt đầu'],
                datasets: [{
                    data: [data.completedPercentage, data.learningPercentage, data.notStartedPercentage],
                    backgroundColor: ['#22c55e', '#4f46e5', '#e2e8f0'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '78%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ' ' + context.label + ': ' + context.raw + '%';
                            }
                        }
                    }
                }
            }
        });
    },

    // Hàm cập nhật danh sách (Copy nguyên si logic của bạn vào)
    updateOnlineStatus: function(user, isOnline) {
    const container = document.getElementById("online-students-container");
    const counter = document.getElementById("online-count");
    const noOneText = document.getElementById("no-one-online");
    const dot = document.getElementById("online-dot");
    
    if (!container) return; // Chốt chặn an toàn

    const elementId = `online-user-${user.userId}`;

    if (isOnline) {
        if (document.getElementById(elementId)) return; // Tránh trùng lặp

        if (noOneText) noOneText.style.display = 'none';

        // XỬ LÝ AVATAR: Kiểm tra xem có link ảnh thật hay không
        let avatarHtml = '';
        if (user.avatar && !user.avatar.includes("default-avatar.png")) {
            // Có ảnh thật -> Dùng thẻ img
            avatarHtml = `<img src="${user.avatar}" alt="${user.userName}" class="user-avatar-img">`;
        } else {
            // Không có ảnh thật -> Dùng chữ cái đầu
            const avatarText = user.userName ? user.userName.substring(0, 2).toUpperCase() : "U";
            avatarHtml = `<div class="avatar-placeholder">${avatarText}</div>`;
        }
        
        // VẼ HTML: Đã gọt bỏ phần text dư thừa, thêm class "slide-in" và "status-indicator"
        // VẼ HTML: Thêm dòng "Đang hoạt động..." cực xịn
        const userHtml = `
            <div class="online-item slide-in" id="${elementId}">
                <div class="avatar-container">
                    ${avatarHtml}
                    <span class="status-indicator"></span> 
                </div>
                <div class="online-info" style="display: flex; flex-direction: column; justify-content: center;">
                    <div class="online-name" style="line-height: 1.2;">${user.userName}</div>
                    <div class="online-status-text" style="font-size: 12px; color: var(--text-sub); margin-top: 3px;">
                        Đang hoạt động...
                    </div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', userHtml);
        
        this.onlineCount++;
        if(counter) counter.innerText = this.onlineCount;
        if(dot) dot.style.display = 'block';

    } else {
        const userElement = document.getElementById(elementId);
        if (userElement) {
            // Thêm hiệu ứng mờ dần trước khi xóa (tùy chọn)
            userElement.style.opacity = '0';
            setTimeout(() => {
                userElement.remove(); 
                
                this.onlineCount--;
                if(counter) counter.innerText = this.onlineCount;
                
                if (this.onlineCount <= 0) {
                    this.onlineCount = 0;
                    if (noOneText) noOneText.style.display = 'block';
                    if (dot) dot.style.display = 'none';
                }
            }, 300); // Đợi 300ms rồi mới xóa hẳn khỏi DOM
        }
    }
},

}
document.addEventListener("DOMContentLoaded", function () {
    
    // 1. Khởi tạo DashboardTeacher nếu có
    if(window.DashboardTeacher) {
        window.DashboardTeacher.init(); 
    }

    const withdrawForm = document.getElementById("withdrawForm");
    const btnSubmit = document.getElementById("btnSubmitWithdraw");
    const amountInput = document.getElementById("withdrawAmount");
    
   if (amountInput) {
    amountInput.addEventListener("input", function (e) {

        let cursorPosition = this.selectionStart;
        let originalLength = this.value.length;

        // Xóa sạch mọi ký tự không phải số (Unikey có sinh ra chữ cũng bị xóa luôn)
        let rawValue = this.value.replace(/\D/g, "");
        
        if (rawValue !== "") {
            this.value = parseInt(rawValue, 10).toLocaleString('en-US');
        } else {
            this.value = "";
        }

        let newLength = this.value.length;
        cursorPosition = cursorPosition + (newLength - originalLength);
        
        this.setSelectionRange(cursorPosition, cursorPosition);
    });
}

    // 3. Xử lý Submit Form rút tiền
    if (withdrawForm) {
        withdrawForm.addEventListener("submit", async function (e) {
            e.preventDefault(); 

            // Lấy chuỗi hiển thị và xóa toàn bộ dấu phẩy để lấy số thực
            const rawAmountStr = amountInput.value.replace(/,/g, '');
            const amount = parseFloat(rawAmountStr);

            if (isNaN(amount) || amount < 50000) {
                Toast.fire({
                    icon: 'error',
                    title: 'Số tiền rút tối thiểu phải là 50,000 VNĐ.'
                });
                amountInput.focus();
                return;
            }

            const bankName = document.getElementById("bankName").value;
            const accountNumber = document.getElementById("accountNumber").value;
            const accountName = document.getElementById("accountName").value;

            // Đổi UI nút bấm
            const originalBtnText = btnSubmit.innerHTML;
            btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...';
            btnSubmit.disabled = true;

            const requestData = {
                Amount: amount, 
                BankName: bankName,
                AccountNumber: accountNumber,
                AccountName: accountName.trim().toUpperCase() 
            };

            const token = localStorage.getItem("jwt_token"); 

            try {
                const response = await fetch('https://lms-u2jn.onrender.com/api/Withdrawal/request', { 
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify(requestData)
                });

                const result = await response.json();

                if (response.ok) {
                    // Thành công: Bắn Toast xanh lá
                    Toast.fire({
                        icon: 'success',
                        title: result.message || 'Tạo lệnh rút tiền thành công!'
                    });
                    if (document.activeElement) {
                        document.activeElement.blur(); 
                    }
                    // Đóng Modal và Reset Form
                    const modalElement = document.getElementById('withdrawModal');
                    const modalInstance = bootstrap.Modal.getInstance(modalElement);
                    modalInstance.hide();
                    withdrawForm.reset();
                    
                    // Cập nhật UI Số dư trực tiếp
                    const balanceElement = document.getElementById("displayAvailableBalance"); 
        
                    if (balanceElement) {
                        let currentText = balanceElement.innerText.replace(/,/g, '').replace(/\./g, '').replace(/[^\d]/g, '');
                        let currentBalance = parseFloat(currentText);
                        
                        if (!isNaN(currentBalance)) {
                            let newBalance = currentBalance - amount;
                            const formattedBalance = new Intl.NumberFormat('vi-VN').format(newBalance);
                            
                            // Cập nhật thẻ text chính
                            balanceElement.innerText = formattedBalance + " VNĐ";

                            // Cập nhật thẻ Card
                            const statValues = document.querySelectorAll(".stat-value");
                            if (statValues.length >= 4) {
                                statValues[3].innerText = formattedBalance + " đ"; 
                            }
                        } 
                    } 

                } else {
                    // Lỗi nghiệp vụ từ Server
                    Toast.fire({
                        icon: 'error',
                        title: result.message || 'Giao dịch không thành công.'
                    });
                }
            } catch (error) {
                console.error("Lỗi:", error);
                Toast.fire({
                    icon: 'error',
                    title: 'Lỗi mạng hoặc máy chủ không phản hồi!'
                });
            } finally {
                // Khôi phục nút bấm
                btnSubmit.innerHTML = originalBtnText;
                btnSubmit.disabled = false;
            }
        });
    }
});