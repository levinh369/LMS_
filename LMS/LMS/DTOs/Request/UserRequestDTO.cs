using System.ComponentModel.DataAnnotations;

namespace LMS.DTOs.Request
{
    public class UserRequestDTO
    {
        [Required(ErrorMessage = "Họ tên không được để trống")]
        [StringLength(100)]
        public string FullName { get; set; }

        public string? Email { get; set; }

        [Required(ErrorMessage = "Vai trò không được để trống")]
        public int RoleId { get; set; }

        public bool IsActive { get; set; }

        public string? AvatarUrl { get; set; }
        public string Password { get; set; }
    }
}
