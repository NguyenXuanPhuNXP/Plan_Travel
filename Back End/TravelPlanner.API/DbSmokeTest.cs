using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using TravelPlanner.API.Data;
using TravelPlanner.API.Models.Enums;
using Location = TravelPlanner.API.Models.Location;
using Category = TravelPlanner.API.Models.Category;
using User = TravelPlanner.API.Models.User;
using Review = TravelPlanner.API.Models.Review;

namespace TravelPlanner.API;

/// <summary>
/// Endpoint smoke test cho database — chỉ map khi gọi trực tiếp.
/// Không tự auto-run; chỉ là helper để kiểm tra runtime DB từ controller hoặc minimal API nếu cần.
/// </summary>
public static class DbSmokeTest
{
    public static async Task<object> RunAsync(TravelPlannerDbContext db)
    {
        var results = new List<string>();
        var geomFactory = new NetTopologySuite.NtsGeometryServices().CreateGeometryFactory(srid: 4326);

        // 1. Insert Category (test enum default + sentinel)
        var cat = new Category
        {
            Name = $"TestCat-{Guid.NewGuid():N}".Substring(0, 20),
            CategoryType = CategoryType.Location,
            Description = "smoke test"
        };
        db.Categories.Add(cat);
        await db.SaveChangesAsync();
        results.Add($"Category inserted Id={cat.Id} Type={cat.CategoryType}");

        // 2. Insert User (test timestamp default + enum role)
        var user = new User
        {
            FullName = "Smoke Test",
            Email = $"smoke-{Guid.NewGuid():N}@test.local",
            Phone = $"09{Random.Shared.Next(10000000, 99999999)}",
            PasswordHash = "x",
            Role = UserRole.User
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        results.Add($"User inserted Id={user.Id} CreatedAt={user.CreatedAt:O}");

        // 3. Insert Location (test POINT spatial + JSON + decimal)
        var loc = new Location
        {
            ExternalId = $"ext-{Guid.NewGuid():N}",
            Name = "Smoke Place",
            Latitude = 21.0285m,
            Longitude = 105.8542m,
            GeoPoint = geomFactory.CreatePoint(new Coordinate(105.8542, 21.0285)),
            Tags = "[\"smoke\"]",
            Rating = 4.5m
        };
        db.Locations.Add(loc);
        await db.SaveChangesAsync();
        results.Add($"Location inserted Id={loc.Id} Geo={loc.GeoPoint.AsText()}");

        // 4. Insert Review valid (rating ok, location only)
        var rev = new Review
        {
            UserId = user.Id,
            LocationId = loc.Id,
            Rating = 5,
            Content = "ok"
        };
        db.Reviews.Add(rev);
        await db.SaveChangesAsync();
        results.Add($"Review inserted Id={rev.Id}");

        // 5. Test check constraint vi phạm (rating = 6 → phải fail)
        try
        {
            var bad = new Review
            {
                UserId = user.Id,
                BusinessId = null,
                LocationId = loc.Id,
                Rating = 6,
                Content = "bad"
            };
            db.Reviews.Add(bad);
            await db.SaveChangesAsync();
            results.Add("FAIL: rating=6 đã được insert (check constraint không hoạt động)");
        }
        catch (DbUpdateException ex)
        {
            db.ChangeTracker.Clear();
            results.Add($"OK: chk_review_rating chặn rating=6 ({ex.InnerException?.Message?.Split('\n')[0]})");
        }

        // 6. Test check constraint target (cả location_id và business_id null → fail)
        try
        {
            var bad2 = new Review
            {
                UserId = user.Id,
                LocationId = null,
                BusinessId = null,
                Rating = 3
            };
            db.Reviews.Add(bad2);
            await db.SaveChangesAsync();
            results.Add("FAIL: review không có target nào đã được insert");
        }
        catch (DbUpdateException ex)
        {
            db.ChangeTracker.Clear();
            results.Add($"OK: chk_review_target chặn cả 2 null ({ex.InnerException?.Message?.Split('\n')[0]})");
        }

        // 7. Cleanup
        db.Reviews.Remove(rev);
        db.Locations.Remove(loc);
        db.Users.Remove(user);
        db.Categories.Remove(cat);
        await db.SaveChangesAsync();
        results.Add("Cleanup OK");

        return new { ok = true, results };
    }
}
