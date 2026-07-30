using PortfolioApi.Services;

var builder = WebApplication.CreateBuilder(args);

// ── CORS ─────────────────────────────────────────────────────────────────────
// Allow requests from any frontend origin (adjust for production)
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy
            .AllowAnyOrigin()  // Replace with .WithOrigins("https://yourfrontend.com") in prod
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// ── Controllers ───────────────────────────────────────────────────────────────
builder.Services.AddControllers();

// ── HTTP Clients via DI ───────────────────────────────────────────────────────
// Typed clients: each service gets its own HttpClient instance
builder.Services.AddHttpClient<IGitHubService, GitHubService>();
builder.Services.AddHttpClient<IAiService, AiService>();

// ── Build ─────────────────────────────────────────────────────────────────────
var app = builder.Build();

// In production nginx handles TLS — no HTTPS redirection needed from the container
if (app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseCors("FrontendPolicy");

// Health check for Docker healthcheck / load balancers
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

app.MapControllers();

app.Run();
