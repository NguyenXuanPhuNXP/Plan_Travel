using TravelPlanner.API.Models.Enums;

namespace TravelPlanner.API.Models;

public class LocationSeedJob
{
    public int Id { get; set; }
    public string RegionName { get; set; } = null!;
    public string JobType { get; set; } = "geoapify_places";
    public SeedJobStatus Status { get; set; } = SeedJobStatus.Pending;
    public int LastPage { get; set; } = -1;
    public int LastOffset { get; set; } = 0;
    public int FetchedTotal { get; set; } = 0;
    public int InsertedTotal { get; set; } = 0;
    public int SkippedTotal { get; set; } = 0;
    public string? LastError { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }

    // Đổi sang DateTime và tự update trong code
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}