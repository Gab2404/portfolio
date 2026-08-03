// ── Config ────────────────────────────────────────────────────────────────────
// Automatiquement "/api" si hébergé sous Nginx/Docker (port 80/443),
// sinon "http://localhost:5211/api" si ouvert en local / Live Server.
const IS_DEV_SERVER = ['file:'].includes(location.protocol) || ['5500', '3000', '8000'].includes(location.port);
const API_BASE = IS_DEV_SERVER ? 'http://localhost:5211/api' : '/api';

// ── Global State ──────────────────────────────────────────────────────────────
let revealObs = null;
let isNavigating = false;

// ── Intersection Observer (Animations d'apparition fluides) ───────────────────
function initReveal() {
  if (revealObs) {
    revealObs.disconnect();
  }

  revealObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
}

// ── UI Helpers ────────────────────────────────────────────────────────────────
function initUI() {
  const navbar = document.querySelector('.navbar');
  const backTop = document.getElementById('back-top');

  // Navbar scroll : classe .scrolled + fond renforcé
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (navbar) {
      navbar.classList.toggle('scrolled', scrollY > 20);
    }
    if (backTop) {
      backTop.classList.toggle('visible', scrollY > 400);
    }
  }, { passive: true });

  // Effet spotlight : radial gradient qui suit la souris sur .card-spotlight
  initSpotlight();
}

function initSpotlight() {
  document.body.addEventListener('mousemove', (e) => {
    const cards = document.querySelectorAll('.card-spotlight');
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width)  * 100;
      const y = ((e.clientY - rect.top)  / rect.height) * 100;
      card.style.setProperty('--x', `${x}%`);
      card.style.setProperty('--y', `${y}%`);
    });
  }, { passive: true });
}

// ── Helper : Attendre la fin d'une transition CSS avec fallback ───────────────
function waitForTransitionEnd(el, timeoutMs = 650) {
  return new Promise((resolve) => {
    if (!el) {
      setTimeout(resolve, 300);
      return;
    }
    let resolved = false;
    const onEnd = () => {
      if (resolved) return;
      resolved = true;
      el.removeEventListener('transitionend', onEnd);
      resolve();
    };
    el.addEventListener('transitionend', onEnd);
    setTimeout(onEnd, timeoutMs); // Garantie absolue d'exécution
  });
}

// ── Vanilla SPA Router (Avec synchronisation parfaite du rideau) ──────────────
async function navigate(url, addToHistory = true) {
  if (isNavigating) return;
  const targetPath = new URL(url, window.location.origin).pathname;
  if (targetPath === window.location.pathname && !addToHistory) return;

  isNavigating = true;
  const overlay = document.querySelector('.page-transition-overlay');

  // 1. Jouer l'animation de sortie (le rideau descend)
  document.body.classList.add('is-animating');
  await waitForTransitionEnd(overlay, 600);

  try {
    // 2. Récupérer dynamiquement le contenu HTML de la cible
    const res = await fetch(targetPath);
    if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);
    const htmlString = await res.text();

    // 3. Parser et mettre à jour le conteneur principal #page-content
    const parser = new DOMParser();
    const newDoc = parser.parseFromString(htmlString, 'text/html');

    const newContent = newDoc.getElementById('page-content');
    const currentContent = document.getElementById('page-content');

    if (newContent && currentContent) {
      currentContent.innerHTML = newContent.innerHTML;
      document.title = newDoc.title;
    }

    // 4. Mettre à jour l'historique de navigation
    if (addToHistory) {
      history.pushState(null, '', targetPath);
    }

    // 5. Mettre à jour la classe "active" dans la barre de navigation
    updateActiveLinks(targetPath);

    // 6. Ré-initialiser le scroll et les animations au nouveau contenu
    window.scrollTo(0, 0);
    initReveal();
    initProjectsGallery();

  } catch (err) {
    console.error('[SPA Router Error]', err);
    // Si échec réseau, forcer le rechargement classique de secours
    window.location.href = url;
  } finally {
    // 7. Jouer l'animation d'entrée (le rideau remonte et dévoile le contenu)
    setTimeout(() => {
      document.body.classList.remove('is-animating');
      isNavigating = false;
    }, 50);
  }
}

