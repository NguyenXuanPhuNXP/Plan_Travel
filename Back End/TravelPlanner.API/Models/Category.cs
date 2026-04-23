using TravelPlanner.API.Models.Enums;

namespace TravelPlanner.API.Models;

public class Category
{
    public ulong Id { get; set; }
    public string Name { get; set; } = null!;
    public CategoryType CategoryType { get; set; } = CategoryType.Both;
    public string? Description { get; set; }

    public ICollection<UserPreference> UserPreferences { get; set; } = new List<UserPreference>();
    public ICollection<Business> Businesses { get; set; } = new List<Business>();
}