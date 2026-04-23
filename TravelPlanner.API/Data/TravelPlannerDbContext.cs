using Microsoft.EntityFrameworkCore;
using TravelPlanner.API.Models;
using TravelPlanner.API.Models.Enums;

namespace TravelPlanner.API.Data;

public class TravelPlannerDbContext : DbContext
{
    public TravelPlannerDbContext(DbContextOptions<TravelPlannerDbContext> options)
        : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<AuthChallenge> AuthChallenges => Set<AuthChallenge>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<UserPreference> UserPreferences => Set<UserPreference>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<Business> Businesses => Set<Business>();
    public DbSet<Itinerary> Itineraries => Set<Itinerary>();
    public DbSet<ItineraryItem> ItineraryItems => Set<ItineraryItem>();
    public DbSet<VisitHistory> VisitHistories => Set<VisitHistory>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<LocationSeedJob> LocationSeedJobs => Set<LocationSeedJob>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasCharSet("utf8mb4").UseCollation("utf8mb4_unicode_ci");

        // ===== USER =====
        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseMySqlIdentityColumn();
            e.Property(x => x.FullName).HasColumnName("full_name").HasMaxLength(150).IsRequired();
            e.Property(x => x.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
            e.Property(x => x.Phone).HasColumnName("phone").HasMaxLength(20).IsRequired();
            e.Property(x => x.PasswordHash).HasColumnName("password_hash").HasMaxLength(255).IsRequired();
            e.Property(x => x.Role)
                .HasColumnName("role")
                .HasColumnType("enum('user','admin')")
                .HasConversion(
                    v => v.ToString().ToLower(),
                    v => v == "admin" ? UserRole.Admin : UserRole.User
                )
                .HasDefaultValue(UserRole.User);
            e.Property(x => x.AvatarUrl).HasColumnName("avatar_url").HasMaxLength(500);
            e.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            e.Property(x => x.CreatedAt).HasColumnName("created_at")
                .HasColumnType("TIMESTAMP")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at")
                .HasColumnType("TIMESTAMP")
                .HasDefaultValueSql("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            e.HasIndex(x => x.Email).IsUnique();
            e.HasIndex(x => x.Phone).IsUnique();
        });

