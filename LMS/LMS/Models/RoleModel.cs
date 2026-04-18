using System.ComponentModel.DataAnnotations;

namespace LMS.Models
{
    public class RoleModel : BaseModel
    {
        [Required, StringLength(50)]
        public string RoleName { get; set; }

        [StringLength(200)]
        public string? Description { get; set; }

        public ICollection<UserModel> Users { get; set; } = new List<UserModel>();
    }
}
