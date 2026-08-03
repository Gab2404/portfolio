# 🛡️ G.QUEAU — Portfolio & AI Project Analyzer

<div align="center">

![Status: Production Ready](https://img.shields.io/badge/Status-Production%20Ready-00f2fe?style=for-the-badge)
![Ubuntu Server](https://img.shields.io/badge/Ubuntu%20Server-E95420?style=for-the-badge&logo=ubuntu&logoColor=white)
![Let's Encrypt](https://img.shields.io/badge/Let's%20Encrypt-003A70?style=for-the-badge&logo=letsencrypt&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)
![.NET Core](https://img.shields.io/badge/.NET-10.0%20%2F%208.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![C#](https://img.shields.io/badge/C%23-239120?style=for-the-badge&logo=csharp&logoColor=white)
![Vanilla JS](https://img.shields.io/badge/Vanilla%20JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Google Gemini AI](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-a855f7?style=for-the-badge)

**Une application web full-stack conteneurisée de production, conçue pour démontrer une double expertise en Infrastructure / Cybersécurité et Développement Logiciel.**

[Vue d'ensemble](#-à-propos--cas-dusage) • [Architecture Infrastructure](#-architecture-réseau--infrastructure) • [Sécurité & DevOps](#-sécurité--devops-bonnes-pratiques) • [Fonctionnalités](#-fonctionnalités-clés) • [Déploiement Production](#-déploiement-production-vps-ubuntu--docker) • [Dev Local](#-installation-locale--développement)

</div>

---

## 🎯 À propos & Cas d'usage

Ce projet est une **application de production hébergée sur un VPS (Ubuntu Server)** et accessible publiquement via nom de domaine sécurisé en HTTPS. Il est conçu pour présenter mes projets techniques et permettre l'analyse automatisée par IA (Google Gemini) de n'importe quel dépôt GitHub public à travers une API C# ASP.NET Core intermédiaire.

### Raisons d'être et pertinence technique :
1. **Expertise Infrastructure & DevOps** : Architecture conteneurisée en micro-services sur réseau virtuel Docker isolé (*Zero Trust*), reverse proxy sécurisé sous Nginx et automatisation complète du cycle de vie des certificats SSL/TLS.
2. **Ingénierie de Sécurité (Cyber)** : Hardening serveur (UFW, SSL Termination Let's Encrypt, conteneurs non-root, en-têtes HTTP de sécurité) et stricte isolation des secrets selon la méthodologie *12-Factor App*.
3. **Intégration d'IA Appliquée** : Utilisation de l'API **Google Gemini** avec un *prompt engineering* ciblé pour traduire des choix techniques complexes en insights clairs pour les recruteurs techniques et responsables d'infrastructure.
4. **Performance & Résilience** : Mécanisme de cache persistant côté serveur en C# pour garantir des temps de réponse inférieurs à 5 ms et protéger l'application contre les quotas ou pannes d'APIs externes.

---

## 🏗 Architecture Réseau & Infrastructure

L'application repose sur une architecture découplée orientée **Zero Trust interne**. Le backend n'est **jamais exposé directement à internet**. Seul le reverse proxy Nginx gère le trafic public entrant, effectue la terminaison SSL et route les requêtes autorisées vers l'API interne.

```text
+-------------------------------------------------------------------------------------------------------+
|                                        CLIENT (Navigateur Web)                                        |
|                     https://gabriel-queau-portfolio.online  (HTTP/2 - Port 443)                       |
|               [ Redirection automatique 301 de HTTP (Port 80) vers HTTPS (Port 443) ]                 |
+-------------------------------------------------------------------------------------------------------+
                                                   |
                                            (Trafic HTTPS)
                                                   v
+-------------------------------------------------------------------------------------------------------+
|                                     VPS (UBUNTU SERVER) — HÔTE                                        |
|  * Pare-feu UFW activé (seuls les ports 80/443 et 22 durci sont autorisés)                            |
|  * Tâche Cron hôte quotidienne à 03h00 : vérification et renouvellement automatique Let's Encrypt     |
|                                                                                                       |
|  +-------------------------------------------------------------------------------------------------+  |
|  |                            RÉSEAU DOCKER BRIDGE ISOLÉ (internal)                                |  |
|  |                                                                                                 |  |
|  |   +-----------------------------------------------------------------------------------------+   |  |
|  |   |                           CONTAINER 1 : PORTFOLIO-FRONTEND                              |   |  |
|  |   |  - Image : Nginx Alpine (Reverse Proxy, SSL Termination & Serveur de fichiers statiques)|   |  |
|  |   |  - Ports hôte : 80:80 et 443:443 (Seul point d'entrée exposé de l'infrastructure)      |   |  |
|  |   |  - Volumes : Certificats Let's Encrypt montés en lecture seule (/etc/nginx/ssl:ro)      |   |  |
|  |   |  - Routage SPA (/index.html, /projects.html, /contact.html) & Cache headers             |   |  |
|  |   |  - Proxy Pass : /api/* ====> http://backend:8080/api/* (via DNS interne Docker)         |   |  |
|  |   +-----------------------------------------------------------------------------------------+   |  |
|  |                                               |                                                 |  |
|  |                                               | (Réseau privé interne non accessible de l'hôte) |  |
|  |                                               v                                                 |  |
|  |   +-----------------------------------------------------------------------------------------+   |  |
|  |   |                           CONTAINER 2 : PORTFOLIO-BACKEND                               |   |  |
|  |   |  - Image : ASP.NET Core (.NET 10 / 8) REST API (Port interne 8080)                      |   |  |
|  |   |  - AUCUN PORT EXPOSÉ SUR L'HÔTE (0 surface d'attaque externe directe)                   |   |  |
|  |   |  - ProjectCacheService (Cache persistant thread-safe JSON / SQLite sur disque)          |   |  |
|  |   |  - Exécution en tant qu'utilisateur non privilégié (1654:1654)                          |   |  |
|  |   +-----------------------------------------------------------------------------------------+   |  |
|  +-------------------------------------------------------------------------------------------------+  |
+-------------------------------------------------------------------------------------------------------+
                                                   |
                         +-------------------------+-------------------------+
                         | (Appels HTTPS sortants via client HTTP sécurisé)  |
                         v                                                   v
              +---------------------+                             +---------------------+
              |    GITHUB API v3    |                             |  GOOGLE GEMINI API  |
              |  (Extraction Repo)  |                             |  (Analyse Technique)|
              +---------------------+                             +---------------------+
```

---

## 🛡 Sécurité & DevOps (Bonnes Pratiques)

Ce portfolio applique rigoureusement les standards de sécurité et d'ingénierie système exigés en environnement de production d'entreprise :

### 1. Hébergement & Sécurité Système (Ubuntu Server VPS)
- **Pare-feu UFW (Uncomplicated Firewall)** : Activé sur l'hôte, configuré pour rejeter par défaut tout trafic entrant non sollicité. Seuls les ports HTTP (80), HTTPS (443) et le port SSH (durci par authentification par clé SSH) sont autorisés.
- **Redirection HTTPS Obligatoire** : Le bloc `server` Nginx écoutant sur le port 80 intercepte l'intégralité du trafic clair et renvoie une redirection permanente `301` vers l'équivalent sécurisé `https://`.

### 2. Isolation Zero Trust Conteneurisée (`bridge` Docker)
- **Réseau Privé Interne** : Création d'un réseau de pont Docker dédié (`internal`).
- **Surface d'attaque minimale** : Le conteneur `portfolio-backend` ne déclare **aucun binding de port** vers le serveur hôte. Il est physiquement impossible pour un attaquant d'interroger l'API C# depuis l'extérieur sans passer par les règles d'inspection et de routage du reverse proxy Nginx.

### 3. Terminaison SSL/TLS & Gestion des Certificats (Let's Encrypt + Cron)
- **Certificats SSL Let's Encrypt** : Générés par Certbot sur le VPS (`fullchain.pem` et `privkey.pem`) et injectés au conteneur Nginx via des **volumes Docker en lecture seule (`:ro`)**.
- **Automatisation du renouvellement** : Une tâche planifiée (Cron job) est programmée sur l'hôte Ubuntu pour s'exécuter chaque nuit à 03h00. Si un certificat approche de sa date d'expiration, il est renouvelé automatiquement et un hook (`deploy-hook`) redémarre le frontend Nginx sans interruption de service (`docker compose restart frontend`).

```bash
# Configuration de la tâche Cron de l'hôte (crontab -e)
0 3 * * * certbot renew --quiet --deploy-hook "cd /chemin/vers/portfolio && docker compose restart frontend"
```

### 4. Hardening du Reverse Proxy (Nginx Alpine)
- **En-têtes de Sécurité & Cache** : Configuration d'en-têtes de sécurité de base et de règles de cache strictes pour les fichiers statiques (`index.html`, `style.css`, `app.js`).
- **Proxying propre** : Transfère les requêtes `/api/` au backend via le résolveur DNS intégré de Docker (`http://backend:8080/api/`) en préservant les en-têtes du client original.

### 5. Gestion des Secrets (`12-Factor App`)
- Zéro secret ou identifiant codé en dur dans le dépôt Git ou dans les instructions des `Dockerfile`.
- En production, les variables critiques (`AI_API_KEY`, `GITHUB_TOKEN`) sont injectées au niveau du VPS via un fichier `.env` restreint (`chmod 600`) lu par Docker Compose.

### 6. Conteneurs Non-Root & Protection par Cache Persistant
- **Utilisateur Non Privilégié** : L'API ASP.NET Core tourne sous le compte système restreint `1654:1654` dans le conteneur Linux.
- **Protection anti-DDoS / Quota API** : Le `ProjectCacheService` enregistre chaque analyse IA dans un cache persistant sur disque. Une requête pour un projet déjà analysé retourne une réponse instantanée (**< 5 ms**) sans effectuer de requête HTTP externe, protégeant l'API Gemini contre l'épuisement de quotas.

---

## ⚡ Fonctionnalités Clés

### 1. 🤖 Analyseur IA de Projets GitHub à la volée
- Soumission d'une URL de dépôt GitHub public via l'interface du portfolio.
- Le backend C# récupère le fichier `README.md` via l'API GitHub et interroge **Google Gemini** avec un prompt d'ingénierie structuré pour renvoyer une analyse JSON standardisée :
  - **`hrPitch`** : Accroche synthétique orientée RH/Recrutement valorisant le profil technique de l'auteur.
  - **`objective`** : Objectif architectural et problématiques d'ingénierie résolues par le projet.
  - **`detailedPoints`** : Liste analytique de 4 à 5 points clés sur la sécurité, le réseau, la stack et l'infrastructure.
  - **`techStack`** : Détection automatique des langages et outils sous forme de badges.

### 2. 📁 Galerie de Projets Mis en Cache
- Affichage dynamique de mes projets phares au chargement de `/projects.html`.
- Disponibilité et vitesse garanties par le cache serveur en C#.

### 3. 🎨 SPA Vanilla JS & Design Premium
- **Routage client sans rechargement** : Transition fluide par un rideau visuel synchronisé (`page-transition-overlay`).
- **Design System Dark Mode** : Palette sombre (`#09090b`), accents *Bleu Cyber* (`#38bdf8`) et *Glassmorphism*.
- **Spotlight Magnétique** : Effet de lueur radiale dynamique qui suit le curseur de la souris sur les cartes de projets (`.card-spotlight`).
- **Accessibilité (a11y)** : Support complet de `prefers-reduced-motion` pour désactiver les animations pour les utilisateurs sensibles.

---

## 🐳 Déploiement Production (VPS Ubuntu & Docker)

Le projet est entièrement prêt pour le déploiement en commande unique sur serveur Linux avec `docker-compose.yml`.

### 1. Créer le fichier d'environnement sur le VPS
Dans le répertoire du projet sur l'hôte Ubuntu, créez le fichier `.env` :

```ini
# .env (jamais commité dans Git)
AI_API_KEY=votre_cle_gemini_production
GITHUB_TOKEN=votre_token_github_optionnel
```

### 2. Construction et lancement de l'infrastructure
```bash
# Construction des images multi-stages et lancement en arrière-plan
docker compose up --build -d
```

### 3. Vérification de la santé des conteneurs
```bash
# Contrôle du statut de santé (Healthchecks Nginx & ASP.NET Core)
docker compose ps
```
*Le frontend Nginx répond instantanément en HTTPS sur **`https://gabriel-queau-portfolio.online`**.*

### 4. Surveillance des journaux (Logs Docker)
```bash
# Suivre les logs en direct du backend C#
docker compose logs -f backend

# Suivre les requêtes HTTP/HTTPS reçues par Nginx
docker compose logs -f frontend
```

---

## 💻 Installation Locale & Développement

Pour le développement sur machine locale sans Docker :

### Prérequis
- [SDK .NET 8.0 ou 10.0](https://dotnet.microsoft.com/download)
- [Node.js / Live Server](https://nodejs.org/) (optionnel)
- Clé API [Google AI Studio (Gemini)](https://aistudio.google.com/)

### 1. Configuration des secrets (.NET User Secrets)
En développement, utilisez le gestionnaire de secrets sécurisé `.NET User Secrets` au lieu d'écrire en clair dans `appsettings.json` :

```bash
cd backend
dotnet user-secrets set "AiApiKey" "VOTRE_CLE_API_GEMINI_ICI"
dotnet user-secrets set "GitHubToken" "VOTRE_TOKEN_GITHUB_ICI"
```

### 2. Lancer le Backend localement
```bash
dotnet run
```
*L'API démarre sur `http://localhost:5211`.*

### 3. Lancer le Frontend en local
Ouvrez le dossier `frontend` dans un éditeur (ou avec **Live Server** sur VS Code). Le script JS détecte automatiquement l'environnement local (`http://localhost:5211/api`) et s'y connecte sans modification de code.

---

<div align="center">
  <p class="mono">Conçu et développé par <strong>Gabriel Queau</strong> — Infrastructure · Réseau · Cybersécurité</p>
</div>
