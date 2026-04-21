using System.ComponentModel.DataAnnotations;

namespace LMS.Enums
{
    public enum NotificationTypeEnum
    {
        [Display(Name = "Trả lời bình luận")]
        CommentReply = 1,

        [Display(Name = "Yêu thích bình luận")]
        LikeComment = 2,

        [Display(Name = "Ghim bình luận")]
        CommentPinned = 3
    }
}
