using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.Models
{
    public class UserProgressModel : BaseModel
    {
        public int UserId { get; set; }
        public int LessonId { get; set; }

        public int CourseId { get; set; }
        public bool IsCompleted { get; set; } = false;

        [ForeignKey("UserId")]
        public UserModel User { get; set; }

        [ForeignKey("LessonId")]
        public LessonModel Lesson { get; set; }
        [ForeignKey("CourseId")]
        public CourseModel Course { get; set; }

        public int LastWatchedTime { get; set; }
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }
}
