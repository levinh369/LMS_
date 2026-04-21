namespace LMS.DTOs.Respone
{
    public class CommentResponseDTO
    {
        public int Id { get; set; }
        public string Content { get; set; }
        public int UserId { get; set; }
        public string UserFullName { get; set; }
        public int LikeCount {  get; set; }
        public string UserAvatar { get; set; }
        public int? ParentId { get; set; }
        public bool IsLiked { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsPinned { get; set; }
        public int? TeacherId { get; set; }
        // Số lượng phản hồi (nếu bác muốn hiện nút "Xem 5 câu trả lời")
        public int ReplyCount { get; set; }
        public int ReactionType { get; set; }
        public int TotalReactions { get; set; }
        public List<ReactionStatDTO> ReactionStats { get; set; } = new();

        // 6. Danh sách 3 icon đứng đầu (Gửi sẵn từ Backend để FE chỉ việc hiện)
        public List<int> TopReactionTypes { get; set; } = new();
        public string? ReplyToUserName { get; set; }
    }
}
