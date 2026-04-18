using System.ComponentModel.DataAnnotations;

namespace LMS.Models
{
    public class RoadMapModel : BaseModel
    {
        [Required, StringLength(200)]
        public string Title { get; set; }

        public string? Description { get; set; }

        public string? ThumbnailUrl { get; set; }

        // Một lộ trình sẽ có danh sách các khóa học được gắn vào
        public ICollection<RoadmapCourseModel> RoadmapCourses { get; set; } = new List<RoadmapCourseModel>();
    }
}
