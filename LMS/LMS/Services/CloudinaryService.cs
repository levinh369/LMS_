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
        public async Task<string> UploadDocumentAsync(IFormFile file)
        {
            if (file == null || file.Length <= 0) return null;

            // Validate định dạng file (Chỉ cho phép PDF, DOC, DOCX)
            var allowedExtensions = new[] { ".pdf", ".doc", ".docx" };
            var extension = Path.GetExtension(file.FileName).ToLower();

            if (!allowedExtensions.Contains(extension))
            {
                throw new Exception("Chỉ hỗ trợ tải lên file PDF hoặc Word.");
            }

            // Validate dung lượng file (Ví dụ: giới hạn tối đa 5MB)
            var maxFileSize = 5 * 1024 * 1024; // 5MB
            if (file.Length > maxFileSize)
            {
                throw new Exception("Dung lượng file CV không được vượt quá 5MB.");
            }

            using var stream = file.OpenReadStream();

            // Sử dụng RawUploadParams thay vì ImageUploadParams cho tài liệu
            var uploadParams = new RawUploadParams()
            {
                File = new FileDescription(file.FileName, stream),
                Folder = "LMS_CVs" // Tự động tạo folder riêng cho CV để dễ quản lý
            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParams);

            return uploadResult.SecureUrl.ToString(); // Trả về link tải/xem file
        }
    }
}
