using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using PortfolioApi.Models;
using PortfolioApi.Services;

namespace PortfolioApi.Controllers;

[ApiController]
[Route("api/projects")]
public sealed class PortfolioController : ControllerBase
{
    private readonly IGitHubService _github;
    private readonly IAiService     _ai;
    private readonly ProjectCacheService _cache;
    private readonly ILogger<PortfolioController> _logger;

    public PortfolioController(IGitHubService github, IAiService ai, ProjectCacheService cache, ILogger<PortfolioController> logger)
    {
        _github = github;
        _ai     = ai;
        _cache  = cache;
        _logger = logger;
    }

    /// <summary>
    /// Analyzes a public GitHub repository and returns an AI-generated description.
    /// </summary>
    /// <remarks>
    /// POST /api/projects/analyze
    /// Body: { "repoUrl": "https://github.com/owner/repo" }
    /// </remarks>
    [HttpPost("analyze")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Analyze([FromBody] AnalyzeRequest request, CancellationToken ct)
    {
        // ── 1. Parse the GitHub URL ──────────────────────────────────────────────
        if (!TryParseGitHubUrl(request.RepoUrl, out var repo))
        {
            _logger.LogWarning("Invalid GitHub URL received: {Url}", request.RepoUrl);
            return BadRequest(new { error = "Invalid GitHub URL. Expected format: https://github.com/{owner}/{repo}" });
        }

        _logger.LogInformation("Analyzing repo {Owner}/{Repo}", repo!.Owner, repo.Repo);

        // ── 2. Check Persistent Cache ────────────────────────────────────────────
        var cachedJson = await _cache.TryGetAnalysisAsync(repo.Owner, repo.Repo);
        if (cachedJson != null)
        {
            _logger.LogInformation("Returning cached AI analysis for {Owner}/{Repo}", repo.Owner, repo.Repo);
            return Content(cachedJson, "application/json");
        }

        // ── 3. Fetch README from GitHub ──────────────────────────────────────────
        string readmeContent;
        try
        {
            readmeContent = await _github.GetReadmeContentAsync(repo, ct);
        }
        catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return NotFound(new { error = $"No README found in repository '{repo.Owner}/{repo.Repo}'." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching README for {Owner}/{Repo}", repo.Owner, repo.Repo);
            return StatusCode(500, new { error = "Failed to fetch README from GitHub.", detail = ex.Message });
        }

        // ── 4. Generate AI description ───────────────────────────────────────────
        string aiJson;
        try
        {
            aiJson = await _ai.GenerateProjectDescriptionAsync(readmeContent, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating AI description for {Owner}/{Repo}", repo.Owner, repo.Repo);
            return StatusCode(500, new { error = "AI generation failed.", detail = ex.Message });
        }

        // ── 5. Save to Persistent Cache ──────────────────────────────────────────
        await _cache.SaveAnalysisAsync(repo.Owner, repo.Repo, aiJson);

        // ── 6. Return the validated JSON payload ─────────────────────────────────
        return Content(aiJson, "application/json");
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private static bool TryParseGitHubUrl(string? url, out GitHubRepo? repo)
    {
        repo = null;
        if (string.IsNullOrWhiteSpace(url)) return false;

        if (!Uri.TryCreate(url.Trim(), UriKind.Absolute, out var uri)) return false;
        if (!uri.Host.Equals("github.com", StringComparison.OrdinalIgnoreCase)) return false;

        // Path: /owner/repo or /owner/repo/ or /owner/repo.git
        var segments = uri.AbsolutePath.Trim('/').Split('/');
        if (segments.Length < 2) return false;

        var owner = segments[0];
        var repoName = segments[1].Replace(".git", "", StringComparison.OrdinalIgnoreCase);

        if (string.IsNullOrWhiteSpace(owner) || string.IsNullOrWhiteSpace(repoName)) return false;

        repo = new GitHubRepo(owner, repoName);
        return true;
    }
}
