using LMS.DTOs.Respone;
using LMS.Services.Interfaces;
using System.Xml;

namespace LMS.Services
{
    public class YoutubeService : IYoutubeService
    {
        private readonly string _apiKey;
        private readonly HttpClient _httpClient;

        public YoutubeService(IConfiguration config, HttpClient httpClient)
        {
            _apiKey = config["YouTubeSettings:ApiKey"];
            _httpClient = httpClient;
        }
        public async Task<(int Duration, string Title)> GetVideoInfoAsync(string videoId)
        {
            try
            {
                var url = $"https://www.googleapis.com/youtube/v3/videos?id={videoId}&key={_apiKey}&part=contentDetails,snippet";

                var response = await _httpClient.GetFromJsonAsync<YouTubeApiResponse>(url);

                if (response?.Items != null && response.Items.Count > 0)
                {
                    var item = response.Items[0];

                    // Lấy số giây
                    var isoDuration = item.ContentDetails.Duration;
                    int seconds = (int)System.Xml.XmlConvert.ToTimeSpan(isoDuration).TotalSeconds;

                    // Lấy Tiêu đề
                    string title = item.Snippet?.Title ?? string.Empty;

                    return (seconds, title);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi lấy thông tin video: {ex.Message}");
            }

            // Nếu lỗi thì trả về 0 giây và chuỗi rỗng
            return (0, string.Empty);
        }
    }
}
