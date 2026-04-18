namespace LMS.Services.Interfaces
{
    public interface IYoutubeService
    {
        Task<int> GetVideoDurationAsync(string videoId);
    }
}
