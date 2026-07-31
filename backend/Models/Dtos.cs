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

/// <summary>AI generated project description structured for HR and technical recruitment.</summary>
public record ProjectAnalyzeResponse
{
    public string Objective      { get; init; } = string.Empty;
    public string[] TechStack    { get; init; } = Array.Empty<string>();
    public string[] DetailedPoints { get; init; } = Array.Empty<string>();
    public string HrPitch        { get; init; } = string.Empty;
}
