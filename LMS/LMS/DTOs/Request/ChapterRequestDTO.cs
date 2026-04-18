namespace LMS.DTOs.Request
{
    public class ChapterRequestDTO
    {
        public int CourseId { get; set; }
        public string Title { get; set; }
        public int OrderIndex{ get; set; }
        public bool IsActive { get; set; }
        public DateTime CreateAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
