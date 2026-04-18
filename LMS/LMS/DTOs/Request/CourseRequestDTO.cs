using LMS.DTOs.Respone;
using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.DTOs.Request
{
    public class CourseRequestDTO
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public IFormFile? ThumbnailFile { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }
        public int Level { get; set; }
        public bool IsActive { get; set; }
        public int CategoryId { get; set; }
        public List<CourseRequestDetailDTO> CourseDetails { get; set; }
    }
    public class CourseRequestDetailDTO
    {
        public string Content { get; set; }
        public int DetailType { get; set; } // 0: Lợi ích, 1: Yêu cầu
    }
}
