using TravelPlanner.API.Models;

namespace TravelPlanner.API.Services.Auth;

public interface IJwtTokenService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
}
