namespace LMS.Services.Interfaces
{
    public interface IYoutubeService
    {
        Task<(int Duration, string Title)> GetVideoInfoAsync(string videoId);
    }
}
