using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace PortfolioApi.Services;

/// <summary>
/// Persistent file-based cache for GitHub repository AI analysis results.
/// Stores results in projects-cache.json to avoid redundant AI calls, save quotas, and ensure consistency.
/// </summary>
public class ProjectCacheService
{
    private readonly string _cacheFilePath;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private readonly ILogger<ProjectCacheService> _logger;

    public ProjectCacheService(ILogger<ProjectCacheService> logger)
    {
        _logger = logger;
        _cacheFilePath = Path.Combine(AppContext.BaseDirectory, "projects-cache.json");
        _logger.LogInformation("ProjectCacheService initialized with cache file: {Path}", _cacheFilePath);
    }

    private static string GetCacheKey(string owner, string repo) =>
        $"{owner.Trim()}/{repo.Trim()}".ToLowerInvariant();

    /// <summary>
    /// Attempts to retrieve a cached AI analysis JSON string for the given repository.
    /// Returns null if not cached or if an error occurs.
    /// </summary>
    public async Task<string?> TryGetAnalysisAsync(string owner, string repo)
    {
        var key = GetCacheKey(owner, repo);
        await _lock.WaitAsync();
        try
        {
            if (!File.Exists(_cacheFilePath))
                return null;

            var json = await File.ReadAllTextAsync(_cacheFilePath);
            if (string.IsNullOrWhiteSpace(json))
                return null;

            var cache = JsonSerializer.Deserialize<Dictionary<string, string>>(json);
            if (cache != null && cache.TryGetValue(key, out var cachedAnalysis))
            {
                _logger.LogInformation("Cache HIT for repo {Key}", key);
                return cachedAnalysis;
            }

            _logger.LogInformation("Cache MISS for repo {Key}", key);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read analysis from cache file for {Key}", key);
            return null;
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <summary>
    /// Saves an AI analysis JSON string to the persistent cache for the given repository.
    /// </summary>
    public async Task SaveAnalysisAsync(string owner, string repo, string aiJson)
    {
        var key = GetCacheKey(owner, repo);
        await _lock.WaitAsync();
        try
        {
            Dictionary<string, string> cache = new();
            if (File.Exists(_cacheFilePath))
            {
                var existingJson = await File.ReadAllTextAsync(_cacheFilePath);
                if (!string.IsNullOrWhiteSpace(existingJson))
                {
                    try
                    {
                        cache = JsonSerializer.Deserialize<Dictionary<string, string>>(existingJson)
                                ?? new Dictionary<string, string>();
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Existing cache file was corrupted, recreating a clean cache dictionary.");
                    }
                }
            }

            cache[key] = aiJson;
            var serialized = JsonSerializer.Serialize(cache, new JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(_cacheFilePath, serialized);

            _logger.LogInformation("Saved AI analysis to persistent cache for repo {Key}", key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save analysis to cache file for {Key}", key);
        }
        finally
        {
            _lock.Release();
        }
    }
}
