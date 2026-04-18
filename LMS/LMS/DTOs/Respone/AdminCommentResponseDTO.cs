namespace LMS.DTOs.Respone
{
    public class AdminCommentResponseDTO
    {
        public int Id { get; set; }
        public string Content { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsActive { get; set; } // Quan trọng nhất để bác Ẩn/Hiện

        // Thông tin người gửi (Học viên)
        public int UserId { get; set; }
        public string UserName { get; set; }
        public string UserAvatar { get; set; }
        public bool IsDeleted {  get; set; }

        // Thông tin ngữ cảnh
        public int CourseId { get; set; }
        public string CourseTitle { get; set; }
        public string LessonName { get; set; } // Để Admin biết học viên đang hỏi ở bài nào

        // Thống kê tương tác
        public int LikeCount { get; set; }
        public int HahaCount { get; set; }

        // Đệ quy để hiện Reply như Facebook
        public int? ParentId { get; set; }
        public List<AdminCommentResponseDTO> Replies { get; set; } = new List<AdminCommentResponseDTO>();
    }
}
