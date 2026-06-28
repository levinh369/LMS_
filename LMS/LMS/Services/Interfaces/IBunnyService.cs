namespace LMS.Services.Interfaces
{
    public interface IBunnyService
    {
        Task<string> InitVideoAsync(string title);
        Task<bool> DeleteVideoAsync(string videoId);
    }
}