// Mettre en avant la vue active dans la barre de navigation
function updateActiveLinks(targetPath = window.location.pathname) {
  const normPath = targetPath === '/' ? '/index.html' : targetPath;

  document.querySelectorAll('a[data-link]').forEach(link => {
    const linkHref = link.getAttribute('href') || '';
    const isMatch = linkHref === normPath || 
                    (normPath === '/index.html' && linkHref === '/') ||
                    (normPath === '/' && linkHref === '/index.html');

    link.classList.toggle('active', isMatch);
  });
}

// ── Logique de l'analyseur GitHub (Délégation d'événements) ───────────────────
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function handleAnalyzeSubmit(form) {
  // Récupération dynamique depuis le DOM courant (évite les références perdues)
  const input       = document.getElementById('repo-url');
  const btn         = document.getElementById('analyze-btn');
  const loader      = document.getElementById('loader');
  const errorBanner = document.getElementById('error-banner');
  const errorMsg    = document.getElementById('error-msg');
  const resultSec   = document.getElementById('result-section');

  if (!input || !btn || !loader || !errorBanner || !errorMsg || !resultSec) {
    return;
  }

  const url = input.value.trim();
  if (!url) {
    errorMsg.textContent = 'Veuillez saisir une URL de dépôt GitHub public.';
    errorBanner.classList.remove('hidden');
    return;
  }

  // Activer le mode chargement
  btn.disabled = true;
  const btnText = btn.querySelector('.btn-text');
  if (btnText) btnText.textContent = 'Analyse en cours…';

  loader.classList.remove('hidden');
  resultSec.classList.add('hidden');
  errorBanner.classList.add('hidden');

  try {
    const res = await fetch(`${API_BASE}/projects/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl: url }),
    });

    let data = {};
    const text = await res.text();
    try {
      if (text) data = JSON.parse(text);
    } catch {
      // Si la réponse n'est pas du JSON valide (ex: erreur Nginx 404/502)
    }

    if (!res.ok) {
      throw new Error(data.detail || data.error || `Erreur serveur (${res.status})`);
    }

    renderResultCard(url, data);
  } catch (err) {
    errorMsg.textContent = err.message || 'Impossible d\'analyser le dépôt. Veuillez vérifier l\'URL.';
    errorBanner.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    if (btnText) btnText.textContent = 'Analyser';
    loader.classList.add('hidden');
  }
}

function renderResultCard(repoUrl, data) {
  const resTag    = document.getElementById('res-tag');
  const resLink   = document.getElementById('res-link');
  const resName   = document.getElementById('res-repo-name');
  const resHr     = document.getElementById('res-hr-pitch');
  const resObj    = document.getElementById('res-objective');
  const resPoints = document.getElementById('res-detailed-points');
  const resStack  = document.getElementById('res-stack');
  const resSum    = document.getElementById('res-summary'); // Fallback compatibilité cache
  const resultSec = document.getElementById('result-section');

  if (!resultSec) return;

  let owner = '?', repoName = '?';
  try {
    const u = new URL(repoUrl);
    const parts = u.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/');
    owner = parts[0] || '?';
    repoName = parts[1] || '?';
  } catch { /* ignore parse errors */ }

  if (resTag)  resTag.textContent  = `// ${repoName.toUpperCase()}`;
  if (resName) resName.textContent = `${owner}/${repoName}`;
  if (resLink) resLink.href        = repoUrl;

  // HR Pitch (Recruteurs)
  const hrBox = document.getElementById('res-hr-box');
  if (resHr) {
    if (data.hrPitch) {
      resHr.textContent = data.hrPitch;
      if (hrBox) hrBox.style.display = 'block';
    } else {
      if (hrBox) hrBox.style.display = 'none';
    }
  }

  // Objective
  if (resObj) {
    resObj.textContent = data.objective || data.summary || '—';
  }

  // Detailed Points (Liste à puces)
  if (resPoints) {
    resPoints.innerHTML = '';
    const points = Array.isArray(data.detailedPoints) ? data.detailedPoints : [];
    if (points.length === 0) {
      resPoints.innerHTML = '<li class="detailed-item">—</li>';
    } else {
      points.forEach(pt => {
        const li = document.createElement('li');
        li.className = 'detailed-item';
        li.innerHTML = escapeHtml(pt).replace(/\n/g, '<br>');
        resPoints.appendChild(li);
      });
    }
  }

  // Tech Stack (Badges)
  if (resStack) {
    resStack.innerHTML = '';
    const stack = Array.isArray(data.techStack) ? data.techStack : [];
    if (stack.length === 0) {
      resStack.innerHTML = '<span style="color:var(--text-muted);font-family:var(--mono);font-size:12px">Aucune technologie détectée</span>';
    } else {
      stack.forEach(tech => {
        const b = document.createElement('span');
        b.className = 'tech-badge';
        b.textContent = tech;
        resStack.appendChild(b);
      });
    }
  }

  resultSec.classList.remove('hidden');
  setTimeout(() => {
    resultSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// ── Délégation d'Événements Globale (Event Delegation sur document.body) ──────
function initEventDelegation() {
  // 1. Navigation SPA et Bouton Retour en haut
  document.body.addEventListener('click', (e) => {
    // Bouton retour en haut
    const backTop = e.target.closest('#back-top');
    if (backTop) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Liens de navigation SPA
    const navLink = e.target.closest('a[data-link]');
    if (navLink) {
      e.preventDefault();
      const href = navLink.getAttribute('href');
      if (href) {
        navigate(href, true);
      }
    }
  });

  // 2. Soumission du formulaire d'analyse IA (fonctionne à 100% après changement de DOM)
  document.body.addEventListener('submit', async (e) => {
    const form = e.target.closest('#analyzer-form');
    if (form) {
      e.preventDefault();
      await handleAnalyzeSubmit(form);
    }
  });

  // 3. Gestion des boutons Précédent / Suivant du navigateur
  window.addEventListener('popstate', () => {
    navigate(window.location.pathname, false);
  });
}

// ── Galerie "Mes Projets Réalisés" (Parallèle, Cache Persistant C# & SPA) ──
const GALLERY_REPOS = [
  'https://github.com/Gab2404/portfolio',
  'https://github.com/Gab2404/ydays-solo-travelers',
  'https://github.com/Gab2404/linux-r-seau2025',
  'https://github.com/Gab2404/WindowsserveurTP'
];

let gallerySessionId = 0;

function createSkeletonCardHtml(index) {
  return `
    <div class="project-skeleton-card" id="gallery-card-${index}">
      <div class="sk-line sk-title sk-wave"></div>
      <div class="sk-line sk-mid sk-wave" style="margin-top:12px"></div>
      <div class="sk-box sk-wave" style="height:72px;margin-top:12px"></div>
      <div class="sk-line sk-short sk-wave" style="margin-top:12px"></div>
      <div class="sk-badges" style="margin-top:12px">
        <div class="sk-badge sk-wave"></div>
        <div class="sk-badge sk-wave" style="animation-delay:.15s"></div>
        <div class="sk-badge sk-wave" style="animation-delay:.3s"></div>
      </div>
    </div>
  `;
}

function createGalleryCardHtml(repoUrl, data) {
  let owner = '?', repoName = '?';
  try {
    const u = new URL(repoUrl);
    const parts = u.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/');
    owner = parts[0] || '?';
    repoName = parts[1] || '?';
  } catch { /* ignore parse errors */ }

  const hrPitchHtml = data.hrPitch
    ? `
      <div class="card-hr-pitch">
        <div class="hr-pitch-header">
          <span class="hr-pitch-tag mono">// HR_PITCH_ELEVATOR :: RECRUTEMENT</span>
          <span class="hr-pitch-badge mono">⭐ PROFIL ALTERNANCE</span>
        </div>
        <p class="hr-pitch-text">${escapeHtml(data.hrPitch)}</p>
      </div>
    ` : '';

  const points = Array.isArray(data.detailedPoints) ? data.detailedPoints : [];
  const pointsHtml = points.length === 0
    ? '<li class="detailed-item">—</li>'
    : points.map(pt => `<li class="detailed-item">${escapeHtml(pt).replace(/\n/g, '<br>')}</li>`).join('');

  const stack = Array.isArray(data.techStack) ? data.techStack : [];
  const stackHtml = stack.length === 0
    ? '<span style="color:var(--text-muted);font-family:var(--mono);font-size:12px">Aucune technologie détectée</span>'
    : stack.map(tech => `<span class="tech-badge">${escapeHtml(tech)}</span>`).join('');

  return `
    <div class="gallery-project-card card-spotlight anim-scale">
      <div class="card-header">
        <div class="card-meta">
          <span class="card-tag mono">// ${escapeHtml(repoName.toUpperCase())}</span>
          <a href="${escapeHtml(repoUrl)}" class="card-repo-link" target="_blank" rel="noopener noreferrer">
            <span>${escapeHtml(owner)}/${escapeHtml(repoName)}</span> ↗
          </a>
        </div>
        <span class="card-status" aria-label="Analysé par IA">AI Analyzed</span>
      </div>

      <div class="card-body">
        ${hrPitchHtml}

        <div class="card-section">
          <h4 class="card-section-label mono">// objective</h4>
          <p class="card-text">${escapeHtml(data.objective || data.summary || '—')}</p>
        </div>
        <div class="card-divider" aria-hidden="true"></div>

        <div class="card-section">
          <h4 class="card-section-label mono">// detailed_technical_analysis</h4>
          <ul class="detailed-list" aria-label="Points techniques clés">
            ${pointsHtml}
          </ul>
        </div>
        <div class="card-divider" aria-hidden="true"></div>

        <div class="card-section">
          <h4 class="card-section-label mono">// tech_stack</h4>
          <div class="badge-grid" aria-label="Technologies utilisées">
            ${stackHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

function initProjectsGallery() {
  const galleryGrid = document.getElementById('gallery-grid');
  if (!galleryGrid) return;

  gallerySessionId++;
  const currentSession = gallerySessionId;

  // 1. Afficher les Skeleton loaders
  galleryGrid.innerHTML = GALLERY_REPOS.map((_, idx) => createSkeletonCardHtml(idx)).join('');

  // 2. Lancer les 4 appels parallèles et remplacer chaque Skeleton dynamiquement
  GALLERY_REPOS.forEach((repoUrl, idx) => {
    fetch('/api/projects/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl })
    })
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    })
    .then(data => {
      if (gallerySessionId !== currentSession || !document.getElementById('gallery-grid')) return;
      const cardContainer = document.getElementById(`gallery-card-${idx}`);
      if (cardContainer) {
        cardContainer.outerHTML = createGalleryCardHtml(repoUrl, data);
      }
    })
    .catch(err => {
      console.error(`[Gallery Error] Failed to load ${repoUrl}:`, err);
      if (gallerySessionId !== currentSession || !document.getElementById('gallery-grid')) return;
      const cardContainer = document.getElementById(`gallery-card-${idx}`);
      if (cardContainer) {
        cardContainer.outerHTML = `
          <div class="gallery-project-card" style="border-color: rgba(239,68,68,0.4)">
            <div class="card-header">
              <span class="card-tag mono" style="color:var(--red)">// ERREUR D'ANALYSE</span>
              <a href="${escapeHtml(repoUrl)}" target="_blank" class="card-repo-link">${escapeHtml(repoUrl)} ↗</a>
            </div>
            <p class="card-text mono" style="color:var(--text-dim)">Impossible de charger l'analyse pour l'instant.</p>
          </div>
        `;
      }
    });
  });
}

// ── Initialisation Générale ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  initReveal();
  initEventDelegation();
  updateActiveLinks(window.location.pathname);
  initProjectsGallery();
});
