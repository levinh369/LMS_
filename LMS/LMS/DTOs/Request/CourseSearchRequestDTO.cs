namespace LMS.DTOs.Request
{
    public class CourseSearchRequestDTO
    {
        public string? Keyword { get; set; }

        // 📍 Thêm dấu ? vào List để báo là không bắt buộc
        public List<int>? Levels { get; set; }

        public bool? IsFree { get; set; }

        // 📍 Thêm dấu ? 
        public string? SortBy { get; set; } = "relevant";

        // Phân trang thì kiểu int (value type) cứ để nguyên vì nó tự có giá trị mặc định rồi
        public int PageIndex { get; set; } = 1;
        public int PageSize { get; set; } = 6;
    }
    public class CourseSearchResultItemDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string InstructorName { get; set; }
        public string ThumbnailUrl { get; set; }
        public decimal Price { get; set; } // Chỉ giữ lại duy nhất trường này
        public bool IsFree { get; set; }
        public int Level { get; set; }
        public int StudentCount { get; set; } // Số người học
        public int LessonCount { get; set; }  // Số bài học
        public string Duration { get; set; }  // Thời lượng (VD: "12h 30p")
        public int DurationRaw { get; set; }
    }
    public class PagedResultDto<T>
    {
        // Danh sách dữ liệu chính (Chính là list khóa học ở trên)
        public List<T> Data { get; set; }

        // Tổng số lượng bản ghi tìm được (Dùng để in ra chữ "10 kết quả cho ASP.NET")
        public int TotalRecords { get; set; }

        // Tổng số trang (Dùng để vẽ cái thanh phân trang 1, 2, 3...)
        public int TotalPages { get; set; }

        public int PageIndex { get; set; }
        public int PageSize { get; set; }
    }
}
