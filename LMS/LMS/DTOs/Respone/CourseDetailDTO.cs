namespace LMS.DTOs.Respone
{
    public class CourseDetailDTO
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string Thumbnail { get; set; }
        public decimal Price { get; set; }
        public decimal? OldPrice { get; set; } // Để hiện giá gạch đi cho oai

        // Thông tin giảng viên
        public string InstructorName { get; set; }
        public string InstructorAvatar { get; set; }

        // Thông tin tổng hợp
        public int TotalLessons { get; set; }
        public string DurationDisplay { get; set; } // VD: "10h 25m"
        public DateTime LastUpdated { get; set; }

        // Danh sách bài học lồng bên trong
        public List<LessonPublicDTO> Lessons { get; set; } = new List<LessonPublicDTO>();
    }

    public class LessonPublicDTO
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public int Duration { get; set; } // Số giây để JS format hoặc dùng cho logic khác
        public string VideoId { get; set; } // Dùng cho bài nào được "Xem thử"
        public int OrderIndex { get; set; }
        public bool IsPreview { get; set; } // Quyết định hiện nút "Xem thử" hay "Ổ khóa"
    }
}