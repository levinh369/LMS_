namespace LMS.DTOs
{
    public class RankDashboardResponseDto
    {
        // --- Nhóm Thống kê (Widgets) ---
        public int TotalTeachers { get; set; }
        public decimal MonthlyPlatformRevenue { get; set; }

        // 📍 2 TRƯỜNG MỚI (Thay cho PendingRank và AutoRanking)
        public int VipTeachersCount { get; set; } // Thống kê Hạng Vàng/KC
        public int NewTeachersThisMonth { get; set; } // Thống kê Giảng viên mới trong tháng

        // --- Danh sách cấu hình (Main Table) ---
        public List<RankConfigItemDto> RankConfigs { get; set; } = new List<RankConfigItemDto>();
    }

    public class RankConfigItemDto
    {
        public int RankId { get; set; }
        public string RankName { get; set; }
        public int RankEnum { get; set; } // 0, 1, 2, 3 để map icon bên Frontend
        public decimal RequiredRevenue { get; set; }
        public int DefaultRate { get; set; }
        public int TeacherCount { get; set; } // Số người đạt được hạng này
    }

    public class TeacherByRankDto
    {
        public int UserId { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public string AvatarUrl { get; set; }
        public decimal TotalRevenue { get; set; } // Tổng doanh thu tích lũy để Admin đối soát
    }
}