        // ===== AUTH CHALLENGE =====
        modelBuilder.Entity<AuthChallenge>(e =>
        {
            e.ToTable("auth_challenges");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseMySqlIdentityColumn();
            e.Property(x => x.UserId).HasColumnName("user_id").IsRequired();
            e.Property(x => x.ChallengeToken).HasColumnName("challenge_token").HasMaxLength(255).IsRequired();
            e.Property(x => x.ExpiresAt).HasColumnName("expires_at").HasColumnType("TIMESTAMP").IsRequired();
            e.Property(x => x.UsedAt).HasColumnName("used_at").HasColumnType("TIMESTAMP");
            e.Property(x => x.CreatedAt).HasColumnName("created_at")
                .HasColumnType("TIMESTAMP")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
            e.HasIndex(x => x.ChallengeToken).IsUnique();
            e.HasOne(x => x.User)
                .WithMany(x => x.AuthChallenges)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ===== REFRESH TOKEN =====
        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.ToTable("refresh_tokens");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseMySqlIdentityColumn();
            e.Property(x => x.UserId).HasColumnName("user_id").IsRequired();
            e.Property(x => x.TokenHash).HasColumnName("token_hash").HasMaxLength(255).IsRequired();
            e.Property(x => x.ExpiresAt).HasColumnName("expires_at").HasColumnType("TIMESTAMP").IsRequired();
            e.Property(x => x.RevokedAt).HasColumnName("revoked_at").HasColumnType("TIMESTAMP");
            e.Property(x => x.CreatedAt).HasColumnName("created_at")
                .HasColumnType("TIMESTAMP")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
            e.HasIndex(x => x.TokenHash).IsUnique();
            e.HasOne(x => x.User)
                .WithMany(x => x.RefreshTokens)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ===== CATEGORY =====
        modelBuilder.Entity<Category>(e =>
        {
            e.ToTable("categories");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseMySqlIdentityColumn();
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
            e.Property(x => x.CategoryType)
                .HasColumnName("category_type")
                .HasColumnType("enum('location','business','both')")
                .HasConversion(
                    v => v.ToString().ToLower(),
                    v => v == "location" ? CategoryType.Location
                       : v == "business" ? CategoryType.Business
                       : CategoryType.Both
                )
                .HasDefaultValue(CategoryType.Both)
                .HasSentinel((CategoryType)(-1));
            e.Property(x => x.Description).HasColumnName("description").HasMaxLength(500);
            e.HasIndex(x => x.Name).IsUnique();
        });

        // ===== USER PREFERENCE =====
        modelBuilder.Entity<UserPreference>(e =>
        {
            e.ToTable("user_preferences");
            e.HasKey(x => new { x.UserId, x.CategoryId });
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.CategoryId).HasColumnName("category_id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at")
                .HasColumnType("TIMESTAMP")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
            e.HasOne(x => x.User)
                .WithMany(x => x.UserPreferences)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Category)
                .WithMany(x => x.UserPreferences)
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ===== LOCATION =====
        modelBuilder.Entity<Location>(e =>
        {
            e.ToTable("locations");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseMySqlIdentityColumn();
            e.Property(x => x.ExternalId).HasColumnName("external_id").HasMaxLength(255).IsRequired();
            e.Property(x => x.Source).HasColumnName("source").HasMaxLength(50).HasDefaultValue("geoapify");
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            e.Property(x => x.Address).HasColumnName("address").HasColumnType("TEXT");
            e.Property(x => x.Country).HasColumnName("country").HasMaxLength(100);
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(10);
            e.Property(x => x.Province).HasColumnName("province").HasMaxLength(100);
            e.Property(x => x.City).HasColumnName("city").HasMaxLength(100);
            e.Property(x => x.District).HasColumnName("district").HasMaxLength(100);
            e.Property(x => x.Region).HasColumnName("region").HasMaxLength(100);
            e.Property(x => x.Category).HasColumnName("category").HasMaxLength(100);
            e.Property(x => x.Subcategory).HasColumnName("subcategory").HasMaxLength(150);
            e.Property(x => x.Description).HasColumnName("description").HasColumnType("TEXT");
            e.Property(x => x.Latitude).HasColumnName("latitude").HasColumnType("DECIMAL(10,7)").IsRequired();
            e.Property(x => x.Longitude).HasColumnName("longitude").HasColumnType("DECIMAL(10,7)").IsRequired();
            e.Property(x => x.GeoPoint).HasColumnName("geo_point").HasColumnType("POINT").IsRequired();
            e.Property(x => x.EstimatedCost).HasColumnName("estimated_cost").HasDefaultValue(0);
            e.Property(x => x.SuggestedDuration).HasColumnName("suggested_duration").HasMaxLength(50);
            e.Property(x => x.ImageUrl).HasColumnName("image_url").HasColumnType("TEXT");
            e.Property(x => x.Rating).HasColumnName("rating").HasColumnType("DECIMAL(3,2)");
            e.Property(x => x.Tags).HasColumnName("tags").HasColumnType("JSON");
            e.Property(x => x.RawJson).HasColumnName("raw_json").HasColumnType("JSON");
            e.Property(x => x.CreatedAt).HasColumnName("created_at")
                .HasColumnType("TIMESTAMP")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at")
                .HasColumnType("TIMESTAMP")
                .HasDefaultValueSql("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            e.HasIndex(x => x.ExternalId).IsUnique().HasDatabaseName("uq_locations_external_id");
            e.HasIndex(x => x.Region).HasDatabaseName("idx_locations_region");
            e.HasIndex(x => x.City).HasDatabaseName("idx_locations_city");
            e.HasIndex(x => x.Category).HasDatabaseName("idx_locations_category");
            e.HasIndex(x => x.Name).HasDatabaseName("idx_locations_name");
        });

        // ===== BUSINESS =====
        modelBuilder.Entity<Business>(e =>
        {
            e.ToTable("businesses");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseMySqlIdentityColumn();
            e.Property(x => x.CategoryId).HasColumnName("category_id").IsRequired();
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
            e.Property(x => x.Address).HasColumnName("address").HasMaxLength(255);
            e.Property(x => x.Latitude).HasColumnName("latitude").HasColumnType("DECIMAL(10,7)").IsRequired();
            e.Property(x => x.Longitude).HasColumnName("longitude").HasColumnType("DECIMAL(10,7)").IsRequired();
            e.Property(x => x.GeoPoint).HasColumnName("geo_point").HasColumnType("POINT").IsRequired();
            e.Property(x => x.ImageUrl).HasColumnName("image_url").HasMaxLength(500);
            e.Property(x => x.Detail).HasColumnName("detail").HasColumnType("TEXT");
            e.Property(x => x.OpeningHours).HasColumnName("opening_hours").HasMaxLength(255);
            e.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("TIMESTAMP").HasDefaultValueSql("CURRENT_TIMESTAMP");
            e.HasOne(x => x.Category)
                .WithMany(x => x.Businesses)
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.CategoryId).HasDatabaseName("idx_businesses_category");
            e.HasIndex(new[] { "Latitude", "Longitude" }).HasDatabaseName("idx_businesses_latlng");
        });

        // ===== ITINERARY =====
        modelBuilder.Entity<Itinerary>(e =>
        {
            e.ToTable("itineraries");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseMySqlIdentityColumn();
            e.Property(x => x.UserId).HasColumnName("user_id").IsRequired();
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
            e.Property(x => x.TripDate).HasColumnName("trip_date").HasColumnType("DATE");
            e.Property(x => x.StartTime).HasColumnName("start_time");
            e.Property(x => x.EndTime).HasColumnName("end_time");
            e.Property(x => x.StartLocation).HasColumnName("start_location").HasMaxLength(255);
            e.Property(x => x.EndLocation).HasColumnName("end_location").HasMaxLength(255);
            e.Property(x => x.Status)
                .HasColumnName("status")
                .HasColumnType("enum('draft','generated','completed','cancelled')")
                .HasConversion(
                    v => v.ToString().ToLower(),
                    v => v == "generated" ? ItineraryStatus.Generated
                       : v == "completed" ? ItineraryStatus.Completed
                       : v == "cancelled" ? ItineraryStatus.Cancelled
                       : ItineraryStatus.Draft
                )
                .HasDefaultValue(ItineraryStatus.Draft);
            e.Property(x => x.CreatedAt).HasColumnName("created_at")
                .HasColumnType("TIMESTAMP")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
            e.HasOne(x => x.User)
                .WithMany(x => x.Itineraries)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.UserId).HasDatabaseName("idx_itineraries_user");
        });

        // ===== ITINERARY ITEM =====
        modelBuilder.Entity<ItineraryItem>(e =>
        {
            e.ToTable("itinerary_items");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseMySqlIdentityColumn();
            e.Property(x => x.ItineraryId).HasColumnName("itinerary_id").IsRequired();
            e.Property(x => x.LocationId).HasColumnName("location_id");
            e.Property(x => x.BusinessId).HasColumnName("business_id");
            e.Property(x => x.SortOrder).HasColumnName("sort_order").IsRequired();
            e.Property(x => x.PlannedStartTime).HasColumnName("planned_start_time");
            e.Property(x => x.PlannedEndTime).HasColumnName("planned_end_time");
                        e.Property(x => x.TravelMinutes).HasColumnName("travel_minutes");
            e.Property(x => x.TravelDistanceKm).HasColumnName("travel_distance_km").HasColumnType("DECIMAL(8,2)");
            e.Property(x => x.Note).HasColumnName("note").HasMaxLength(500);
            e.Property(x => x.CreatedAt).HasColumnName("created_at")
                .HasColumnType("TIMESTAMP")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            e.HasOne(x => x.Itinerary)
                .WithMany(x => x.Items)
                .HasForeignKey(x => x.ItineraryId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Location)
                .WithMany(x => x.ItineraryItems)
                .HasForeignKey(x => x.LocationId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Business)
                .WithMany(x => x.ItineraryItems)
                .HasForeignKey(x => x.BusinessId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(new[] { "ItineraryId", "SortOrder" })
                .IsUnique()
                .HasDatabaseName("uq_itinerary_order");
            e.HasIndex(x => x.LocationId).HasDatabaseName("idx_itinerary_location");
            e.HasIndex(x => x.BusinessId).HasDatabaseName("idx_itinerary_business");

            // CHECK constraint: chỉ 1 trong 2 phải có giá trị
            e.ToTable(t => t.HasCheckConstraint(
                "chk_itinerary_target",
                "(location_id IS NOT NULL AND business_id IS NULL) OR (location_id IS NULL AND business_id IS NOT NULL)"
            ));
        });

        // ===== VISIT HISTORY =====
        modelBuilder.Entity<VisitHistory>(e =>
        {
            e.ToTable("visit_history");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseMySqlIdentityColumn();
            e.Property(x => x.UserId).HasColumnName("user_id").IsRequired();
            e.Property(x => x.LocationId).HasColumnName("location_id");
            e.Property(x => x.BusinessId).HasColumnName("business_id");
            e.Property(x => x.UserLatitude).HasColumnName("user_latitude").HasColumnType("DECIMAL(10,7)").IsRequired();
            e.Property(x => x.UserLongitude).HasColumnName("user_longitude").HasColumnType("DECIMAL(10,7)").IsRequired();
            e.Property(x => x.GpsPoint).HasColumnName("gps_point").HasColumnType("POINT").IsRequired();
            e.Property(x => x.DistanceMeters).HasColumnName("distance_meters").HasColumnType("DECIMAL(10,2)");
            e.Property(x => x.CheckInTime).HasColumnName("check_in_time").HasColumnType("TIMESTAMP").IsRequired();
            e.Property(x => x.CheckOutTime).HasColumnName("check_out_time").HasColumnType("TIMESTAMP");
            e.Property(x => x.CreatedAt).HasColumnName("created_at")
                .HasColumnType("TIMESTAMP")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            e.HasOne(x => x.User)
                .WithMany(x => x.VisitHistories)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Location)
                .WithMany(x => x.VisitHistories)
                .HasForeignKey(x => x.LocationId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Business)
                .WithMany(x => x.VisitHistories)
                .HasForeignKey(x => x.BusinessId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(x => x.UserId).HasDatabaseName("idx_visit_user");

            // CHECK constraint
            e.ToTable(t => t.HasCheckConstraint(
                "chk_visit_target",
                "(location_id IS NOT NULL AND business_id IS NULL) OR (location_id IS NULL AND business_id IS NOT NULL)"
            ));
        });

        // ===== REVIEW =====
        modelBuilder.Entity<Review>(e =>
        {
            e.ToTable("reviews");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").UseMySqlIdentityColumn();
            e.Property(x => x.UserId).HasColumnName("user_id").IsRequired();
            e.Property(x => x.LocationId).HasColumnName("location_id");
            e.Property(x => x.BusinessId).HasColumnName("business_id");
            e.Property(x => x.Rating).HasColumnName("rating").IsRequired();
            e.Property(x => x.Content).HasColumnName("content").HasColumnType("TEXT");
            e.Property(x => x.ImageUrl).HasColumnName("image_url").HasMaxLength(500);
            e.Property(x => x.CreatedAt).HasColumnName("created_at")
                .HasColumnType("TIMESTAMP")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            e.HasOne(x => x.User)
                .WithMany(x => x.Reviews)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            // Restrict cho Location/Business để tránh multiple cascade paths trên MySQL
            e.HasOne(x => x.Location)
                .WithMany(x => x.Reviews)
                .HasForeignKey(x => x.LocationId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Business)
                .WithMany(x => x.Reviews)
                .HasForeignKey(x => x.BusinessId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(new[] { "UserId", "LocationId" })
                .IsUnique()
                .HasDatabaseName("uq_user_location_review");
            e.HasIndex(new[] { "UserId", "BusinessId" })
                .IsUnique()
                .HasDatabaseName("uq_user_business_review");
            e.HasIndex(x => x.Rating).HasDatabaseName("idx_reviews_rating");

            // CHECK constraint rating 1-5
            e.ToTable(t => t.HasCheckConstraint(
                "chk_review_rating",
                "rating BETWEEN 1 AND 5"
            ));

            // CHECK constraint target
            e.ToTable(t => t.HasCheckConstraint(
                "chk_review_target",
                "(location_id IS NOT NULL AND business_id IS NULL) OR (location_id IS NULL AND business_id IS NOT NULL)"
            ));
        });

        // ===== LOCATION SEED JOB =====
        // ===== LOCATION SEED JOB =====
        modelBuilder.Entity<LocationSeedJob>(e =>
        {
            e.ToTable("location_seed_jobs");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id)
                .HasColumnName("id")
                .UseMySqlIdentityColumn();
            e.Property(x => x.RegionName)
                .HasColumnName("region_name")
                .HasMaxLength(100)
                .IsRequired();
            e.Property(x => x.JobType)
                .HasColumnName("job_type")
                .HasMaxLength(50)
                .HasDefaultValue("geoapify_places");
            e.Property(x => x.Status)
                .HasColumnName("status")
                .HasColumnType("enum('pending','running','done','failed')")
                .HasConversion(
                    v => v == SeedJobStatus.Running ? "running"
                    : v == SeedJobStatus.Done ? "done"
                    : v == SeedJobStatus.Failed ? "failed"
                    : "pending",
                    v => v == "running" ? SeedJobStatus.Running
                    : v == "done" ? SeedJobStatus.Done
                    : v == "failed" ? SeedJobStatus.Failed
                    : SeedJobStatus.Pending
                )
                .HasDefaultValue(SeedJobStatus.Pending);
            e.Property(x => x.LastPage)
                .HasColumnName("last_page")
                .HasDefaultValue(-1);
            e.Property(x => x.LastOffset)
                .HasColumnName("last_offset")
                .HasDefaultValue(0);
            e.Property(x => x.FetchedTotal)
                .HasColumnName("fetched_total")
                .HasDefaultValue(0);
            e.Property(x => x.InsertedTotal)
                .HasColumnName("inserted_total")
                .HasDefaultValue(0);
            e.Property(x => x.SkippedTotal)
                .HasColumnName("skipped_total")
                .HasDefaultValue(0);
            e.Property(x => x.LastError)
                .HasColumnName("last_error")
                .HasColumnType("TEXT");
            e.Property(x => x.StartedAt)
                .HasColumnName("started_at")
                .HasColumnType("TIMESTAMP")
                .IsRequired(false);
            e.Property(x => x.FinishedAt)
                .HasColumnName("finished_at")
                .HasColumnType("TIMESTAMP")
                .IsRequired(false);

            // Dùng TIMESTAMP thay datetime(6) để tránh lỗi, kèm ON UPDATE CURRENT_TIMESTAMP
            // Không dùng ValueGeneratedOnAddOrUpdate() để Pomelo không tự thêm ON UPDATE lần nữa (gây duplicate)
            e.Property(x => x.UpdatedAt)
                .HasColumnName("updated_at")
                .HasColumnType("TIMESTAMP")
                .HasDefaultValueSql("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            e.Property(x => x.CreatedAt)
                .HasColumnName("created_at")
                .HasColumnType("TIMESTAMP")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            e.HasIndex(new[] { "RegionName", "JobType" })
                .IsUnique()
                .HasDatabaseName("uq_seed_region_jobtype");
        });
    }
}