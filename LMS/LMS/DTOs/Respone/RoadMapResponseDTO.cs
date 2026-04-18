namespace LMS.DTOs.Respone
{
    public class RoadMapResponeDTO
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string? Description { get; set; }
        public string? ThumbnailUrl { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }

        // Trường này cực kỳ quan trọng để hiện lên bảng Admin
        public int CourseCount { get; set; }

        // Danh sách khóa học đi kèm (dùng cho trang chi tiết lộ trình)
        public List<CourseInRoadMapDTO>? Courses { get; set; }
        public List<CourseInRoadMapDTO>? AvailableCourses { get; set; }
    }
    public class CourseInRoadMapDTO
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string? ThumbnailUrl { get; set; }
        public string PhaseName { get; set; }
        public bool IsPhase { get; set; }
        public decimal IsFree {  get; set; }
        public int OrderIndex { get; set; }
    }
}
