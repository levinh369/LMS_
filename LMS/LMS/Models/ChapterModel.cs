using System.ComponentModel.DataAnnotations;

namespace LMS.Models
{
    public class ChapterModel : BaseModel
    {
        [Required, StringLength(255)]
        public string Title { get; set; }

        // Thứ tự chương trong khóa học (Chương 1, Chương 2...)
        public int OrderIndex { get; set; }

        [Required]
        public int CourseId { get; set; }
        public CourseModel Course { get; set; }
        [StringLength(20)]
        public string? LockedByRole { get; set; }
        [StringLength(20)]
        public string? DeletedByRole { get; set; }

        // Một chương có nhiều bài học
        public ICollection<LessonModel> Lessons { get; set; } = new List<LessonModel>();
    }
}
