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
        CommentPinned = 3,
        [Display(Name = "Học viên mới đăng ký ")]
        NewEnrollment = 4,

        [Display(Name = "Bình luận mới trong khóa học")]
        NewComment = 5,

        [Display(Name = "Khóa học đã được duyệt")]
        CourseApproved = 6,
        [Display(Name = "Yêu cầu duyệt khóa học")]
        CoursePendingReview = 7
    }
}
