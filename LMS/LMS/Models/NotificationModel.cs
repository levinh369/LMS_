using LMS.Enums;
using Microsoft.Data.SqlClient;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.Models
{
    public class NotificationModel
    {
        public int Id { get; set; }
        public int UserId { get; set; } // Người nhận thông báo
        public int? SenderId { get; set; } // Người tạo ra hành động (người reply)

        public string Message { get; set; } // Nội dung hiển thị (vd: "Nguyễn Văn A đã trả lời bình luận của bạn")
        public string RedirectUrl { get; set; } // Click vào thì bay tới đâu (Link bài học + ID comment)
        public NotificationTypeEnum Type { get; set; } // Phân loại: Reply, Like, System...

        public bool IsRead { get; set; } = false; // Đã đọc hay chưa
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // Navigation properties
        public virtual UserModel User { get; set; }
        public virtual UserModel Sender { get; set; }
        [NotMapped]
        public string SenderAvatar { get; set; }
        [NotMapped]
        public int? ReactionType { get; set; }

    }
}
