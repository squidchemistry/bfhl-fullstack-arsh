/**
 * BFHL Graph Processor — Frontend
 */

const API_BASE_URL = 'http://localhost:3000';

// ── DOM ────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const edgeInput   = $('edge-input');
const btnSubmit   = $('btn-submit');
const btnLabel    = $('btn-label');
const btnSpinner  = $('btn-spinner');
const btnExample  = $('btn-example');
const btnClear    = $('btn-clear');
const errorBanner = $('error-banner');
const errorMsg    = $('error-message');
const errorClose  = $('error-close');
const results     = $('results');
const valTrees    = $('val-trees');
const valCycles   = $('val-cycles');
const valLargest  = $('val-largest');
const valDepth    = $('val-depth');
const hierContent = $('hierarchies-content');
const invContent  = $('invalid-content');
const dupContent  = $('duplicate-content');
const badgeInv    = $('badge-invalid');
const badgeDup    = $('badge-duplicate');
const rawToggle   = $('raw-toggle');
const rawChevron  = $('raw-chevron');
const rawJson     = $('raw-json');

// ── Events ─────────────────────────────────────
btnSubmit.addEventListener('click', submit);
btnExample.addEventListener('click', () => {
  edgeInput.value = 'A->B\nA->C\nB->D\nB->E\nC->F\nX->Y\nY->X\nhello\nA->B';
});
btnClear.addEventListener('click', () => {
  edgeInput.value = '';
  results.classList.add('hidden');
  hideError();
});
errorClose.addEventListener('click', hideError);
rawToggle.addEventListener('click', () => {
  rawJson.classList.toggle('hidden');
  rawChevron.classList.toggle('open');
});

// ── Submit ─────────────────────────────────────
async function submit() {
  hideError();
  const raw = edgeInput.value.trim();
  if (!raw) return showError('Enter at least one edge.');

  const data = raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
  if (!data.length) return showError('No entries found.');

  setLoading(true);
  try {
    const res = await fetch(`${API_BASE_URL}/bfhl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || `Error ${res.status}`);
    }
    render(await res.json());
  } catch (e) {
    showError(e.message || 'Connection failed.');
  } finally {
    setLoading(false);
  }
}

// ── Render ─────────────────────────────────────
function render(d) {
  results.classList.remove('hidden');

  // Summary
  const s = d.summary || {};
  valTrees.textContent   = s.total_trees ?? 0;
  valCycles.textContent  = s.total_cycles ?? 0;
  valLargest.textContent = s.largest_tree_root ?? '—';
  valDepth.textContent   = (d.hierarchies || []).reduce((m, h) => Math.max(m, h.depth || 0), 0);

  // Hierarchies
  hierContent.innerHTML = '';
  (d.hierarchies || []).forEach(h => {
    const block = document.createElement('div');
    block.className = 'hier-block';

    // Header
    const head = document.createElement('div');
    head.className = 'hier-head';
    head.innerHTML = `<span class="hier-root">${h.root}</span>`;
    if (h.has_cycle) {
      head.innerHTML += tag('Cycle', 'cycle');
    } else {
      head.innerHTML += tag('Tree', 'tree') + tag(`Depth ${h.depth}`, 'depth');
    }
    block.appendChild(head);

    // Body
    const body = document.createElement('div');
    body.className = 'hier-body';
    if (h.has_cycle) {
      body.innerHTML = '<span class="cycle-msg">Cycle detected — no tree structure.</span>';
    } else {
      body.innerHTML = treeHTML(h.tree, '');
    }
    block.appendChild(body);
    hierContent.appendChild(block);
  });

  // Diagnostics
  renderPills(invContent, d.invalid_entries || [], 'pill-red', badgeInv);
  renderPills(dupContent, d.duplicate_edges || [], 'pill-orange', badgeDup);

  // JSON
  rawJson.textContent = JSON.stringify(d, null, 2);
  rawJson.classList.add('hidden');
  rawChevron.classList.remove('open');

  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Tree → HTML ────────────────────────────────
function treeHTML(tree, prefix) {
  const keys = Object.keys(tree);
  let html = '';
  keys.forEach((key, i) => {
    const last = i === keys.length - 1;
    const children = tree[key];
    const hasKids = Object.keys(children).length > 0;
    const connector = last ? '└─ ' : '├─ ';
    const cls = hasKids ? 'node' : 'node leaf';
    html += `<div><span class="branch">${prefix}${connector}</span><span class="${cls}">${key}</span></div>`;
    if (hasKids) {
      html += treeHTML(children, prefix + (last ? '   ' : '│  '));
    }
  });
  return html;
}

// ── Pills ──────────────────────────────────────
function renderPills(container, items, cls, badge) {
  container.innerHTML = '';
  badge.textContent = items.length;
  if (!items.length) {
    container.innerHTML = '<span class="empty-msg">None</span>';
    return;
  }
  items.forEach(item => {
    const el = document.createElement('span');
    el.className = `pill ${cls}`;
    el.textContent = item;
    container.appendChild(el);
  });
}

// ── Helpers ────────────────────────────────────
function tag(text, type) {
  return `<span class="tag tag-${type}">${text}</span>`;
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorBanner.classList.remove('hidden');
}

function hideError() { errorBanner.classList.add('hidden'); }

function setLoading(on) {
  btnSubmit.disabled = on;
  btnLabel.textContent = on ? 'Running…' : 'Run';
  btnSpinner.classList.toggle('hidden', !on);
}
