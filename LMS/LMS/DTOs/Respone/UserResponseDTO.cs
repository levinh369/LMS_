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
        public List<UserCourseDTO> Courses { get; set; } = new List<UserCourseDTO>();
    }
    public class UserCourseDTO
    {
        public int CourseId { get; set; }
        public string CourseName { get; set; }
        public double Progress { get; set; } // Phần trăm hoàn thành (0-100)
    }
}
