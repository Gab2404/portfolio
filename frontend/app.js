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

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (navbar) {
      navbar.style.background = scrollY > 20
        ? 'rgba(12, 13, 16, 0.95)'
        : 'rgba(12, 13, 16, 0.75)';
    }
    if (backTop) {
      backTop.classList.toggle('visible', scrollY > 400);
    }
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

    const data = await res.json();
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
  const resTag   = document.getElementById('res-tag');
  const resLink  = document.getElementById('res-link');
  const resName  = document.getElementById('res-repo-name');
  const resObj   = document.getElementById('res-objective');
  const resSum   = document.getElementById('res-summary');
  const resStack = document.getElementById('res-stack');
  const resultSec = document.getElementById('result-section');

  if (!resTag || !resLink || !resName || !resObj || !resSum || !resStack || !resultSec) {
    return;
  }

  let owner = '?', repoName = '?';
  try {
    const u = new URL(repoUrl);
    const parts = u.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/');
    owner = parts[0] || '?';
    repoName = parts[1] || '?';
  } catch { /* ignore parse errors */ }

  resTag.textContent  = `// ${repoName.toUpperCase()}`;
  resName.textContent = `${owner}/${repoName}`;
  resLink.href        = repoUrl;
  resObj.textContent  = data.objective || '—';
  resSum.innerHTML    = escapeHtml(data.summary || '—').replace(/\n/g, '<br>');

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

// ── Initialisation Générale ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  initReveal();
  initEventDelegation();
  updateActiveLinks(window.location.pathname);
});
