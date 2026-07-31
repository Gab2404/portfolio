namespace PortfolioApi.Services;

/// <summary>Sends a README to an AI model and returns a structured JSON description.</summary>
public interface IAiService
{
    /// <summary>
    /// Returns a raw JSON string (no markdown) with keys: objective, techStack, detailedPoints, hrPitch.
    /// Throws <see cref="InvalidOperationException"/> if the AI response cannot be parsed.
    /// </summary>
    Task<string> GenerateProjectDescriptionAsync(string readmeContent, CancellationToken ct = default);
}
