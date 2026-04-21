namespace LMS.DTOs.Respone
{
    public class AdminDashboardDto
    {
        // 4 thẻ trên cùng
        public decimal TotalRevenue { get; set; }
        public int TotalUsers { get; set; }
        public int TotalOrders { get; set; }
        public double CompletionRate { get; set; }

        // Dữ liệu cho biểu đồ Doanh thu (Line Chart)
        public List<string> RevenueLabels { get; set; }
        public List<decimal> RevenueData { get; set; }

        // Dữ liệu cho biểu đồ tròn (Pie Chart)
        public List<string> CategoryLabels { get; set; }
        public List<int> CategoryData { get; set; }

        // Dữ liệu cho Top khóa học (Bar Chart)
        public List<string> CourseLabels { get; set; }
        public List<int> CourseData { get; set; }
    }
}
