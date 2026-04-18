using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Data;

namespace LMS.Models
{
    public class UserModel : BaseModel
    {
        public int RoleId { get; set; }

        [Required, StringLength(100)]
        public string FullName { get; set; }

        [Required, EmailAddress, StringLength(100)]
        public string Email { get; set; }

        [Required]
        public string PasswordHash { get; set; }

        public string? AvatarUrl { get; set; }

        [ForeignKey("RoleId")]
        public RoleModel Role { get; set; }
        public string Provider { get; set; } = "Local"; 

        public string? ExternalId { get; set; } // Lưu ID mà Google/Facebook trả về
        public ICollection<EnrollmentModel> Enrollments { get; set; } = new List<EnrollmentModel>();
    }

}
