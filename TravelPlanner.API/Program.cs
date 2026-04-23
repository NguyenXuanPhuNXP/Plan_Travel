using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using TravelPlanner.API.Data;

var builder = WebApplication.CreateBuilder(args);

// ===== Connection String =====
var connectionString = builder.Configuration
    .GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

// ===== MySQL =====
builder.Services.AddDbContext<TravelPlannerDbContext>(options =>
{
    options.UseMySql(
        connectionString,
        ServerVersion.AutoDetect(connectionString),
        mySqlOptions =>
        {
            mySqlOptions.UseNetTopologySuite();
            mySqlOptions.EnableRetryOnFailure(
                maxRetryCount: 3,
                maxRetryDelay: TimeSpan.FromSeconds(5),
                errorNumbersToAdd: null
            );
            mySqlOptions.CommandTimeout(30);
        }
    );

    if (builder.Environment.IsDevelopment())
    {
        options.EnableSensitiveDataLogging();
        options.EnableDetailedErrors();
    }
});

// ===== Controllers =====
builder.Services.AddControllers();

// ===== OpenAPI =====
builder.Services.AddOpenApi();

var app = builder.Build();

// ===== Auto Migrate =====
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<TravelPlannerDbContext>();
        db.Database.Migrate();
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Lỗi khi migrate database");
    }
}

// ===== Middleware =====
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options.Title = "Travel Planner API";
        options.Theme = ScalarTheme.Purple;
        options.DefaultHttpClient = new(ScalarTarget.CSharp, ScalarClient.HttpClient);
    });
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

if (app.Environment.IsDevelopment())
{
    app.MapGet("/dev/db-smoke", async (TravelPlannerDbContext db) =>
        Results.Ok(await TravelPlanner.API.DbSmokeTest.RunAsync(db)));
}

app.Run();
