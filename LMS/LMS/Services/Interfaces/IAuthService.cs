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
        string GenerateJwtToken(UserModel user);
    }
}
