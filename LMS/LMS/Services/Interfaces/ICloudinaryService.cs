namespace LMS.Services.Interfaces
{
    public interface ICloudinaryService
    {
        Task<string> UploadImageAsync(IFormFile file);
        Task<string> UploadImageFromUrlAsync(string imageUrl);
        Task<string> UploadDocumentAsync(IFormFile file);
        Task<bool> DeleteImageFromUrlAsync(string imageUrl);
    }
}
