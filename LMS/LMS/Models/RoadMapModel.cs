using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.Models
{
    public class RoadMapModel : BaseModel
    {
        [Required, StringLength(200)]
        public string Title { get; set; }

        public string? Description { get; set; }

        public string? ThumbnailUrl { get; set; }
        public int? CreatedById { get; set; }
        [ForeignKey("CreatedById")]
        public UserModel? CreatedBy { get; set; }
        public ICollection<RoadmapCourseModel> RoadmapCourses { get; set; } = new List<RoadmapCourseModel>();
    }
}
