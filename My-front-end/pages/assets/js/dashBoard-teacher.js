window.DashboardTeacher = {
    onlineCount: 0, // Biến đếm nằm ở đây cho gọn
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
            sevenDaysAgo.setDate(today.getDate() - 6); // Lùi lại 6 ngày + hôm nay là tròn 7 ngày

            // Đổ lại ngày mặc định vào 2 ô input ô date trên giao diện
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
        let apiUrl = "http://127.0.0.1:5000/api/DashBoard/dashboard-data";
        if (startDate && endDate) {
            apiUrl += `?startDate=${startDate}&endDate=${endDate}`;
        }

        $.ajax({
            url: apiUrl,
            type: "GET",
            headers: { "Authorization": "Bearer " + token },
            beforeSend: function() {
                // Có thể đắp thêm hiệu ứng loading vào đây nếu muốn
                $(".stat-value").css("opacity", "0.5");
            },
            success: (response) => {
                $(".stat-value").css("opacity", "1");
                // Đổ dữ liệu chữ/số vào HTML
                this.renderDashboardData(response);
                
                // Vẽ lại 2 biểu đồ (Cột doanh thu & Tròn tiến độ)
                this.initCharts(response);
            },
            error: (err) => {
                $(".stat-value").css("opacity", "1");
                console.error("❌ Không thể lấy dữ liệu Dashboard giảng viên:", err);
                if(err.status === 401) {
                    alert("Phiên làm việc hết hạn, vui lòng đăng nhập lại!");
                }
            }
        });
    },

    // 3. Hàm render văn bản, tiền tệ, bảng biểu vào giao diện
    renderDashboardData: function (data) {
        // Hàm phụ hỗ trợ định dạng tiền VNĐ nhanh gọn
        const formatVND = (num) => {
            return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
                .format(num ?? 0).replace("₫", "đ");
        };

        // --- RENDER KHỐI HẠNG THÀNH VIÊN (RANK CARD) ---
        $("#lbl-rank-name").text(data.rankName);
        $("header h1").text(`Xin chào, Giảng viên ${data.teacherName}! 👋`);
        let rankNameHtml = `${data.rankTitle} <span class="commission-tag">Hoa hồng thực nhận: ${data.commissionRate}%</span>`;
        $(".rank-info .rank-name").html(rankNameHtml);

        // Tính toán phần trăm tiến trình lên hạng kế tiếp
        let progressPercent = 0;
        if (data.targetRevenueForRank > 0) {
            progressPercent = (data.currentRevenueForRank / data.targetRevenueForRank) * 100;
            if (progressPercent > 100) progressPercent = 100; // Ghim tối đa 100% nếu max cấp
        }
        
        $(".progress-labels span:last-child").html(`<strong>${formatVND(data.currentRevenueForRank)}</strong> / ${formatVND(data.targetRevenueForRank)}`);
        $(".progress-bar .progress-fill").css("width", progressPercent + "%");

        // Hiển thị thông báo động dựa trên việc có Rank kế tiếp hay không
        if (data.nextRankName && data.targetRevenueForRank > data.currentRevenueForRank) {
            let missingRevenue = data.targetRevenueForRank - data.currentRevenueForRank;
            $(".rank-info p").html(`Cố lên! Bạn chỉ còn thiếu <strong>${formatVND(missingRevenue)}</strong> tích lũy để thăng tiến lên <strong>${data.nextRankName}</strong>.`);
        } else {
            $(".rank-info p").html(`Chúc mừng! Bạn đã đạt cấp bậc cao nhất hệ thống: <strong>${data.rankName}</strong>.`);
        }

        // --- RENDER THẺ THỐNG KÊ NHANH (STATS GRID) ---
        const cards = $(".stats-grid .stat-card");
        
        // Cột 1: Gross
        cards.eq(0).find(".stat-value").text(formatVND(data.totalGrossRevenue));
        cards.eq(0).find(".stat-change").text(data.revenueChangeText);
        
        // Cột 2: Phí sàn
        cards.eq(1).find(".stat-value").text("-" + formatVND(data.platformFee));
        cards.eq(1).find(".stat-change").text(`Khấu trừ ${100 - data.commissionRate}% dựa theo ${data.rankName}`);
        
        // Cột 3: Thực nhận Net
        cards.eq(2).find(".stat-value").text(formatVND(data.netRevenue));
        
        // Cột 4: Số dư ví khả dụng
        cards.eq(3).find(".stat-value").text(formatVND(data.availableBalance));

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

// Gọi init của Dashboard
document.addEventListener('DOMContentLoaded', () => { 
    if(window.DashboardTeacher) {
        window.DashboardTeacher.init(); 
    }
});