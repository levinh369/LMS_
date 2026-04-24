using LMS.Enums;
using System.ComponentModel.DataAnnotations;

namespace LMS.DTOs.Request
{
    public class CommentRequestDTO
    {
        public string Content { get; set; }
        public int LessonId { get; set; }
        public int CourseId { get; set; }
        public int? ParentId { get; set; } // Luôn là ID thằng cha gốc
        public int? ReplyToUserId { get; set; } // Thêm cái này
        public string? ReplyToUserName { get; set; }

    }
    public class ReactionRequest
    {
        public ReactionTypeEnum Type { get; set; }
    }
}
