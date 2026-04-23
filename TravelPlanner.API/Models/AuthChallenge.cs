namespace TravelPlanner.API.Models;

public class AuthChallenge
{
    public ulong Id { get; set; }
    public ulong UserId { get; set; }
    public string ChallengeToken { get; set; } = null!;
    public DateTime ExpiresAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}