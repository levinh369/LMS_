using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.Models
{
    public class EnrollmentModel : BaseModel
    {
        public int UserId { get; set; }
        public int CourseId { get; set; }

        [ForeignKey("UserId")]
        public UserModel User { get; set; }

        [ForeignKey("CourseId")]
        public CourseModel Course { get; set; }
        public bool IsCompleted { get; set; } = false; 
        public DateTime? CompletedAt { get; set; }     

        public double ProgressPercent { get; set; } = 0; 
        public DateTime LastAccessedAt { get; set; } = DateTime.Now;
    }
}
