namespace TravelPlanner.API.Models;

public class UserPreference
{
    public ulong UserId { get; set; }
    public ulong CategoryId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public Category Category { get; set; } = null!;
}