using NetTopologySuite.Geometries;

namespace TravelPlanner.API.Models;

public class Location
{
    public ulong Id { get; set; }
    public string ExternalId { get; set; } = null!;
    public string Source { get; set; } = "geoapify";
    public string Name { get; set; } = null!;
    public string? Address { get; set; }
    public string? Country { get; set; }
    public string? CountryCode { get; set; }
    public string? Province { get; set; }
    public string? City { get; set; }
    public string? District { get; set; }
    public string? Region { get; set; }
    public string? Category { get; set; }
    public string? Subcategory { get; set; }
    public string? Description { get; set; }
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public Point GeoPoint { get; set; } = null!;
    public int EstimatedCost { get; set; } = 0;
    public string? SuggestedDuration { get; set; }
    public string? ImageUrl { get; set; }
    public decimal? Rating { get; set; }
    public string? Tags { get; set; }       // JSON string
    public string? RawJson { get; set; }    // JSON string
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ItineraryItem> ItineraryItems { get; set; } = new List<ItineraryItem>();
    public ICollection<VisitHistory> VisitHistories { get; set; } = new List<VisitHistory>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
}