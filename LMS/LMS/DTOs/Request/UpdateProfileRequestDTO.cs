namespace LMS.DTOs.Request
{
    public class UpdateProfileRequestDTO
    {
        public string FullName { get; set; }
        public string? CurrentPassword { get; set; }
        public string? NewPassword { get; set; }
        public IFormFile? AvatarFile { get; set; }
    }
}
