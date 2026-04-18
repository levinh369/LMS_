using System.ComponentModel.DataAnnotations;

namespace LMS.DTOs.Request
{
    public class ReplyRequestDTO
    {
        [Required]
        public int ParentId { get; set; }

        // 2. Nội dung của câu trả lời
        [Required]
        [StringLength(1000, ErrorMessage = "Nội dung không được quá 1000 ký tự.")]
        public string Content { get; set; }

        // 3. ID của bài học (Để khi click vào thông báo, nó biết bay về bài nào)
        [Required]
        public int LessonId { get; set; }

        // 4. ID của khóa học (Dùng để xây dựng RedirectUrl trong thông báo)
        [Required]
        public int CourseId { get; set; }
    }
}
