/**
 * Dashboard Logic - Admin LMS
 * Author: Lê Quang Vinh
 */

let lineChart, pieChart, barChart;

const Dashboard = {
    init: function() {
        this.initCharts();
        this.setDefaultDates();
        this.loadData(); // Gọi dữ liệu lần đầu
    },

    // Gán ngày mặc định (tháng gần nhất)
    setDefaultDates: function() {
        const today = new Date().toISOString().split('T')[0];
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        $("#dateTo").val(today);
        $("#dateFrom").val(lastMonth.toISOString().split('T')[0]);
    },

    // Khởi tạo khung biểu đồ (trống)
    initCharts: function() {
        // 1. Line Chart - Doanh thu
        lineChart = new Chart(document.getElementById('lineChart'), {
            type: 'line',
            data: { labels: [], datasets: [{ 
                label: 'Doanh thu (VNĐ)', data: [], borderColor: '#4e73df', backgroundColor: 'rgba(78, 115, 223, 0.1)', fill: true, tension: 0.4 
            }]},
            options: { maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });

        // 2. Pie Chart - Danh mục
        pieChart = new Chart(document.getElementById('pieChart'), {
            type: 'doughnut',
            data: { labels: [], datasets: [{ data: [], backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b'], borderWidth: 0 }]},
            options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });

        // 3. Bar Chart - Top Khóa học
        barChart = new Chart(document.getElementById('barChart'), {
            type: 'bar',
            data: { labels: [], datasets: [{ label: 'Số lượt đăng ký', data: [], backgroundColor: '#4e73df', borderRadius: 8 }]},
            options: { maintainAspectRatio: false }
        });
    },

    // Hàm gọi API thật từ .NET
    loadData: function() {
        const fromDate = $("#dateFrom").val();
        const toDate = $("#dateTo").val();
        const token = localStorage.getItem("jwt_token");
        Swal.fire({
            title: 'Đang trích xuất dữ liệu...',
            didOpen: () => { Swal.showLoading() }
        });

        // URL này phải khớp với Route trong Controller .NET của bác
        $.ajax({
            url: `https://lms-u2jn.onrender.com/api/Dashboard/statistics?fromDate=${fromDate}&toDate=${toDate}`,
            type: 'GET',
            headers: {
            "Authorization": "Bearer " + token
        },
            success: function(res) {
                // 1. Cập nhật các thẻ số (Cards)
                $("#txt-revenue").text(res.totalRevenue.toLocaleString() + "đ");
                $("#txt-users").text("+" + res.totalUsers);
                $("#txt-orders").text(res.totalOrders);
                $("#txt-percent").text(res.completionRate + "%");

                // 2. Cập nhật Line Chart
                lineChart.data.labels = res.revenueLabels;
                lineChart.data.datasets[0].data = res.revenueData;
                lineChart.update();

                // 3. Cập nhật Pie Chart
                pieChart.data.labels = res.categoryLabels;
                pieChart.data.datasets[0].data = res.categoryData;
                pieChart.update();

                // 4. Cập nhật Bar Chart
                barChart.data.labels = res.courseLabels;
                barChart.data.datasets[0].data = res.courseData;
                barChart.update();

                Swal.close();
            },
            error: function(err) {
                Swal.fire('Lỗi!', 'Không thể lấy dữ liệu từ Server', 'error');
                console.error(err);
            }
        });
    },

    update: function() {
        this.loadData();
    }
};

$(document).ready(() => Dashboard.init());