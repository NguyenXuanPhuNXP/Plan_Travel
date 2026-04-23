using TravelPlanner.API.Models.Enums;

namespace TravelPlanner.API.Models;

public class User
{
    public ulong Id { get; set; }
    public string FullName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Phone { get; set; }
    public string PasswordHash { get; set; } = null!;
    public UserRole Role { get; set; } = UserRole.User;
    public string? AvatarUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<AuthChallenge> AuthChallenges { get; set; } = new List<AuthChallenge>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<UserPreference> UserPreferences { get; set; } = new List<UserPreference>();
    public ICollection<Itinerary> Itineraries { get; set; } = new List<Itinerary>();
    public ICollection<VisitHistory> VisitHistories { get; set; } = new List<VisitHistory>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
}