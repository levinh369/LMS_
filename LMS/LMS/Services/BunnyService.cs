using LMS.Services.Interfaces;
using Microsoft.Extensions.Configuration;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public class BunnyService : IBunnyService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string _libraryId;
    private readonly string _apiKey;

    public BunnyService(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        // Đọc cấu hình từ file appsettings.json
        _libraryId = configuration["BunnyNet:LibraryId"];
        _apiKey = configuration["BunnyNet:ApiKey"];
    }

    public async Task<string> InitVideoAsync(string title)
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add("AccessKey", _apiKey);
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var payload = new { title = title };
        var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        var response = await client.PostAsync($"https://video.bunnycdn.com/library/{_libraryId}/videos", content);

        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException("Lỗi kết nối đến Bunny API khi khởi tạo video.");

        var responseData = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(responseData);

        // Trả về VideoId (Guid) dạng chuỗi cho Controller
        return doc.RootElement.GetProperty("guid").GetString();
    }

    public async Task<bool> DeleteVideoAsync(string videoId)
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add("AccessKey", _apiKey);

        var response = await client.DeleteAsync($"https://video.bunnycdn.com/library/{_libraryId}/videos/{videoId}");

        return response.IsSuccessStatusCode;
    }
}