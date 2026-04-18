namespace LMS.DTOs.Respone
{
    public class CommentReactionDetailResponseDTO
    {
        public int UserId { get; set; }
        public string UserFullName { get; set; }
        public string UserAvatar { get; set; }
        public int ReactionType { get; set; }
        public DateTime LikedAt { get; set; }
    }
}
