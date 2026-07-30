namespace PortfolioApi.Models;

/// <summary>Incoming request body for the analyze endpoint.</summary>
public record AnalyzeRequest
{
    public string RepoUrl { get; init; } = string.Empty;
}

/// <summary>Parsed GitHub repository coordinates.</summary>
public record GitHubRepo(string Owner, string Repo);

/// <summary>Raw response from GitHub /readme endpoint.</summary>
public record GitHubReadmeResponse
{
    public string Content  { get; init; } = string.Empty;
    public string Encoding { get; init; } = string.Empty;
}
