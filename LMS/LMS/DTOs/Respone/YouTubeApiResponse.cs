namespace LMS.DTOs.Respone
{
    public class YouTubeApiResponse
    {
        public List<YouTubeVideoItem> Items { get; set; }
    }

    // 2. Lớp đại diện cho từng Video trong danh sách
    public class YouTubeVideoItem
    {
        public ContentDetails ContentDetails { get; set; }
    }

    // 3. Lớp chứa thông tin chi tiết nhất (Thời lượng)
    public class ContentDetails
    {
        public string Duration { get; set; }
    }
}
