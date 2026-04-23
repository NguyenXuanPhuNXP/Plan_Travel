using TravelPlanner.API.Models.Enums;

namespace TravelPlanner.API.DTOs.Auth;

public class AuthResponseDto
{
    public string Token { get; set; } = null!;
    public string RefreshToken { get; set; } = null!;
    public UserProfileDto User { get; set; } = null!;
}

public class UserProfileDto
{
    public ulong Id { get; set; }
    public string FullName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Phone { get; set; }
    public string? AvatarUrl { get; set; }
    public UserRole Role { get; set; }
}
