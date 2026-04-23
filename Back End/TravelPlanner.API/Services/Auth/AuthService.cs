using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using TravelPlanner.API.Data;
using TravelPlanner.API.DTOs.Auth;
using TravelPlanner.API.Models;

namespace TravelPlanner.API.Services.Auth;

public class AuthService : IAuthService
{
    private readonly TravelPlannerDbContext _dbContext;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IConfiguration _configuration;

    public AuthService(TravelPlannerDbContext dbContext, IJwtTokenService jwtTokenService, IConfiguration configuration)
    {
        _dbContext = dbContext;
        _jwtTokenService = jwtTokenService;
        _configuration = configuration;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
    {
        if (dto.Password != dto.ConfirmPassword)
        {
            throw new ArgumentException("Mật khẩu xác nhận không khớp.");
        }

        var existingUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (existingUser != null)
        {
            throw new ArgumentException("Email này đã được sử dụng.");
        }

        if (!string.IsNullOrEmpty(dto.Phone))
        {
            var existingPhone = await _dbContext.Users.FirstOrDefaultAsync(u => u.Phone == dto.Phone);
            if (existingPhone != null)
            {
                throw new ArgumentException("Số điện thoại này đã được sử dụng.");
            }
        }

        var user = new User
        {
            FullName = dto.FullName,
            Email = dto.Email,
            Phone = dto.Phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            IsActive = true
        };

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        return await CreateAuthResponseAsync(user);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Email hoặc mật khẩu không chính xác.");
        }

        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException("Tài khoản của bạn đã bị vô hiệu hóa.");
        }

        return await CreateAuthResponseAsync(user);
    }

    public async Task<AuthResponseDto> RefreshTokenAsync(RefreshTokenDto dto)
    {
        var tokenHash = HashToken(dto.RefreshToken);

        var savedRefreshToken = await _dbContext.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash);

        if (savedRefreshToken == null || savedRefreshToken.RevokedAt != null || savedRefreshToken.ExpiresAt <= DateTime.UtcNow)
        {
            throw new UnauthorizedAccessException("Refresh token không hợp lệ hoặc đã hết hạn.");
        }

        // Cập nhật token hiện tại thành đã sử dụng (revoked)
        savedRefreshToken.RevokedAt = DateTime.UtcNow;

        return await CreateAuthResponseAsync(savedRefreshToken.User);
    }

    public async Task LogoutAsync(string token)
    {
        var tokenHash = HashToken(token);
        var savedRefreshToken = await _dbContext.RefreshTokens.FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash);
        
        if (savedRefreshToken != null && savedRefreshToken.RevokedAt == null)
        {
            savedRefreshToken.RevokedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();
        }
    }

    public async Task<UserProfileDto?> GetUserProfileAsync(ulong userId)
    {
        var user = await _dbContext.Users.FindAsync(userId);
        if (user == null) return null;

        return new UserProfileDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Phone = user.Phone,
            AvatarUrl = user.AvatarUrl,
            Role = user.Role
        };
    }

    private async Task<AuthResponseDto> CreateAuthResponseAsync(User user)
    {
        var accessToken = _jwtTokenService.GenerateAccessToken(user);
        var refreshToken = _jwtTokenService.GenerateRefreshToken();
        var refreshTokenHash = HashToken(refreshToken);

        var expiryDays = int.Parse(_configuration["JwtSettings:RefreshTokenExpirationDays"] ?? "7");

        var newRefreshToken = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = refreshTokenHash,
            ExpiresAt = DateTime.UtcNow.AddDays(expiryDays)
        };

        _dbContext.RefreshTokens.Add(newRefreshToken);
        await _dbContext.SaveChangesAsync();

        return new AuthResponseDto
        {
            Token = accessToken,
            RefreshToken = refreshToken,
            User = new UserProfileDto
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.Phone,
                AvatarUrl = user.AvatarUrl,
                Role = user.Role
            }
        };
    }

    private string HashToken(string token)
    {
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(token);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }
}
