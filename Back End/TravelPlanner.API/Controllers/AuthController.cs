using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelPlanner.API.DTOs.Auth;
using TravelPlanner.API.Services.Auth;

namespace TravelPlanner.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        try
        {
            var response = await _authService.RegisterAsync(dto);
            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Lỗi máy chủ nội bộ.", details = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        try
        {
            var response = await _authService.LoginAsync(dto);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Lỗi máy chủ nội bộ.", details = ex.Message });
        }
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenDto dto)
    {
        try
        {
            var response = await _authService.RefreshTokenAsync(dto);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Lỗi máy chủ nội bộ.", details = ex.Message });
        }
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshTokenDto dto)
    {
        try
        {
            await _authService.LogoutAsync(dto.RefreshToken);
            return Ok(new { message = "Đăng xuất thành công." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Lỗi máy chủ nội bộ.", details = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        try
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString) || !ulong.TryParse(userIdString, out var userId))
            {
                return Unauthorized(new { message = "Token không hợp lệ." });
            }

            var userProfile = await _authService.GetUserProfileAsync(userId);
            if (userProfile == null)
            {
                return NotFound(new { message = "Không tìm thấy người dùng." });
            }

            return Ok(userProfile);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Lỗi máy chủ nội bộ.", details = ex.Message });
        }
    }
}
