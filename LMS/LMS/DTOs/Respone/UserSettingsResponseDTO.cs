namespace LMS.DTOs.Respone
{
    public class UserSettingsResponseDTO
    {
        public string FullName { get; set; }
        public string Email { get; set; }
        public string? Avatar { get; set; }

        public bool HasPassword { get; set; }
    }
    public class UpdateProfileResponse
    {
        public string FullName { get; set; }
        public string AvatarUrl { get; set; }
    }
}
