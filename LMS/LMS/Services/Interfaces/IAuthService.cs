using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Models;
using Microsoft.AspNetCore.Authentication.OAuth;
using Microsoft.AspNetCore.Identity.Data;

namespace LMS.Services.Interfaces
{
    public interface IAuthService
    {
        Task<AuthResponseDTO> LoginAsync(LoginRequestDTO loginRequest);
        Task<AuthResponseDTO> RegisterAsync(RegisterRequestDTO registerRequest);
        (string AccessToken, string RefreshToken) GenerateTokens(UserModel user);
        Task ForgotPasswordAsync(string email);
        Task<bool> VerifyOtpAsync(string email, string otpCode);
        Task ResetPasswordAsync(string email, string otpCode, string newPassword);
        Task<AuthResponseDTO> RefreshTokenAsync(RefreshTokenRequestDTO request);
    }
}
