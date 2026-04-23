using TravelPlanner.API.Models.Enums;

namespace TravelPlanner.API.Models;

public class Itinerary
{
    public ulong Id { get; set; }
    public ulong UserId { get; set; }
    public string Name { get; set; } = null!;
    public DateTime? TripDate { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public string? StartLocation { get; set; }
    public string? EndLocation { get; set; }
    public ItineraryStatus Status { get; set; } = ItineraryStatus.Draft;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public ICollection<ItineraryItem> Items { get; set; } = new List<ItineraryItem>();
}