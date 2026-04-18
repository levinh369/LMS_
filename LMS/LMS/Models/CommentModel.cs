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

        // --- CÁC TRƯỜNG NÊN THÊM ---

        // 1. Kiểm soát nội dung (Spam/Ẩn)
        public bool IsHidden { get; set; } = false;
        public ICollection<CommentLikeModel> Likes { get; set; } = new List<CommentLikeModel>();

        // 2. Trường này bác giữ lại để "hiển thị nhanh" (Denormalization)
        // Mỗi khi thêm/xóa 1 bản ghi ở bảng CommentLikes, bác cập nhật lại số này
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
