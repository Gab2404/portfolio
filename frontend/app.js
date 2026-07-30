// ── Config ──────────────────────────────────────────────────────────────────
// Auto-detect: if opened via file:// or localhost without a server,
// point directly to the .NET backend. In Docker (nginx), use relative path.
const IS_LOCAL_DEV = window.location.protocol === 'file:' 
  || window.location.hostname === 'localhost' 
  || window.location.hostname === '127.0.0.1';
const API_BASE = IS_LOCAL_DEV ? 'http://localhost:5211/api' : '/api';

// ── DOM Refs ─────────────────────────────────────────────────────────────────
const form        = document.getElementById('analyzer-form');
const input       = document.getElementById('repo-url');
const btn         = document.getElementById('analyze-btn');
const loader      = document.getElementById('loader');
const errorBanner = document.getElementById('error-banner');
const errorMsg    = document.getElementById('error-msg');
const resultSec   = document.getElementById('result-section');

// Result fields
const repoNameEl   = document.getElementById('res-repo-name');
const repoLinkEl   = document.getElementById('res-repo-link');
const objectiveEl  = document.getElementById('res-objective');
const summaryEl    = document.getElementById('res-summary');
const stackEl      = document.getElementById('res-stack');

// ── State ─────────────────────────────────────────────────────────────────────
function setLoading(active) {
  btn.disabled = active;
  btn.textContent = active ? 'Analyzing…' : 'Analyze';
  loader.style.display = active ? 'flex' : 'none';
  if (active) {
    resultSec.style.display = 'none';
    hideError();
  }
}

function showError(message) {
  errorMsg.textContent = message;
  errorBanner.classList.remove('hidden');
  errorBanner.classList.add('visible');
}

function hideError() {
  errorBanner.classList.remove('visible');
  errorBanner.classList.add('hidden');
}

// ── Form Submit ───────────────────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = input.value.trim();

  if (!url) {
    showError('Please enter a GitHub repository URL.');
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(`${API_BASE}/projects/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl: url }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const msg = data.error || `Error ${response.status}: ${response.statusText}`;
      throw new Error(msg);
    }

    const data = await response.json();
    renderResult(url, data);

  } catch (err) {
    showError(err.message || 'An unexpected error occurred. Check the console for details.');
    console.error('[PortfolioAnalyzer] Error:', err);
  } finally {
    setLoading(false);
  }
});

// ── Render Result ─────────────────────────────────────────────────────────────
function renderResult(repoUrl, data) {
  // Extract owner/repo from URL for display
  try {
    const u = new URL(repoUrl);
    const parts = u.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/');
    repoNameEl.textContent = parts.slice(0, 2).join('/');
    repoLinkEl.href = repoUrl;
  } catch {
    repoNameEl.textContent = repoUrl;
    repoLinkEl.href = repoUrl;
  }

  // Objective
  objectiveEl.textContent = data.objective ?? '—';

  // Summary (preserve line breaks)
  summaryEl.innerHTML = (data.summary ?? '—')
    .split('\n')
    .map(line => `<span>${escapeHtml(line)}</span>`)
    .join('<br>');

  // Tech stack badges
  stackEl.innerHTML = '';
  const stack = Array.isArray(data.techStack) ? data.techStack : [];
  if (stack.length === 0) {
    stackEl.innerHTML = '<span style="color:var(--text-muted);font-size:13px">No tech stack data returned.</span>';
  } else {
    stack.forEach(tech => {
      const badge = document.createElement('span');
      badge.className = 'stack-badge';
      badge.textContent = tech;
      stackEl.appendChild(badge);
    });
  }

  resultSec.style.display = 'block';
  resultSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Utility ───────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Allow Enter key in input ──────────────────────────────────────────────────
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') form.dispatchEvent(new Event('submit'));
});
