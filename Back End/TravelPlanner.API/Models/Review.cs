namespace TravelPlanner.API.Models;

public class Review
{
    public ulong Id { get; set; }
    public ulong UserId { get; set; }
    public ulong? LocationId { get; set; }
    public ulong? BusinessId { get; set; }
    public byte Rating { get; set; }
    public string? Content { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public Location? Location { get; set; }
    public Business? Business { get; set; }
}