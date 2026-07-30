using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using PortfolioApi.Models;

namespace PortfolioApi.Services;

/// <summary>
/// Calls the GitHub REST API to retrieve and Base64-decode the README of a public repository.
/// Requires "GitHubToken" in configuration for authenticated requests (higher rate limit).
/// </summary>
public sealed class GitHubService : IGitHubService
{
    private readonly HttpClient      _http;
    private readonly IConfiguration  _config;
    private readonly ILogger<GitHubService> _logger;

    public GitHubService(HttpClient http, IConfiguration config, ILogger<GitHubService> logger)
    {
        _http   = http;
        _config = config;
        _logger = logger;
    }

    public async Task<string> GetReadmeContentAsync(GitHubRepo repo, CancellationToken ct = default)
    {
        var url = $"https://api.github.com/repos/{repo.Owner}/{repo.Repo}/readme";
        _logger.LogInformation("Fetching README from {Url}", url);

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Add("User-Agent",  "PortfolioApi/1.0");
        request.Headers.Add("Accept",      "application/vnd.github.v3+json");

        var token = _config["GitHubToken"];
        if (!string.IsNullOrWhiteSpace(token))
            request.Headers.Add("Authorization", $"Bearer {token}");

        using var response = await _http.SendAsync(request, ct);

        if (response.StatusCode == HttpStatusCode.NotFound)
            throw new HttpRequestException("README not found.", null, HttpStatusCode.NotFound);

        response.EnsureSuccessStatusCode();

        var body   = await response.Content.ReadAsStringAsync(ct);
        var readme = JsonSerializer.Deserialize<GitHubReadmeResponse>(body,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? throw new InvalidOperationException("Could not deserialize GitHub README response.");

        if (!readme.Encoding.Equals("base64", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"Unsupported README encoding: {readme.Encoding}");

        // GitHub encodes with newlines – strip them before decoding
        var cleanBase64 = readme.Content.Replace("\n", "").Replace("\r", "");
        var decoded     = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(cleanBase64));

        _logger.LogInformation("README decoded successfully ({Length} chars).", decoded.Length);
        return decoded;
    }
}
