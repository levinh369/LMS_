using CloudinaryDotNet.Actions;
using LMS.Data;
using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Enums;
using LMS.Models;
using LMS.Repositories;
using LMS.Repositories.Interfaces;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using NETCore.MailKit.Core;
using Newtonsoft.Json.Linq;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using IEmailService = LMS.Services.Interfaces.IEmailService;

namespace LMS.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepository userRepository;
        private readonly IConfiguration configuration;
        private readonly IEnrollRepository enrollRepository;
        private readonly ApplicationDbContext _context;
        private readonly IEmailService emailService;
        public AuthService(IUserRepository userRepository, IConfiguration configuration, IEnrollRepository enrollRepository, ApplicationDbContext context, IEmailService emailService)
        {
            this.userRepository = userRepository;
            this.configuration = configuration;
            this.enrollRepository = enrollRepository;
            _context = context;
            this.emailService = emailService;
        }
        public async Task<AuthResponseDTO> LoginAsync(LoginRequestDTO loginRequest)
        {
            UserModel? user = await userRepository.GetByEmailAsync(loginRequest.Email);

            if (user == null || user.IsDeleted == true)
            {
                throw new Exception("Tài khoản không tồn tại hoặc đã bị xóa khỏi hệ thống!");
            }
            if (user.IsActive == false)
            {
                throw new Exception("Tài khoản của bạn hiện đang bị khóa. Vui lòng liên hệ Admin!");
            }
            bool isPasswordCorrect = BCrypt.Net.BCrypt.Verify(loginRequest.Password, user.PasswordHash);
            if (!isPasswordCorrect)
            {
                throw new Exception("Mật khẩu không chính xác!");
            }
            var tokens = GenerateTokens(user);

            return new AuthResponseDTO
            {
                AccessToken = tokens.AccessToken,   
                RefreshToken = tokens.RefreshToken,
                Username = user.FullName,
                Role = (RoleEnum)user.RoleId,
                Email = user.Email,
                UserId = user.Id,
                AvatarUrl = user.AvatarUrl,
            };
        }
        public (string AccessToken, string RefreshToken) GenerateTokens(UserModel user)
        {
            // 1. Lấy Key và Cấu hình từ appsettings.json
            var jwtSettings = configuration.GetSection("Jwt");
            var key = Encoding.UTF8.GetBytes(jwtSettings["Key"]);

            var creds = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256);

            // 2. Định nghĩa Claims cho ACCESS TOKEN (Chứa đầy đủ thông tin giao diện cần)
            var accessClaims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim("Avatar", user.AvatarUrl ?? "/images/default-avatar.png"),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, ((RoleEnum)user.RoleId).ToString()),
            new Claim("TokenType", "Access") // 📍 Cờ đánh dấu đây là thẻ vào cửa
        };

            // 3. Định nghĩa Claims cho REFRESH TOKEN (Càng nhẹ càng tốt, chỉ cần ID)
            var refreshClaims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim("TokenType", "Refresh") // 📍 Cờ đánh dấu đây là thẻ xin cấp lại
        };

            var tokenHandler = new JwtSecurityTokenHandler();

            // 4. Cấu hình và tạo ACCESS TOKEN (Sống 30 phút)
            var accessDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(accessClaims),
                Expires = DateTime.UtcNow.AddMinutes(30),
                SigningCredentials = creds,
                Issuer = jwtSettings["Issuer"],
                Audience = jwtSettings["Audience"]
            };
            var accessToken = tokenHandler.WriteToken(tokenHandler.CreateToken(accessDescriptor));

            var refreshDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(refreshClaims),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = creds,
                Issuer = jwtSettings["Issuer"],
                Audience = jwtSettings["Audience"]
            };
            var refreshToken = tokenHandler.WriteToken(tokenHandler.CreateToken(refreshDescriptor));
            return (accessToken, refreshToken);
        }
        public async Task<AuthResponseDTO> RegisterAsync(RegisterRequestDTO dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var isExists = await userRepository.ExistsByEmailAsync(dto.Email);
                if (isExists) throw new Exception("Email đã tồn tại!");
                var newUser = new UserModel
                {
                    FullName = dto.FullName,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                    Email = dto.Email,
                    RoleId = 2, 
                    IsActive = true 
                };

                await userRepository.AddAsync(newUser);
                await _context.SaveChangesAsync();
                newUser.Role = new RoleModel { RoleName = "Student" };
                if (dto.CourseId.HasValue && dto.CourseId.Value > 0)
                {
                    var isAlreadyEnrolled = await enrollRepository.IsEnrolledAsync(newUser.Id, dto.CourseId.Value);
                    if (!isAlreadyEnrolled)
                    {
                        var newEnroll = new EnrollmentModel
                        {
                            UserId = newUser.Id, // Id chuẩn
                            CourseId = dto.CourseId.Value,
                            CreatedAt = DateTime.UtcNow.AddHours(7),
                            IsActive = true
                        };
                        await enrollRepository.AddAsync(newEnroll);
                        await _context.SaveChangesAsync();
                    }
                }
                await transaction.CommitAsync();
                var tokens = GenerateTokens(newUser);

                return new AuthResponseDTO
                {
                    AccessToken = tokens.AccessToken,
                    RefreshToken = tokens.RefreshToken,
                    Username = newUser.FullName,
                    Email = newUser.Email,
                    Role = (RoleEnum)newUser.RoleId,
                    UserId = newUser.Id,
                    AvatarUrl = string.IsNullOrEmpty(newUser.AvatarUrl)
                        ? "/assets/images/default-avatar.png"
                        : newUser.AvatarUrl,
                };
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Console.WriteLine($"[Register Error]: {ex.Message}");
                throw new Exception("Lỗi đăng ký: " + ex.Message);
            }
        }
        public async Task ForgotPasswordAsync(string email)
        {
            // 1. Tìm user trong Database
            var user = await userRepository.GetByEmailAsync(email);
            if (user == null)
            {
                throw new Exception("Email không tồn tại trong hệ thống!");
            }

            Random rnd = new Random();
            string otpCode = rnd.Next(100000, 999999).ToString();

            user.ResetPasswordOtp = otpCode;
            user.ResetPasswordOtpExpiry = DateTime.UtcNow.AddMinutes(5);

            await userRepository.UpdateAsync(user);
            string subject = "Mã xác nhận khôi phục mật khẩu";
            string body = $@"
                <h3>Xin chào {user.FullName},</h3>
                <p>Bạn vừa yêu cầu khôi phục mật khẩu trên hệ thống LMS.</p>
                <p>Mã xác nhận (OTP) của bạn là: <strong style='font-size:24px; color:blue;'>{otpCode}</strong></p>
                <p>Mã này sẽ hết hạn sau <strong>5 phút</strong>. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
                <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
            ";
            await emailService.SendEmailAsync(user.Email, subject, body);
        }
        public async Task<bool> VerifyOtpAsync(string email, string otpCode)
        {
            var user = await userRepository.GetByEmailAsync(email);
            if (user == null)
                throw new Exception("Email không tồn tại trong hệ thống!");

            if (string.IsNullOrEmpty(user.ResetPasswordOtp) || user.ResetPasswordOtp != otpCode)
                throw new Exception("Mã xác nhận không chính xác!");
            if (user.ResetPasswordOtpExpiry < DateTime.UtcNow)
                throw new Exception("Mã xác nhận đã hết hạn! Vui lòng yêu cầu gửi mã mới.");

            return true;
        }

        public async Task ResetPasswordAsync(string email, string otpCode, string newPassword)
        {
            var user = await userRepository.GetByEmailAsync(email);
            if (user == null)
                throw new Exception("Email không tồn tại!");
            if (user.ResetPasswordOtp != otpCode || user.ResetPasswordOtpExpiry < DateTime.UtcNow)
                throw new Exception("Mã xác nhận không hợp lệ hoặc đã hết hạn!");
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            user.ResetPasswordOtp = null;
            user.ResetPasswordOtpExpiry = null;
            await userRepository.UpdateAsync(user);
        }
        public async Task<AuthResponseDTO> RefreshTokenAsync(RefreshTokenRequestDTO request)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            // Lấy Key bảo mật từ biến configuration đã được inject ở Constructor của AuthService
            var key = Encoding.UTF8.GetBytes(configuration["Jwt:Key"]);

            try
            {
                // 1. Xác thực Refresh Token
                tokenHandler.ValidateToken(request.RefreshToken, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ClockSkew = TimeSpan.Zero
                }, out SecurityToken validatedToken);

                var jwtToken = (JwtSecurityToken)validatedToken;

                // 2. Kiểm tra loại Token
                var tokenType = jwtToken.Claims.FirstOrDefault(x => x.Type == "TokenType")?.Value;
                if (tokenType != "Refresh")
                {
                    throw new Exception("Token không hợp lệ!");
                }

                // 3. Trích xuất ID và tìm User trong Database
                var userIdString = jwtToken.Claims.FirstOrDefault(x => x.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdString) || !int.TryParse(userIdString, out int userId))
                {
                    throw new Exception("Dữ liệu Token bị hỏng!");
                }

                var user = await userRepository.GetByIdAsync(userId);
                if (user == null || user.IsDeleted == true || user.IsActive == false)
                {
                    throw new Exception("Tài khoản không tồn tại hoặc đã bị khóa!");
                }

                // 4. Sinh cặp Token mới
                var tokens = GenerateTokens(user);

                // 5. Map dữ liệu trả về
                return new AuthResponseDTO
                {
                    AccessToken = tokens.AccessToken,
                    RefreshToken = tokens.RefreshToken,
                    Username = user.FullName,
                    Email = user.Email,
                    Role = (RoleEnum)user.RoleId,
                    UserId = user.Id,
                    AvatarUrl = user.AvatarUrl
                };
            }
            catch (Exception)
            {
                // Bắt mọi lỗi (hết hạn, sai chữ ký, v.v.) và quăng ra để Controller xử lý
                throw new Exception("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!");
            }
        }
    }
}
