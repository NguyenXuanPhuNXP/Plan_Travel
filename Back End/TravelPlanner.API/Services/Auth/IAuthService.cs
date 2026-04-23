using TravelPlanner.API.DTOs.Auth;

namespace TravelPlanner.API.Services.Auth;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
    Task<AuthResponseDto> LoginAsync(LoginDto dto);
    Task<AuthResponseDto> RefreshTokenAsync(RefreshTokenDto dto);
    Task LogoutAsync(string token);
    Task<UserProfileDto?> GetUserProfileAsync(ulong userId);
}
