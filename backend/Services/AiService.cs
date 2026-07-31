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
        "Tu es un Tech Lead expert, chargé de valoriser un projet technique pour un recrutement. À partir du README fourni, génère une analyse complète et très détaillée. Tu dois mettre en valeur la rigueur du candidat et l'impact professionnel du projet, tout particulièrement sur les aspects liés à l'infrastructure, aux réseaux, à la sécurité ou à l'architecture logicielle si le projet s'y prête.\n" +
        "Tu dois renvoyer UNIQUEMENT un objet JSON brut et valide (sans balises markdown) contenant ces 4 clés exactes :\n" +
        "- 'objective' : (String) Le but principal et le problème résolu par le projet.\n" +
        "- 'techStack' : (Array de strings) Les technologies, outils et concepts utilisés.\n" +
        "- 'detailedPoints' : (Array de strings) Une analyse point par point (4 à 5 points). Chaque point doit décrire précisément l'architecture, le flux de données, la configuration système ou les défis techniques surmontés, avec un vocabulaire très professionnel.\n" +
        "- 'hrPitch' : (String) Un paragraphe persuasif de 3-4 lignes destiné à un recruteur, expliquant pourquoi ce projet démontre que le candidat est structuré, opérationnel et prêt à intégrer un environnement d'entreprise exigeant.";

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
                maxOutputTokens = 4096,
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

        var jsonOptions = new JsonDocumentOptions
        {
            AllowTrailingCommas = true,
            CommentHandling = JsonCommentHandling.Skip
        };

        // Validate that the result is actually parseable JSON
        try
        {
            using var validDoc = JsonDocument.Parse(clean, jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI response is not valid JSON. Raw text from Gemini:\n{RawText}", text);
            throw new InvalidOperationException($"AI response is not valid JSON: {ex.Message}");
        }

        _logger.LogInformation("AI description generated successfully.");
        return clean;
    }

    /// <summary>Extracts the first balanced JSON object {...} from response text, handling braces inside strings and ignoring trailing garbage or extra braces.</summary>
    private static string StripMarkdownJson(string text)
    {
        var startIndex = text.IndexOf('{');
        if (startIndex < 0) return text.Trim();

        bool inString = false;
        bool escape = false;
        int depth = 0;

        for (int i = startIndex; i < text.Length; i++)
        {
            char c = text[i];

            if (escape)
            {
                escape = false;
                continue;
            }

            if (c == '\\' && inString)
            {
                escape = true;
                continue;
            }

            if (c == '"')
            {
                inString = !inString;
                continue;
            }

            if (!inString)
            {
                if (c == '{')
                {
                    depth++;
                }
                else if (c == '}')
                {
                    depth--;
                    if (depth == 0)
                    {
                        return text.Substring(startIndex, i - startIndex + 1);
                    }
                }
            }
        }

        // If unbalanced (e.g. LLM omitted trailing closing braces), auto-close open braces
        if (depth > 0)
        {
            return text.Substring(startIndex) + new string('}', depth);
        }

        return text.Trim();
    }
}
