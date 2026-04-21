using LMS.Enums;
using System.ComponentModel.DataAnnotations;

namespace LMS.DTOs.Request
{
    public class CommentRequestDTO
    {
        public int CommentId    { get; set; }
        [StringLength(2000, ErrorMessage = "Bình luận không được quá 2000 ký tự")]
        public string Content { get; set; }

        [Required]
        public int LessonId { get; set; }

        // Dùng cho trường hợp trả lời (Reply)
        // Nếu gửi null hoặc 0 => Bình luận gốc
        // Nếu có giá trị => Trả lời cho bình luận đó
        public int? ParentId { get; set; }
        public int CourseId { get; set; }

    }
    public class ReactionRequest
    {
        public ReactionTypeEnum Type { get; set; }
    }
}
