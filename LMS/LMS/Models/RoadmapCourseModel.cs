using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.Models
{
    public class RoadmapCourseModel 
    {
        [Key]
        public int Id { get; set; }

        public int RoadmapId { get; set; }
        [ForeignKey("RoadmapId")]
        public RoadMapModel Roadmap { get; set; }

        public int CourseId { get; set; }
        [ForeignKey("CourseId")]
        public CourseModel Course { get; set; }

        // Thứ tự là trường quan trọng nhất ở đây
        public int OrderIndex { get; set; }
        public string PhaseName { get; set; } = "Chưa phân loại";

        // Nếu bác thực sự muốn biết ai là người gắn khóa học này vào lộ trình
        // thì chỉ cần thêm CreatedAt là đủ, không cần IsActive/IsDeleted
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
