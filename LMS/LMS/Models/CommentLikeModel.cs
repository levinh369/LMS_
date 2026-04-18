using LMS.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.Models
{
    public class CommentLikeModel
    {
        [Key] // Thêm khóa chính đơn
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        [Required]
        public int UserId { get; set; }
        public UserModel User { get; set; }

        [Required]
        public int CommentId { get; set; }
        public CommentModel Comment { get; set; }
        public ReactionTypeEnum Type { get; set; } = ReactionTypeEnum.Like;

        public DateTime LikedAt { get; set; } = DateTime.Now;

    }
}
