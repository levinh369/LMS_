namespace LMS.DTOs.Respone
{
    public class CourseLessonSummaryDTO
    {
        // --- Dữ liệu thô (Dùng để hứng từ Repo hoặc lưu trữ) ---
        public int Id { get; set; }
        public string Name { get; set; }
        public int TotalLessons { get; set; }
        public int? TotalSeconds { get; set; } // Nên để int (mặc định 0) thay vì int? để tránh lỗi null khi cộng dồn
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }

        public string? DurationDisplay { get; set; } // Ví dụ: "01h 30p" hoặc "45 phút"
        public string? StatusText { get; set; }     // Ví dụ: "Đang hoạt động" hoặc "Tạm khóa"
        public string? StatusClass { get; set; }    // Ví dụ: "badge bg-success" hoặc "badge bg-danger"
        public string? CreatedAtDisplay => CreatedAt.ToString("dd/MM/yyyy"); // Định dạng ngày Việt Nam
    }
}
