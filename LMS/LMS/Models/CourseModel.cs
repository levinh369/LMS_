using LMS.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.Models
{
    public class CourseModel : BaseModel
    {
        public int CategoryId { get; set; }

        [Required, StringLength(200)]
        public string Title { get; set; }

        public LevelEnum Level { get; set; }
        public string? Description { get; set; }
        public string? ThumbnailUrl { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }
        public int? TeacherId { get; set; } // ID của người dạy

        [ForeignKey("TeacherId")]
        public UserModel? Teacher { get; set; }
        [ForeignKey("CategoryId")]
        public CategoryModel Category { get; set; }
        public ICollection<LessonModel> Lessons { get; set; } = new List<LessonModel>();
        public ICollection<CourseDetailModel> CourseDetails { get; set; } = new List<CourseDetailModel>();
        public ICollection<ChapterModel> Chapters { get; set; } = new List<ChapterModel>();
        public ICollection<EnrollmentModel> Enrollments { get; set; } = new List<EnrollmentModel>();
        [NotMapped]
        public int TotalLessons { get; set; }
        [NotMapped]
        public int CompletedLessons { get; set; }
        [NotMapped]
        public double ProgressPercent { get; set; }
        [NotMapped] // Dùng cái này để nó KHÔNG tạo cột trong Database
        public DateTime? LastLearnedDate { get; set; }

        [NotMapped] // Cái này để hiện chữ "2 giờ trước", "3 ngày trước"
        public string LastLearnedFriendly { get; set; } = "Chưa bắt đầu";
        [NotMapped]
        public bool IsCompleted { get; set; }
    }
}
