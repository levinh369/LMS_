using LMS.Enums;

namespace LMS.DTOs.Respone
{
    public class AuthResponseDTO
    {
        public string Token { get; set; }
        public string Username { get; set; } 
        public string Email { get; set; } 
        public RoleEnum Role { get; set; }
        public string? AvatarUrl { get; set; }
        public int UserId { get; set; }
    }
}
