namespace TravelPlanner.API.Models;

public class ItineraryItem
{
    public ulong Id { get; set; }
    public ulong ItineraryId { get; set; }
    public ulong? LocationId { get; set; }
    public ulong? BusinessId { get; set; }
    public uint SortOrder { get; set; }
    public DateTime? PlannedStartTime { get; set; }
    public DateTime? PlannedEndTime { get; set; }
    public uint? TravelMinutes { get; set; }
    public decimal? TravelDistanceKm { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Itinerary Itinerary { get; set; } = null!;
    public Location? Location { get; set; }
    public Business? Business { get; set; }
}