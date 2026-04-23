using NetTopologySuite.Geometries;

namespace TravelPlanner.API.Models;

public class Business
{
    public ulong Id { get; set; }
    public ulong CategoryId { get; set; }
    public string Name { get; set; } = null!;
    public string? Address { get; set; }
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public Point GeoPoint { get; set; } = null!;
    public string? ImageUrl { get; set; }
    public string? Detail { get; set; }
    public string? OpeningHours { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Category Category { get; set; } = null!;
    public ICollection<ItineraryItem> ItineraryItems { get; set; } = new List<ItineraryItem>();
    public ICollection<VisitHistory> VisitHistories { get; set; } = new List<VisitHistory>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
}