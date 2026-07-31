# G.QUEAU — Portfolio & AI GitHub Project Analyzer

[![.NET Core](https://img.shields.io/badge/.NET%2010.0-ASP.NET%20Core-512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![Vanilla JS](https://img.shields.io/badge/Frontend-Vanilla%20JS%20SPA-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/fr/docs/Web/JavaScript)
[![Docker](https://img.shields.io/badge/Docker-Compose%20Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Gemini AI](https://img.shields.io/badge/AI-Google%20Gemini%203.5-8E75B2?logo=google&logoColor=white)](https://aistudio.google.com/)
[![Nginx](https://img.shields.io/badge/Proxy-Nginx%20Alpine-009639?logo=nginx&logoColor=white)](https://nginx.org/)

Portfolio professionnel de **Gabriel Queau** — Étudiant & Analyste en **Infrastructure, Réseau et Cybersécurité**.  
Ce projet intègre une **Single Page Application (SPA) en Vanilla JS** (sans framework) dotée d'animations fluides inspirées d'une direction artistique sombre et technique de niveau agence, couplée à une **API Backend ASP.NET Core 10** capable d'analyser techniquement des dépôts GitHub publics en quelques secondes grâce à **Google Gemini AI** (avec **système de cache persistant** pour des performances instantanées).

---

## ✨ Fonctionnalités clés

- **🎨 SPA Vanilla JS Immersif & Design Système Cyber :**  
  - Navigation fluide à **3 pages** (*À propos*, *Projets (IA)*, *Contact*) **sans rechargement de page** (Vanilla SPA Router).  
  - **Transitions de page personnalisées (Effet rideau néon)** synchronisées par promesse JS (`transitionend`) avant injection du DOM.  
  - Animations au défilement optimisées avec `IntersectionObserver` et **délégation d'événements globale** (`Event Delegation`).  
  - Thème sombre professionnel orienté cyber/infrastructure avec accents néon cyan (`#00f2fe`) et violet (`#a855f7`).

- **🤖 Analyseur de dépôts GitHub par IA (Gemini 3.5) & Pitch Recruteur :**  
  - Récupère automatiquement le `README.md` d'un dépôt GitHub public (décodage Base64 et support de tokens pour augmenter le quota d'API).  
  - Analyse le contenu via Google Gemini avec **System Prompt expert Tech Lead / RH** conçu pour convaincre recruteurs et managers techniques (alternance).  
  - Génère un résumé technique structuré en JSON enrichi :  
    - **`objective`** : But principal et problématique résolue par le projet.  
    - **`techStack`** : Technologies, outils et concepts utilisés.  
    - **`detailedPoints`** : Analyse point par point (architecture, flux réseau, sécurité et défis surmontés).  
    - **`hrPitch`** : Encart persuasif de 3-4 lignes mettant en valeur la rigueur et l'opérationnalité du candidat.  
  - **Résilience JSON & Anti-Truncation (`StripMarkdownJson`)** : Parseur d'accolades équilibré qui tolère les irrégularités de formatage IA et ferme automatiquement les objets JSON si nécessaire.

- **⚡ Système de Cache Persistant C# (`ProjectCacheService`) :**  
  - **Cache-Aside pattern thread-safe** : Le backend vérifie systématiquement la présence d'une analyse dans `/app/projects-cache.json` (synchronisé via `SemaphoreSlim`).  
  - **Cache Hit < 5 ms** : Les dépôts déjà analysés sont retournés instantanément, réduisant la consommation de tokens à zéro et garantissant la cohérence des descriptions.

- **🖼️ Galerie de Projets Dynamique ("Mes Projets Réalisés") :**  
  - Au chargement de la vue *Projets*, la SPA déclenche des requêtes `fetch` **parallèles et asynchrones** vers l'API pour les 4 dépôts phares du portfolio (`portfolio`, `ydays-solo-travelers`, `linux-r-seau2025`, `WindowsserveurTP`).  
  - **Skeleton Loaders animés (`shimmer`)** affichés immédiatement pendant le chargement.  
  - **Isolation des erreurs & protection anti-fuite de mémoire** : Gestion granulaire des cartes avec identifiant de session de galerie (`gallerySessionId`).

- **🐳 Architecture DevOps Conteneurisée :**  
  - **Docker Compose** production-ready isolant l'application en 2 conteneurs :  
    - **`frontend` (Nginx Alpine) :** Sert les fichiers statiques HTML/CSS/JS et agit en **reverse proxy** (`/api/*` → conteneur backend) pour éliminer tout problème de CORS.  
    - **`backend` (.NET 10 ASP.NET Core) :** Isolé dans un réseau interne Docker (`portfolio_internal`), exécuté avec un **utilisateur non-root** disposant des permissions d'écriture pour la persistance du cache.  
  - **Healthchecks intégrés** via `curl` sur les deux conteneurs pour garantir la résilience du service.

---

## 🏗️ Architecture & Structure du projet

```
portfolio/
├── frontend/                        # Single Page Application (SPA)
│   ├── index.html                   # Shell principal & page À propos
│   ├── projects.html                # Page Projets (Analyseur IA + Galerie dynamique)
│   ├── contact.html                 # Page Contact
│   ├── style.css                    # Design système Vanilla CSS, Skeletons & animations
│   ├── app.js                       # Routeur SPA Vanilla, Event Delegation & appels API
│   └── nginx.conf                   # Proxy inverse Nginx (/api -> backend:8080) + DNS dynamique
├── backend/                         # API Web ASP.NET Core 10
│   ├── Controllers/
│   │   └── PortfolioController.cs   # Endpoint POST /api/projects/analyze (Cache-Aside)
│   ├── Services/
│   │   ├── GitHubService.cs         # Client API GitHub (avec token & Base64)
│   │   ├── AiService.cs             # Client API Gemini (3.5-flash + prompt RH + validation JSON)
│   │   └── ProjectCacheService.cs   # Singleton de cache persistant JSON thread-safe (SemaphoreSlim)
│   ├── Models/
│   │   └── Dtos.cs                  # DTOs et schémas de réponse JSON (Objective, HrPitch, etc.)
│   ├── PortfolioApi.csproj          # Configuration .NET 10
│   └── Dockerfile                   # Build multi-stage optimisé + USER non-root ($APP_UID)
├── docker-compose.yml               # Orchestration Docker (Frontend Nginx + Backend .NET)
├── .env.example                     # Modèle de variables d'environnement
├── .dockerignore                    # Exclusion de bin/, obj/ et secrets lors du build
└── README.md                        # Documentation du projet
```

---

## 🚀 Démarrage rapide avec Docker (Recommandé)

### 1. Prérequis
- [Docker & Docker Compose](https://www.docker.com/) installés sur le poste ou serveur de production.
- Une clé API Google Gemini ([obtenir une clé gratuite sur AI Studio](https://aistudio.google.com/app/apikey)).
- *(Optionnel mais recommandé)* Un Personal Access Token GitHub ([générer un token](https://github.com/settings/tokens)) pour augmenter le quota d'analyse GitHub (60 requêtes/h sans token -> 5000/h avec token).

### 2. Configuration de l'environnement
Copiez le fichier exemple `.env.example` en `.env` à la racine du projet :
```bash
cp .env.example .env
```
Renseignez vos clés dans le fichier `.env` :
```ini
AI_API_KEY=votre_clé_api_gemini
GITHUB_TOKEN=ghp_votre_token_github_optionnel
```
> ⚠️ **Sécurité :** Le fichier `.env` est exclu du contrôle de version via `.gitignore` et `.dockerignore`. Ne commitez jamais vos clés réelles.

### 3. Lancer l'infrastructure complète
Démarrez les conteneurs en tâche de fond avec le build automatique :
```bash
docker compose up -d --build
```
Vérifiez l'état des conteneurs (ils doivent afficher le statut **`healthy`**) :
```bash
docker compose ps
```
> 🎉 **Le portfolio est désormais en ligne !** Ouvrez votre navigateur sur **[http://localhost](http://localhost)** (ou sur le nom de domaine de votre serveur).

---

## 💻 Développement local (sans Docker)

Si vous souhaitez modifier et tester le code backend ou frontend indépendamment sur votre machine :

### 1. Backend ASP.NET Core (.NET 10 SDK requis)
Dans le dossier `backend/`, configurez vos secrets locaux en toute sécurité à l'aide de l'outil `user-secrets` de .NET :
```bash
cd backend

# Injecter les clés dans le gestionnaire local de secrets
dotnet user-secrets set "AiApiKey"    "votre_clé_gemini"
dotnet user-secrets set "GitHubToken" "ghp_votre_token_github"

# Lancer le serveur d'API (écoute sur http://localhost:5211 et https://localhost:7211)
dotnet run
```

### 2. Frontend Vanilla JS
Ouvrez `frontend/index.html` avec un serveur local HTTP (par exemple l'extension **Live Server** sur VS Code).  
Le script `app.js` détecte automatiquement l'exécution locale (`location.port === '5500'` ou protocole `file:`) et enverra ses requêtes vers `http://localhost:5211/api`.  
Sous Docker ou en production, le script utilise la route relative `/api` transmise par le proxy Nginx.

---

## 🔌 API Reference

### `POST /api/projects/analyze`
Analyse le fichier `README.md` d'un dépôt GitHub public (ou récupère son analyse depuis le cache persistant) et retourne une fiche technique complète générée par l'IA.

#### Request Headers
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "repoUrl": "https://github.com/owner/repository"
}
```

#### Response (200 OK)
```json
{
  "objective": "Concevoir et déployer une infrastructure réseau Linux multi-serveurs virtualisée et sécurisée...",
  "techStack": [
    "Linux",
    "Nginx",
    "Docker",
    "Prometheus",
    "Netplan"
  ],
  "detailedPoints": [
    "Architecture réseau segmentée et sécurisée : Implémentation d'un adressage IP statique via Netplan...",
    "Reverse Proxying et Résolution DNS : Centralisation des flux entrants sur la VM Gateway via Nginx...",
    "Orchestration et Isolation Applicative : Déploiement d'une architecture microservices conteneurisée..."
  ],
  "hrPitch": "Ce projet démontre une maîtrise rigoureuse de l'administration système Linux, de l'ingénierie réseau et des pratiques DevOps fondamentales..."
}
```

#### Codes d'erreur HTTP gérés
| Code | Description | Solution |
|------|-------------|----------|
| **400 Bad Request** | URL absente ou format GitHub invalide | Vérifier la syntaxe de l'URL GitHub fournie (`https://github.com/owner/repo`). |
| **404 Not Found** | Dépôt introuvable, privé ou `README.md` absent | S'assurer que le dépôt est bien public et possède un fichier de documentation à la racine. |
| **500 Internal Server Error** | Erreur réseau GitHub API ou échec Gemini API | Le backend intègre un parseur JSON tolérant aux erreurs. Si l'erreur persiste, vérifier le quota API sur Google AI Studio. |

---

## 🛠️ Diagnostics & Maintenance DevOps

Commandes utiles pour administrer et surveiller l'infrastructure Docker :

```bash
# Voir les logs en temps réel du conteneur API (.NET 10)
docker compose logs -f backend

# Voir les logs de proxy et d'accès Nginx
docker compose logs -f frontend

# Redémarrer l'ensemble de l'infrastructure
docker compose restart

# Arrêter et supprimer les conteneurs et réseaux
docker compose down
```

> 💡 **Astuce Persistance en Production :**  
> Pour conserver votre cache d'analyses (`projects-cache.json`) entre les destructions/re-créations de conteneurs, montez un volume dans votre `docker-compose.yml` :
> ```yaml
> volumes:
>   - ./data/projects-cache.json:/app/projects-cache.json
> ```

---

## 👤 Auteur

**Gabriel Queau**  
*Étudiant en Infrastructure, Réseau & Cybersécurité*  
- **LinkedIn :** [linkedin.com/in/gabriel-queau](https://www.linkedin.com/in/gabriel-queau)  
- **GitHub :** [github.com/Gab2404](https://github.com/Gab2404)  
- **Email :** gabriel.queau@ynov.com
