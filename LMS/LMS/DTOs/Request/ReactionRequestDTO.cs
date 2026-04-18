using LMS.Enums;
using Microsoft.EntityFrameworkCore.Storage;
using System.ComponentModel.DataAnnotations;

namespace LMS.DTOs.Request
{
    public class ReactionRequestDTO
    {
        [Required]
        public int CommentId { get; set; }

        // 2. Loại cảm xúc (nếu bác làm nhiều loại: Like, Haha, Love...)
        // Nếu chỉ có mỗi "Like" thì bác có thể bỏ qua cái này hoặc để mặc định
        public ReactionTypeEnum  ReactionType { get; set; }
    }
}
