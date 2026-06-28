namespace LMS.DTOs.Respone
{
    public class YouTubeApiResponse
    {
        public List<YouTubeVideoItem> Items { get; set; }
    }
    public class YouTubeVideoItem
    {
        public ContentDetails ContentDetails { get; set; }
        public Snippet Snippet { get; set; }
    }
    public class ContentDetails
    {
        public string Duration { get; set; }
    }
    public class Snippet
    {
        public string Title { get; set; }
    }
}