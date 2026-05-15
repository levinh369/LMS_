namespace LMS.DTOs.Respone
{
    public class TeacherDashboardResponseDTO
    {
        public string TeacherName { get; set; } = string.Empty;
        public string RankName { get; set; } 
        public string RankTitle { get; set; } 
        public decimal CommissionRate { get; set; } = 70; // % hoa hồng thực nhận (VD: 75)
        public decimal CurrentRevenueForRank { get; set; } // Doanh thu tích lũy hiện tại
        public decimal TargetRevenueForRank { get; set; }  // Mục tiêu doanh thu để lên hạng kế tiếp
        public string NextRankName { get; set; } 

        public decimal TotalGrossRevenue { get; set; } // Tổng doanh thu thô
        public decimal PlatformFee { get; set; }        // Phí nền tảng khấu trừ
        public decimal NetRevenue { get; set; }          // Thu nhập thực nhận về ví
        public decimal AvailableBalance { get; set; }    // Số dư khả dụng hiện tại có thể rút
        public string RevenueChangeText { get; set; } = string.Empty; // Chuỗi hiển thị khoảng thời gian lọc

        // ==========================================
        // 3. BIỂU ĐỒ DOANH THU ĐỘNG THEO NGÀY (BAR CHART)
        // ==========================================
        public List<string> ChartLabels { get; set; } = new();  // Mảng chứa nhãn ngày (X-Axis, VD: ["10/05", "11/05"])
        public List<decimal> WeeklyRevenue { get; set; } = new(); // Mảng chứa tiền tương ứng theo ngày (Y-Axis)

        // ==========================================
        // 4. TIẾN ĐỘ HỌC TẬP CỦA HỌC VIÊN (DONUT CHART)
        // ==========================================
        public int TotalStudentsCount { get; set; }     // Tổng số lượng học viên tham gia học
        public int CompletedPercentage { get; set; }    // Phần trăm học viên đã hoàn thành (100% tiến độ)
        public int LearningPercentage { get; set; }     // Phần trăm học viên đang học (0% < tiến độ < 100%)
        public int NotStartedPercentage { get; set; }   // Phần trăm học viên chưa học gì (0% tiến độ)

        // ==========================================
        // 5. DANH SÁCH CHI TIẾT (TABLES & LISTS)
        // ==========================================
        public List<CoursePerformanceDTO> CoursePerformances { get; set; } = new();
        public List<RecentTransactionDTO> RecentTransactions { get; set; } = new();
    }

    /// <summary>
    /// DTO chi tiết hiệu suất cho từng khóa học của Giảng viên
    /// </summary>
    public class CoursePerformanceDTO
    {
        public string CourseName { get; set; } = string.Empty;
        public bool IsPro { get; set; }          // true: Khóa học trả phí (PRO), false: Khóa học MIỄN PHÍ
        public int StudentCount { get; set; }    // Số lượng học viên đăng ký khóa này
        public decimal GrossRevenue { get; set; }
        public decimal NetRevenue { get; set; } 
    }

    /// <summary>
    /// DTO hiển thị danh sách lịch sử biến động số dư / mua bán gần đây
    /// </summary>
    public class RecentTransactionDTO
    {
        public string Description { get; set; } = string.Empty; 
        public decimal Amount { get; set; }                 
        public bool IsIncome { get; set; }                     
    }
}

