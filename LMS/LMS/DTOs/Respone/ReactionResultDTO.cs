namespace LMS.DTOs.Respone
{
    public class ReactionResultDTO
    {
        public bool IsLiked { get; set; }

        // 2. Con số tổng: Để Frontend cập nhật ngay lập tức số lượng mà không cần load lại trang
        public int TotalReactions { get; set; }

        // 3. Loại cảm xúc hiện tại: Trả về Enum hoặc Int (1: Like, 2: Love...)
        // (Dùng để đổi icon 👍 thành ❤️ hoặc ngược lại)
        public int ReactionType { get; set; }
        public List<int> TopReactionTypes { get; set; }

        // QUAN TRỌNG: Để cập nhật cái Tooltip "Hover hiện chi tiết" ngay lập tức
        public List<ReactionStatDTO> ReactionStats { get; set; }
    }
    public class ReactionStatDTO
    {
        public int Type { get; set; }  // 1: Like, 2: Love...
        public int Count { get; set; } // Số lượng
    }
}
