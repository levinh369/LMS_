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
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace LMS.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepository userRepository;
        private readonly IConfiguration configuration;
        private readonly IEnrollRepository enrollRepository;
        private readonly ApplicationDbContext _context;
        public AuthService(IUserRepository userRepository, IConfiguration configuration, IEnrollRepository enrollRepository, ApplicationDbContext context)
        {
            this.userRepository = userRepository;
            this.configuration = configuration;
            this.enrollRepository = enrollRepository;
            _context = context;
        }
        public async Task<AuthResponseDTO> LoginAsync(LoginRequestDTO loginRequest)
        {
            UserModel user = await userRepository.GetByEmailAsync(loginRequest.Email);
            if (user == null) return null;

            bool isPasswordCorrect = BCrypt.Net.BCrypt.Verify(loginRequest.Password, user.PasswordHash);
            if (!isPasswordCorrect) return null;
            var token = GenerateJwtToken(user);

            return new AuthResponseDTO
            {
                Token = token,
                Username = user.FullName,
                Role = (RoleEnum)user.RoleId, 
                Email = user.Email,
                UserId = user.Id,
                AvatarUrl = user.AvatarUrl,
            };
        }
        public string GenerateJwtToken(UserModel user)
        {
            // 1. Lấy Key từ appsettings.json
            // Lưu ý: Key này phải trùng khớp với Key bác cấu hình trong Program.cs
            var jwtSettings = configuration.GetSection("Jwt");
            var key = Encoding.UTF8.GetBytes(jwtSettings["Key"]);

            // 2. Định nghĩa các Claims (Thông tin muốn lưu trong Token)
            var claims = new List<Claim>
    {
        // Lưu ID user (để sau này biết ai đang gửi request)
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
        
        // Lưu Username
        new Claim(ClaimTypes.Name, user.Email),
        
        // QUAN TRỌNG: Lưu Role để test phân quyền [Authorize(Roles = "Admin")]
        // Nếu user.Role là null thì để chuỗi rỗng để tránh lỗi
        //new Claim(ClaimTypes.Role, user.Role ?? "")
    };

            // 3. Tạo chữ ký bảo mật (Signing Credentials)
            var creds = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256);

            // 4. Cấu hình Token
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddMinutes(30), // Token hết hạn sau 30 phút
                SigningCredentials = creds,
                Issuer = jwtSettings["Issuer"],
                Audience = jwtSettings["Audience"]
            };

            // 5. Tạo Token và trả về chuỗi String
            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);

            return tokenHandler.WriteToken(token);
        }
        public async Task<AuthResponseDTO> RegisterAsync(RegisterRequestDTO dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var isExists = await userRepository.ExistsByEmailAsync(dto.Email);
                if (isExists) throw new Exception("Email đã tồn tại!");

                // 2. Tạo User
                var newUser = new UserModel
                {
                    FullName = dto.FullName,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                    Email = dto.Email,
                    RoleId = 2,
                };
                await userRepository.AddAsync(newUser);
                if (dto.CourseId.HasValue && dto.CourseId.Value > 0)
                {
                    var isAlreadyEnrolled = await enrollRepository.IsEnrolledAsync(newUser.Id, dto.CourseId.Value);
                    if (!isAlreadyEnrolled)
                    {
                        var newEnroll = new EnrollmentModel
                        {
                            UserId = newUser.Id,
                            CourseId = dto.CourseId.Value,
                            CreatedAt = DateTime.UtcNow.AddHours(7),
                            IsActive = true,

                        };
                        await enrollRepository.AddAsync(newEnroll);
                    }
                }
                await transaction.CommitAsync();

                var token = GenerateJwtToken(newUser);
                return new AuthResponseDTO
                {
                    Token = token,
                    Username = newUser.FullName,
                    Email = newUser.Email,
                    Role = (RoleEnum)newUser.RoleId,
                    AvatarUrl = newUser.AvatarUrl,  
                };
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                throw new Exception("Lỗi đăng ký: " + ex.Message);
            }
        }


    }
}
