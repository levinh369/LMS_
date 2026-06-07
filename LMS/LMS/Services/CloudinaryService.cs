using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using LMS.Services.Interfaces;
using System.Text.RegularExpressions;

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
        public async Task<bool> DeleteImageFromUrlAsync(string imageUrl)
        {
            if (string.IsNullOrEmpty(imageUrl)) return true; // Không có link thì báo Ok luôn để bỏ qua

            try
            {
                // 1. Tìm vị trí chữ "upload/" trong chuỗi URL
                int uploadIndex = imageUrl.IndexOf("upload/");
                if (uploadIndex == -1) return false;

                // Cắt lấy phần đuôi đằng sau "upload/"
                string afterUpload = imageUrl.Substring(uploadIndex + 7);

                // 2. Dọn dẹp cái mã version (ví dụ: v1775809985/)
                if (Regex.IsMatch(afterUpload, @"^v\d+/"))
                {
                    afterUpload = afterUpload.Substring(afterUpload.IndexOf('/') + 1);
                }

                // 3. Cắt bỏ cái phần đuôi file (.jpg, .png, .pdf...)
                int lastDotIndex = afterUpload.LastIndexOf('.');
                string publicId = lastDotIndex != -1
                                  ? afterUpload.Substring(0, lastDotIndex)
                                  : afterUpload;

                // 4. Lệnh DestroyAsync cần biết kiểu file (Image hay Raw/Document)
                // Ảnh thì là Image, CV/PDF thì là Raw. Mặc định mình xử lý Image trước.
                var resourceType = ResourceType.Image;
                if (imageUrl.EndsWith(".pdf") || imageUrl.EndsWith(".doc") || imageUrl.EndsWith(".docx"))
                {
                    resourceType = ResourceType.Raw;
                }

                var deletionParams = new DeletionParams(publicId)
                {
                    ResourceType = resourceType
                };

                // 5. Gửi yêu cầu xóa lên Cloudinary
                var result = await _cloudinary.DestroyAsync(deletionParams);

                return result.Result == "ok";
            }
            catch (Exception)
            {
                // Bắt lỗi ngầm để luồng xóa DB chính không bị gián đoạn nếu Cloudinary gặp trục trặc
                return false;
            }
        }
    }
}
