# Backend — PortfolioApi

API ASP.NET Core 10 qui analyse un dépôt GitHub et génère une description de projet via Gemini.

## Démarrage rapide

```bash
cd backend

# 1. Injecter les clés (une seule fois)
dotnet user-secrets set "AiApiKey"    "votre_clé_gemini"
dotnet user-secrets set "GitHubToken" "ghp_votre_token_github"  # optionnel, augmente le rate limit

# 2. Lancer l'API
dotnet run
```

L'API écoute sur `http://localhost:5000` (HTTP) et `https://localhost:5001` (HTTPS).

## Endpoint

### `POST /api/projects/analyze`

**Body JSON :**
```json
{ "repoUrl": "https://github.com/owner/repo" }
```

**Réponse 200 OK :**
```json
{
  "summary":   "Résumé en 3 lignes...",
  "techStack": ["C#", ".NET", "Docker"],
  "objective": "Paragraphe expliquant l'objectif..."
}
```

| Code | Cause                              |
|------|------------------------------------|
| 400  | URL GitHub invalide ou manquante   |
| 404  | README introuvable dans le dépôt   |
| 500  | Erreur GitHub API ou Gemini API    |

## Structure

```
backend/
├── Controllers/
│   └── PortfolioController.cs   # Route POST /api/projects/analyze
├── Services/
│   ├── IGitHubService.cs        # Interface
│   ├── GitHubService.cs         # Appel GitHub API + décodage Base64
│   ├── IAiService.cs            # Interface
│   └── AiService.cs             # Appel Gemini REST API
├── Models/
│   └── Dtos.cs                  # AnalyzeRequest, GitHubRepo, GitHubReadmeResponse
├── Program.cs                   # DI, CORS, HttpClient
└── appsettings.json             # Config (sans secrets)
```

## Configuration des clés

Les clés ne sont **jamais** committées. Elles sont stockées localement via `dotnet user-secrets` (dev) ou variables d'environnement (prod).

| Clé            | Requis | Description                        |
|----------------|--------|------------------------------------|
| `AiApiKey`     | ✅ oui | Clé API Google Gemini              |
| `GitHubToken`  | ⚡ non  | Token GitHub (augmente rate limit) |
