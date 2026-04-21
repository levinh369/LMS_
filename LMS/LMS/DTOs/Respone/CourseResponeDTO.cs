using LMS.Enums;
using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.DTOs.Respone
{
    public class CourseResponeDTO
    {
        public int CourseId { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string ThumbnailUrl { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }
        public string? InstructorUrl {  get; set; }
        public DateTime CreateAt { get; set; }
        public bool IsActive { get; set; }
        public string CategoryName {  get; set; }
        public int CategoryId { get; set; } 
        public LevelEnum Level { get; set; }
        public int totalChapters {  get; set; }
        public int TotalLessons { get; set; }
        public int TotalEnrolled { get; set; }
        public int TotalDurationSeconds { get; set; }
        public bool IsEnrolled { get; set; }
        public List<ChapterResponseDTO> Chapters { get; set; }
        public List<CourseResponeDetailDTO> CourseDetails { get; set; }
        public int CompletedLessons { get; set; }
        public string? InstructorName {  get; set; }
        public double ProgressPercent { get; set; }
        public DateTime? LastLearnedDate { get; set; }
        public string LastLearnedFriendly { get; set; } = "Chưa bắt đầu";
        public double Progress { get; set; }
        public bool IsCompleted { get; set; }
    }
    public class CourseResponeDetailDTO
    {
        public string Content { get; set; }
        public int DetailType { get; set; } // 0: Lợi ích, 1: Yêu cầu
    }
    public class ChapterResponseDTO
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public int Order { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreateAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<LessonResponseDTO> Lessons { get; set; } = new List<LessonResponseDTO>();
    }

}
