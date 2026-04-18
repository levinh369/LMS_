using LMS.Enums;
using System.ComponentModel.DataAnnotations;

namespace LMS.Models
{
    public class CourseDetailModel : BaseModel
    {
        [Required]
        public int CourseId { get; set; }
        public CourseModel Course { get; set; }

        [Required]
        public string Content { get; set; }

        // Phân loại: 0 - Bạn sẽ học được gì, 1 - Yêu cầu/Kỹ năng cần có
        [Required]
        public DetailTypeEnum DetailType { get; set; }
    }
}
