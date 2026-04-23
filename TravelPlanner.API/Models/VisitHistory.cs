using NetTopologySuite.Geometries;

namespace TravelPlanner.API.Models;

public class VisitHistory
{
    public ulong Id { get; set; }
    public ulong UserId { get; set; }
    public ulong? LocationId { get; set; }
    public ulong? BusinessId { get; set; }
    public decimal UserLatitude { get; set; }
    public decimal UserLongitude { get; set; }
    public Point GpsPoint { get; set; } = null!;
    public decimal? DistanceMeters { get; set; }
    public DateTime CheckInTime { get; set; }
    public DateTime? CheckOutTime { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public Location? Location { get; set; }
    public Business? Business { get; set; }
}