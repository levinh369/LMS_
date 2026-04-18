using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using LMS.Services.Interfaces;

namespace LMS.Services
{
    public class CloudinaryService : ICloudinaryService
    {
        private readonly Cloudinary _cloudinary;
        public CloudinaryService(IConfiguration config)
        {
            var acc = new Account(
                config["Cloudinary:CloudName"],
                config["Cloudinary:ApiKey"],
                config["Cloudinary:ApiSecret"]
            );
            _cloudinary = new Cloudinary(acc);
        }
        public async Task<string> UploadImageAsync(IFormFile file)
        {
            if (file.Length <= 0) return null;

            using var stream = file.OpenReadStream();
            var uploadParams = new ImageUploadParams()
            {
                File = new FileDescription(file.FileName, stream),
                Folder = "LMS_Thumbnails", // Tự động tạo folder trên Cloudinary
                Transformation = new Transformation().Width(800).Height(450).Crop("fill") // Tự nén & cắt ảnh chuẩn 16:9
            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParams);
            return uploadResult.SecureUrl.ToString(); // Trả về link https
        }
        public async Task<string> UploadImageFromUrlAsync(string imageUrl)
        {
            if (string.IsNullOrEmpty(imageUrl)) return null;

            var uploadParams = new ImageUploadParams()
            {
                // Cloudinary sẽ tự động "kéo" ảnh từ link này về server của nó
                File = new FileDescription(imageUrl),
                Folder = "avatars", // Tùy chọn: đưa vào thư mục avatars cho gọn
                Transformation = new Transformation().Width(500).Height(500).Crop("fill") // Tự động resize cho đẹp
            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParams);

            return uploadResult.SecureUrl.AbsoluteUri; // Trả về link Cloudinary xịn
        }
    }
}
