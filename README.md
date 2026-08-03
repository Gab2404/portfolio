# ⚡ G.QUEAU — Portfolio & AI Project Analyzer

<div align="center">

![Status: Production Ready](https://img.shields.io/badge/Status-Production%20Ready-00f2fe?style=for-the-badge)
![.NET Core](https://img.shields.io/badge/.NET-10.0%20%2F%208.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![C#](https://img.shields.io/badge/C%23-239120?style=for-the-badge&logo=csharp&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)
![Vanilla JS](https://img.shields.io/badge/Vanilla%20JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Google Gemini AI](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-a855f7?style=for-the-badge)

**Une application web full-stack de niveau agence conçue pour démontrer une double expertise en Infrastructure / Cybersécurité et Développement Logiciel.**

[Vue d'ensemble](#-description--cas-dusage) • [Architecture](#-architecture-technique--flux-de-données) • [Fonctionnalités](#-fonctionnalités-clés) • [Installation Locale](#-installation-locale--développement) • [Déploiement Docker](#-déploiement-docker-production) • [Sécurité & DevOps](#-sécurité-performance--bonnes-pratiques)

</div>

---

## 🎯 Description & Cas d'usage

Ce projet ne se limite pas à un portfolio statique : c'est une **application web full-stack conteneurisée**, conçue pour apporter une réponse technique concrète aux exigences des recruteurs (managers techniques, responsables d'infrastructure, RSSI et équipes RH).

### Pourquoi ce projet ?
1. **Démontrer l'expertise Infrastructure & DevOps** : Architecture en micro-services isolés par réseau virtuel Docker, reverse-proxying sécurisé sous **Nginx**, et automatisation des builds.
2. **Intégration d'IA Appliquée** : Utilisation de l'API **Google Gemini** pour analyser dynamiquement les dépôts GitHub et traduire les choix d'ingénierie techniques en insights clairs pour les recruteurs.
3. **Maîtrise du Backend & de la Performance** : API REST développée en **C# (ASP.NET Core)** avec un mécanisme de cache persistant (thread-safe) pour éliminer la latence et protéger les quotas d'API.
4. **Excellence UI/UX (Awwwards Standard)** : Single Page Application (SPA) en **Vanilla JS** ultra-réactive, adoptant un design géométrique sombre premium (*Glassmorphism*, micro-interactions magnétiques et animations fluides).

---

## 🏗 Architecture Technique & Flux de données

L'application repose sur une architecture découplée où le navigateur n'interagit **jamais directement avec l'API backend ou l'IA**. Toutes les communications transitent par **Nginx**, qui sert le frontend statique et fait office de proxy inverse vers l'API C#.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT (Navigateur)                               |
|   SPA Vanilla JS  <-- (JSON / HTML) -->  HTTP/1.1 & HTTP/2 (Port 80 / 443)        |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                              DOCKER BRIDGE (internal)                             |
|                                                                                   |
|   +---------------------------------------------------------------------------+   |
|   |                       CONTAINER 1 : PORTFOLIO-FRONTEND                    |   |
|   |  - Nginx Alpine (Reverse Proxy & Static File Server)                      |   |
|   |  - Routage SPA (/index.html, /projects.html, /contact.html)               |   |
|   |  - Proxy Pass : /api/* ===> http://backend:8080/api/*                     |   |
|   +---------------------------------------------------------------------------+   |
|                                          |                                        |
|                                          | (Réseau privé interne non exposé)      |
|                                          v                                        |
|   +---------------------------------------------------------------------------+   |
|   |                       CONTAINER 2 : PORTFOLIO-BACKEND                     |   |
|   |  - ASP.NET Core (.NET 8 / 10) REST API                                    |   |
|   |  - ProjectCacheService (Cache persistant thread-safe JSON / SQLite)       |   |
|   |  - GitHubService (Client HTTP pour l'extraction des fichiers README.md)   |   |
|   |  - AiService (Prompt Engineering orienté "HR & Tech Impact")              |   |
|   +---------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------+
                                          |
                        +-----------------+-----------------+
                        |                                   |
                        v                                   v
             +---------------------+             +---------------------+
             |    GITHUB API v3    |             |  GOOGLE GEMINI API  |
             |  (Extraction Repo)  |             |  (Analyse Technique)|
             +---------------------+             +---------------------+
```

### Détail des responsabilités :
- **`portfolio-frontend` (Nginx Alpine)** : Seul conteneur exposé à l'hôte. Il sert les assets statiques avec des en-têtes de cache appropriés et redirige les requêtes API (`/api/projects/analyze`) vers le backend interne.
- **`portfolio-backend` (ASP.NET Core)** : Protégé dans le réseau Docker interne (`internal`), il orchestre la logique métier : vérification du cache, téléchargement des métadonnées GitHub, interrogation de l'IA et formatage de la réponse.
- **Système de Cache** : Les analyses générées par Gemini sont stockées localement sur le serveur. Si un recruteur consulte un projet déjà analysé, la réponse est renvoyée en **< 5 ms** sans appel réseau externe.

---

## ⚡ Fonctionnalités Clés

### 1. 🤖 Analyseur IA de Projets GitHub à la volée
- Permet de soumettre l'URL de **n'importe quel dépôt GitHub public**.
- Le backend extrait automatiquement le `README.md` et interroge **Gemini** avec un prompt d'ingénierie structuré pour produire une réponse normalisée JSON comprenant :
  - **`hrPitch`** : Une accroche synthétique orientée RH/Recrutement valorisant le profil de l'auteur.
  - **`objective`** : Le but architectural et technique du projet.
  - **`detailedPoints`** : Une liste analytique de 4 à 5 points clés sur la sécurité, l'infrastructure, la stack et l'architecture.
  - **`techStack`** : Détection automatique des langages, frameworks et outils DevOps sous forme de badges.

### 2. 📁 Galerie de Projets Réalisés (Mise en Cache)
- Affichage des projets phares du portfolio au chargement de la page `/projects.html`.
- **Résilience absolue** : Grâce au cache serveur, les cartes de projets s'affichent instantanément et restent disponibles même en cas d'indisponibilité temporaire de l'API externe.

### 3. 🎨 Single Page Application (SPA) Fluidité Premium
- **Routage client sans rechargement** : Transition fluide par un rideau visuel synchronisé (`page-transition-overlay`).
- **Design System Dark Mode** : Échelle de gris profonds (`#09090b`), accents *Bleu Cyber* (`#38bdf8`) et *Violet* (`#818cf8`).
- **Glassmorphism & Spotlight** : Effet de lueur radiale dynamique qui suit le curseur de la souris sur les cartes de projets (`.card-spotlight`).
- **Accessibilité (a11y)** : Support complet de `prefers-reduced-motion` pour désactiver les animations pour les utilisateurs sensibles.

---

## 💻 Installation Locale & Développement

### Prérequis
- [SDK .NET 8.0 ou 10.0](https://dotnet.microsoft.com/download)
- [Node.js / Live Server](https://nodejs.org/) (optionnel pour tester le frontend isolément)
- Une clé API [Google AI Studio (Gemini)](https://aistudio.google.com/)

### 1. Configuration des secrets en développement (ASP.NET Core)
En mode développement local, n'inscrivez jamais vos clés en clair dans `appsettings.json`. Utilisez le gestionnaire de secrets sécurisé `.NET User Secrets` :

```bash
# Se positionner dans le dossier backend
cd backend

# Initialiser et injecter la clé API Gemini
dotnet user-secrets set "AiApiKey" "VOTRE_CLE_API_GEMINI_ICI"

# (Optionnel) Injecter un token GitHub pour augmenter les limites de rate-limit
dotnet user-secrets set "GitHubToken" "VOTRE_TOKEN_GITHUB_ICI"
```

### 2. Lancer le Backend localement
```bash
dotnet run
```
*Le serveur démarre sur `http://localhost:5211`.*

### 3. Lancer le Frontend en local
Ouvrez le dossier `frontend` dans VS Code et lancez une extension comme **Live Server** (ou ouvrez directement `index.html`). Le code JS détecte automatiquement l'exécution locale (`http://localhost:5211/api`) et s'adapte sans modification.

---

## 🐳 Déploiement Docker (Production)

Le projet est préconfiguré avec `docker-compose` et des builds multi-étapes optimisés.

### 1. Créer le fichier d'environnement
À la racine du projet, créez un fichier `.env` contenant les identifiants requis :

```ini
# .env (à ne pas commiter sous Git)
AI_API_KEY=votre_cle_gemini_production
GITHUB_TOKEN=votre_token_github_optionnel
```

### 2. Construire et démarrer l'infrastructure
```bash
# Compilation des images multi-stages et démarrage en tâche de fond
docker compose up --build -d
```

### 3. Vérifier la santé des conteneurs
```bash
# Vérification des statuts de santé (Healthchecks Nginx & ASP.NET Core)
docker compose ps
```
*L'application est immédiatement accessible sur **`http://localhost`** (Port 80).*

### 4. Consulter les journaux (Logs)
```bash
# Suivre les logs en direct du backend C#
docker compose logs -f backend
```

---

## 🛡 Sécurité, Performance & Bonnes Pratiques

Ce portfolio applique les standards en vigueur sur les environnements de production d'entreprise :

1. **Isolation Réseau Conteneurisée (`Bridge Network`)** :
   - Le conteneur `portfolio-backend` ne possède **aucun port exposé sur l'hôte**.
   - Seul Nginx peut appeler l'API interne via la résolution DNS Docker (`http://backend:8080`), empêchant toute attaque directe sur l'application C#.

2. **Gestion Stricte des Secrets (`12-Factor App`)** :
   - Zéro clé en dur dans le code source ou dans les Dockerfiles.
   - Utilisation explicite de `dotnet user-secrets` en dev et des variables d'environnement passées par `docker-compose` en production.

3. **Protection des Ressources & Cache Persistant** :
   - Le service `ProjectCacheService` met en cache chaque réponse de l'IA sur disque (`projects-cache.json` / SQLite).
   - Protection contre le **déni de service par épuisement de quota (API Rate Limiting)** et garantie d'une disponibilité 24/7.

4. **Sécurité Web & Reverse Proxy Nginx** :
   - Suppression des en-têtes d'identification serveur (Hardening basique).
   - Servage statique ultra-rapide avec mise en cache client des polices et styles CSS.
   - Vérification de la santé des services par sondes **`healthcheck`** natives dans Docker Compose.

5. **Exécution Non-Root dans Docker** :
   - Le conteneur backend ASP.NET Core exécute l'application sous l'utilisateur non-privilégié `1654:1654` pour prévenir les élévations de privilèges.

---

<div align="center">
  <p class="mono">Conçu et développé par <strong>Gabriel Queau</strong> — Infrastructure · Réseau · Cybersécurité</p>
</div>
