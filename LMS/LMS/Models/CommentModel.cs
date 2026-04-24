using LMS.DTOs.Respone;
using LMS.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.Models
{
    public class CommentModel : BaseModel
    {
        [Required]
        public string Content { get; set; }

        [Required]
        public int UserId { get; set; }
        public UserModel User { get; set; }

        [Required]
        public int LessonId { get; set; }
        public LessonModel Lesson { get; set; }

        // --- PHẦN REPLY ---
        public int? ParentId { get; set; }

        [ForeignKey("ParentId")] // Nên chỉ định rõ FK để EF Core không nhầm lẫn
        public CommentModel ParentComment { get; set; }

        public ICollection<CommentModel> Replies { get; set; } = new List<CommentModel>();

        public bool IsPinned { get; set; } = false;
        public ICollection<CommentLikeModel> Likes { get; set; } = new List<CommentLikeModel>();
        public int? ReplyToUserId { get; set; } // ID người bị rep trực tiếp
        public string? ReplyToUserName { get; set; } // Tên người bị rep để hiện @Mention
        public int LikeCount { get; set; } = 0;
        [NotMapped] // Quan trọng: EF Core sẽ bỏ qua trường này khi tạo bảng
        public bool IsLiked { get; set; } = false;
        [NotMapped]
        public ReactionTypeEnum? UserReaction { get; set; } // Trả về null nếu chưa thả, hoặc trả về Like, Love...
        [NotMapped]
        public int TotalReactions { get; set; } = 0;

        [NotMapped]
        public List<ReactionStatDTO> ReactionStats { get; set; } = new();
    }
}
