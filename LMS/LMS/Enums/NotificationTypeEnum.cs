using System.ComponentModel.DataAnnotations;

namespace LMS.Enums
{
    public enum NotificationTypeEnum
    {
        [Display(Name = "Trả lời bình luận")]
        CommentReply = 1,

        [Display(Name = "Yêu thích bình luận")]
        LikeComment = 2,

        // --- HỌC TẬP (LEARNING) ---
        [Display(Name = "Khóa học mới")]
        NewCourse = 10,

        [Display(Name = "Bài học mới cập nhật")]
        LessonUpdate = 11,

        [Display(Name = "Cấp chứng chỉ")]
        CertificateEarned = 12,

        [Display(Name = "Thông báo hệ thống")]
        SystemMessage = 20,

        [Display(Name = "Nhắc nhở học tập (Streak)")]
        StudyReminder = 21,

        [Display(Name = "Cảnh báo tài khoản")]
        AccountSecurity = 22
    }
}
