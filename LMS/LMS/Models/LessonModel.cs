using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.Models
{
    public class LessonModel : BaseModel
    {
        public int ChapterId { get; set; }

        [Required, StringLength(200)]
        public string Title { get; set; }

        [Required]
        public string Provider { get; set; }

        [Required]
        public string VideoId { get; set; }
        public string? LibraryId { get; set; }

        public bool IsPreview { get; set; } // Học thử
        public int OrderIndex { get; set; }
        public int? Duration { get; set; }

        // 2. Khai báo khóa ngoại nối về Chapter
        [ForeignKey("ChapterId")]
        public ChapterModel Chapter { get; set; }
        public ICollection<UserProgressModel> UserProgress { get; set; } = new List<UserProgressModel>();
        public int? CourseModelId { get; set; }
    }
}
