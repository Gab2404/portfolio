using PortfolioApi.Models;

namespace PortfolioApi.Services;

/// <summary>Fetches and decodes the README of a public GitHub repository.</summary>
public interface IGitHubService
{
    /// <summary>
    /// Returns the decoded UTF-8 content of the README.
    /// Throws <see cref="HttpRequestException"/> with 404 status if the file does not exist.
    /// </summary>
    Task<string> GetReadmeContentAsync(GitHubRepo repo, CancellationToken ct = default);
}
