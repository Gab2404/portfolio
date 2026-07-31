using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Configuration;

namespace PortfolioApi.Services;

/// <summary>
/// Calls the Google Gemini REST API to generate a structured JSON project description
/// from a raw README string.
/// </summary>
public sealed class AiService : IAiService
{
    // Gemini 3.5 Flash — confirmed working with this API key
    private const string GeminiModel = "gemini-3.5-flash";

    private const string SystemPrompt =
        "Agis comme un développeur technique. À partir de ce README, génère une présentation du projet. " +
        "Tu dois renvoyer UNIQUEMENT un objet JSON brut et valide (sans markdown) contenant 3 clés exactes : " +
        "'summary' (un résumé du projet en 3 lignes), " +
        "'techStack' (un tableau de chaînes de caractères listant les langages et outils), " +
        "et 'objective' (un paragraphe expliquant l'objectif du projet).";

    private readonly HttpClient     _http;
    private readonly IConfiguration _config;
    private readonly ILogger<AiService> _logger;

    public AiService(HttpClient http, IConfiguration config, ILogger<AiService> logger)
    {
        _http   = http;
        _config = config;
        _logger = logger;
    }

    public async Task<string> GenerateProjectDescriptionAsync(string readmeContent, CancellationToken ct = default)
    {
        var apiKey = _config["AiApiKey"]
            ?? throw new InvalidOperationException("AiApiKey is not configured.");

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{GeminiModel}:generateContent?key={apiKey}";

        // Build the Gemini request payload
        var payload = new
        {
            system_instruction = new
            {
                parts = new[] { new { text = SystemPrompt } }
            },
            contents = new[]
            {
                new
                {
                    role  = "user",
                    parts = new[] { new { text = readmeContent } }
                }
            },
            generationConfig = new
            {
                temperature     = 0.2,
                responseMimeType = "application/json"
            }
        };

        _logger.LogInformation("Sending README to Gemini ({Model}).", GeminiModel);

        // Retry up to 3 times with exponential backoff on 429 rate limit
        HttpResponseMessage response = null!;
        for (int attempt = 1; attempt <= 3; attempt++)
        {
            response = await _http.PostAsJsonAsync(url, payload, ct);

            if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
            {
                if (attempt == 3) break; // will be handled below
                var waitSeconds = attempt * 15; // 15s, then 30s
                _logger.LogWarning("Gemini rate limited (429). Waiting {Sec}s before retry {Attempt}/3…", waitSeconds, attempt + 1);
                await Task.Delay(TimeSpan.FromSeconds(waitSeconds), ct);
                continue;
            }
            break; // success or non-retryable error
        }

        // If still not successful, capture and log the response body before throwing
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError("Gemini API error {Status}: {Body}", (int)response.StatusCode, errorBody);
            throw new HttpRequestException(
                $"Gemini API returned {(int)response.StatusCode}: {errorBody}",
                null,
                response.StatusCode);
        }

        var body = await response.Content.ReadAsStringAsync(ct);

        // Navigate Gemini response: candidates[0].content.parts[0].text
        using var doc = JsonDocument.Parse(body);
        var text = doc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString()
            ?? throw new InvalidOperationException("Empty text in Gemini response.");

        // Strip optional markdown code fences if the model ignores the mime type hint
        var clean = StripMarkdownJson(text.Trim());

        // Validate that the result is actually parseable JSON
        try   { JsonDocument.Parse(clean); }
        catch { throw new InvalidOperationException("AI response is not valid JSON."); }

        _logger.LogInformation("AI description generated successfully.");
        return clean;
    }

    /// <summary>Removes ```json ... ``` fences that some models still emit.</summary>
    private static string StripMarkdownJson(string text)
    {
        if (text.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
            text = text["```json".Length..];
        else if (text.StartsWith("```"))
            text = text["```".Length..];

        if (text.EndsWith("```"))
            text = text[..^"```".Length];

        return text.Trim();
    }
}
