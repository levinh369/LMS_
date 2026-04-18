namespace LMS.DTOs.Respone
{
    public class UserResponseDTO
    {
        public int Id { get; set; }

        public int RoleId { get; set; }

        // Thêm trường này để hiển thị tên vai trò (Admin/Học viên) trên bảng cho dễ
        public string RoleName { get; set; }

        public string FullName { get; set; }

        public string Email { get; set; }

        // Không trả về PasswordHash để bảo mật

        public string? AvatarUrl { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }

        public bool IsDeleted { get; set; }

        public bool IsActive { get; set; }
    }
}
