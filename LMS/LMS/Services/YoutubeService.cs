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
        public async Task<int> GetVideoDurationAsync(string videoId)
        {
            try
            {
                var url = $"https://www.googleapis.com/youtube/v3/videos?id={videoId}&key={_apiKey}&part=contentDetails";
                var response = await _httpClient.GetFromJsonAsync<YouTubeApiResponse>(url);

                if (response?.Items != null && response.Items.Count > 0)
                {
                    var isoDuration = response.Items[0].ContentDetails.Duration;
                    // Dùng XmlConvert để đổi PT5M20S sang TimeSpan cực nhanh
                    return (int)XmlConvert.ToTimeSpan(isoDuration).TotalSeconds;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi lấy thời lượng: {ex.Message}");
            }
            return 0;
        }
    }
}
