using System.ComponentModel.DataAnnotations;

namespace LMS.Models
{
    public class CategoryModel : BaseModel
    {
        [Required, StringLength(100)]
        public string Name { get; set; }
        public string Description {  get; set; }

        public ICollection<CourseModel> Courses { get; set; } = new List<CourseModel>();
    }
}
