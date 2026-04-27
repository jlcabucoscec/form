/* ============================================================
   CEC Form Submission Tool — app.js
   ============================================================
   Entry ID Map (from data-params in Google Form HTML):
   - LAST NAME          → entry.1109815499
   - FIRST NAME         → entry.705218577
   - COURSE             → entry.1635498050
   - YEAR               → entry.YEAR_ID (set below — update when found)
   - SUBJECT CODE       → entry.943988708
   - SUBJECT TITLE      → entry.560266358
   - TERM FAILED        → entry.304427281
   - REASON FOR FAILURE → entry.86770068
   - WHEN STARTED       → entry.833249190
   - ACTION TAKEN       → entry.722132350
   ============================================================ */

'use strict';

const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSf7Ns60bv4XctvPo82epEUU--DN9FsSsitB_U92jUMiJQMZUA/formResponse';

// ── Entry ID map ──────────────────────────────────────────────
const ENTRY_MAP = {
  'LAST NAME': 'entry.1109815499',
  'FIRST NAME': 'entry.705218577',
  'COURSE': 'entry.1635498050',
  'YEAR': 'entry.601164691',
  'SUBJECT CODE': 'entry.943988708',
  'SUBJECT TITLE': 'entry.560266358',
  'TERM FAILED': 'entry.304427281',
  'PROVIDE THE REASON FOR THE STUDENT\'S FAILURE': 'entry.86770068',
  'REASON FOR FAILURE': 'entry.86770068',
  'WHEN IT WAS STARTED?': 'entry.833249190',
  'WHEN STARTED': 'entry.833249190',
  'ACTION TAKEN': 'entry.722132350',
};

// ── Canonical label aliases (normalise user input → entry key) ─
const LABEL_ALIASES = {
  'LAST NAME': 'LAST NAME',
  'LASTNAME': 'LAST NAME',
  'SURNAME': 'LAST NAME',
  'FIRST NAME': 'FIRST NAME',
  'FIRSTNAME': 'FIRST NAME',
  'GIVEN NAME': 'FIRST NAME',
  'COURSE': 'COURSE',
  'DEGREE PROGRAM': 'COURSE',
  'COURSE (DEGREE PROGRAM)': 'COURSE',
  'YEAR': 'YEAR',
  'SCHOOL YEAR': 'YEAR',
  'SUBJECT CODE': 'SUBJECT CODE',
  'SUBJECT CODE (E.G. GE1, GE2, IT11)': 'SUBJECT CODE',
  'SUBJECT TITLE': 'SUBJECT TITLE',
  'SUBJECT TITLE (E.G. PURPOSIVE COMMUNICATION, ASSESSMENT IN LEARNING 1)': 'SUBJECT TITLE',
  'TERM FAILED': 'TERM FAILED',
  'PROVIDE THE REASON FOR THE STUDENT\'S FAILURE': 'PROVIDE THE REASON FOR THE STUDENT\'S FAILURE',
  'REASON FOR FAILURE': 'PROVIDE THE REASON FOR THE STUDENT\'S FAILURE',
  'REASON': 'PROVIDE THE REASON FOR THE STUDENT\'S FAILURE',
  'WHEN IT WAS STARTED?': 'WHEN IT WAS STARTED?',
  'WHEN IT WAS STARTED': 'WHEN IT WAS STARTED?',
  'WHEN STARTED?': 'WHEN IT WAS STARTED?',
  'WHEN STARTED': 'WHEN IT WAS STARTED?',
  'ACTION TAKEN': 'ACTION TAKEN',
  'ACTION': 'ACTION TAKEN',
};

// ── Dropdown value maps (normalise free-text → accepted option) ─
const VALUE_ALIASES = {
  'entry.1635498050': { // COURSE
    'BSIT': 'BSIT', 'BEED': 'BEED',
    'BSED': 'BSED - MATHEMATICS',
    'BSED - MATHEMATICS': 'BSED - MATHEMATICS',
    'BSED - ENGLISH': 'BSED - ENGLISH',
    'BSTM': 'BSTM', 'BSHM': 'BSHM', 'BSCRIM': 'BSCRIM',
  },
  'entry.601164691': { // YEAR (year level, NOT school year)
    '1ST': '1ST', '1': '1ST', 'FIRST': '1ST',
    '1ST YEAR': '1ST', 'FIRST YEAR': '1ST',
    '2ND': '2ND', '2': '2ND', 'SECOND': '2ND',
    '2ND YEAR': '2ND', 'SECOND YEAR': '2ND',
    '3RD': '3RD', '3': '3RD', 'THIRD': '3RD',
    '3RD YEAR': '3RD', 'THIRD YEAR': '3RD',
    '4TH': '4TH', '4': '4TH', 'FOURTH': '4TH',
    '4TH YEAR': '4TH', 'FOURTH YEAR': '4TH',
  },
  'entry.304427281': { // TERM FAILED
    'PRELIM': 'PRELIM', 'MIDTERM': 'MIDTERM',
    'SEMI-FINALS': 'SEMI-FINALS', 'SEMIFINALS': 'SEMI-FINALS',
    'FINALS': 'FINALS',
  },
  'entry.86770068': { // REASON FOR FAILURE (radio with "Other")
    'STOPPED': 'STOPPED', 'WITHDRAW': 'WITHDRAW',
    'DROPOUT': 'DROPOUT',
  },
  'entry.833249190': { // WHEN STARTED
    'PRELIM': 'PRELIM', 'MIDTERM': 'MIDTERM',
    'SEMI-FINALS': 'SEMI-FINALS', 'SEMIFINALS': 'SEMI-FINALS',
    'FINALS': 'FINALS',
  },
  'entry.722132350': { // ACTION TAKEN (radio with "Other")
    'STUDENT AWARENESS': 'STUDENT AWARENESS',
    'PARENTS ACKNOWLEDGEMENT': 'PARENTS ACKNOWLEDGEMENT',
    'REMEDIAL TEACHING': 'REMEDIAL TEACHING',
  },
};

// Fields that have an "Other" radio option in Google Forms
const OTHER_OPTION_FIELDS = new Set([
  'entry.86770068',   // REASON FOR FAILURE
  'entry.722132350',  // ACTION TAKEN
]);

// ── State ─────────────────────────────────────────────────────
let queue = [];           // array of { id, data, status, msg }
let isRunning = false;
let stats = { pending: 0, success: 0, error: 0 };

// ── DOM refs ──────────────────────────────────────────────────
const rawInputEl = document.getElementById('raw-input');
const entryCountEl = document.getElementById('entry-count');
const todoListEl = document.getElementById('todo-list');
const parseBtnEl = document.getElementById('parse-btn');
const clearBtnEl = document.getElementById('clear-btn');
const submitAllBtn = document.getElementById('submit-all-btn');
const submitLabel = document.getElementById('submit-label');
const submitSpinner = document.getElementById('submit-spinner');
const resetBtn = document.getElementById('reset-btn');
const pillPending = document.getElementById('pill-pending');
const pillSuccess = document.getElementById('pill-success');
const pillError = document.getElementById('pill-error');
const logPanel = document.getElementById('log-panel');
const logOutput = document.getElementById('log-output');
const clearLogBtn = document.getElementById('clear-log-btn');

// ── Event Listeners ───────────────────────────────────────────
parseBtnEl.addEventListener('click', handleParse);
clearBtnEl.addEventListener('click', () => { rawInputEl.value = ''; updateEntryCount(0); });
submitAllBtn.addEventListener('click', handleSubmitAll);
resetBtn.addEventListener('click', handleReset);
clearLogBtn.addEventListener('click', () => { logOutput.innerHTML = ''; });

// ── Parsing ───────────────────────────────────────────────────
function handleParse() {
  let raw = rawInputEl.value.trim();
  if (!raw) { showToast('Paste some data first.', 'warn'); return; }

  // Split into blocks separated by blank lines
  const blocks = raw.split(/\n\s*\n/).map(b => {
    b = b.trim();
    // Strip surrounding double-quotes (each entry from spreadsheet formulas)
    if (b.startsWith('"') && b.endsWith('"')) b = b.slice(1, -1).trim();
    return b;
  }).filter(Boolean);

  const parsed = blocks.map((block, idx) => {
    const fields = parseBlock(block);
    return {
      id: `entry-${Date.now()}-${idx}`,
      data: fields,
      status: 'pending',
      msg: '',
    };
  }).filter(e => Object.keys(e.data).length > 0);

  if (!parsed.length) { showToast('No valid entries found.', 'warn'); return; }

  queue = parsed;
  renderQueue();
  updateStats();
  submitAllBtn.disabled = false;
  resetBtn.style.display = 'none';
  log(`Parsed ${parsed.length} entr${parsed.length === 1 ? 'y' : 'ies'}.`, 'info');
}

/**
 * Parse a single text block into a { entryKey: value } payload dict.
 */
function parseBlock(block) {
  const lines = block.split('\n');
  const payload = {};

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    let rawLabel = line.slice(0, colonIdx).trim().toUpperCase();
    const rawValue = line.slice(colonIdx + 1).trim();

    // Normalise smart/curly quotes → straight (spreadsheet formulas use these)
    rawLabel = rawLabel.replace(/[\u2018\u2019\u2032]/g, "'").replace(/[\u201C\u201D]/g, '"');

    const canonical = LABEL_ALIASES[rawLabel];
    if (!canonical) continue; // skip unrecognised labels

    const entryKey = ENTRY_MAP[canonical];
    if (!entryKey || entryKey.includes('PLACEHOLDER')) {
      // Still add it so the user can see it, but mark it
      payload[entryKey || canonical] = rawValue;
      continue;
    }

    // Normalise dropdown values if applicable
    const aliases = VALUE_ALIASES[entryKey];
    let finalValue = rawValue;
    if (aliases) {
      const upper = rawValue.toUpperCase();
      finalValue = aliases[upper] || rawValue; // fall through to raw if no alias
    }

    payload[entryKey] = finalValue;
  }

  return payload;
}

// ── Rendering ─────────────────────────────────────────────────
function renderQueue() {
  if (!queue.length) {
    todoListEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>No entries yet. Paste data on the left and click <strong>Parse Entries</strong>.</p>
      </div>`;
    updateEntryCount(0);
    return;
  }

  updateEntryCount(queue.length);
  todoListEl.innerHTML = '';

  queue.forEach(entry => {
    const el = buildTodoItem(entry);
    todoListEl.appendChild(el);
  });
}

function buildTodoItem(entry) {
  const { id, data, status, msg } = entry;

  const lastName = data['entry.1109815499'] || '—';
  const firstName = data['entry.705218577'] || '—';
  const course = data['entry.1635498050'] || '';
  const subject = data['entry.943988708'] || data['entry.560266358'] || '';
  const term = data['entry.304427281'] || '';

  const icons = { pending: '⏳', running: '🔄', success: '✅', error: '❌' };
  const icon = icons[status] || '⏳';

  const div = document.createElement('div');
  div.className = `todo-item ${status}`;
  div.id = `todo-${id}`;
  div.innerHTML = `
    <div class="todo-status${status === 'running' ? ' spinning' : ''}">${icon}</div>
    <div class="todo-body">
      <div class="todo-name">${lastName}, ${firstName}</div>
      <div class="todo-meta">
        ${course ? `<span>🎓 ${course}</span>` : ''}
        ${subject ? `<span>📚 ${subject}</span>` : ''}
        ${term ? `<span>📅 ${term}</span>` : ''}
      </div>
      ${msg ? `<div class="todo-msg${status === 'error' ? ' err' : ''}">${msg}</div>` : ''}
    </div>
    ${status === 'error' ? `<button class="todo-retry" onclick="retrySingle('${id}')">Retry</button>` : ''}
  `;
  return div;
}

function updateTodoItem(id) {
  const entry = queue.find(e => e.id === id);
  if (!entry) return;
  const existing = document.getElementById(`todo-${id}`);
  if (existing) {
    const newEl = buildTodoItem(entry);
    existing.replaceWith(newEl);
  }
}

function updateEntryCount(n) {
  entryCountEl.textContent = `${n} entr${n === 1 ? 'y' : 'ies'}`;
}

function updateStats() {
  stats.pending = queue.filter(e => e.status === 'pending').length;
  stats.success = queue.filter(e => e.status === 'success').length;
  stats.error = queue.filter(e => e.status === 'error').length;
  pillPending.textContent = `${stats.pending} pending`;
  pillSuccess.textContent = `${stats.success} done`;
  pillError.textContent = `${stats.error} failed`;
}

// ── Submission ────────────────────────────────────────────────
async function handleSubmitAll() {
  const url = getFormUrl();
  if (!url) return;

  isRunning = true;
  submitAllBtn.disabled = true;
  submitSpinner.style.display = 'inline-block';
  submitLabel.textContent = 'Submitting…';
  logPanel.style.display = 'block';

  const toRun = queue.filter(e => e.status === 'pending' || e.status === 'error');

  for (let i = 0; i < toRun.length; i++) {
    const entry = toRun[i];
    entry.status = 'running';
    entry.msg = '';
    updateTodoItem(entry.id);

    await submitEntry(url, entry);
    updateTodoItem(entry.id);
    updateStats();

    // Rate limiting: 1.5s between submissions
    if (i < toRun.length - 1) await delay(1500);
  }

  isRunning = false;
  submitSpinner.style.display = 'none';
  submitLabel.textContent = '⚡ Submit All';
  submitAllBtn.disabled = stats.pending === 0;
  resetBtn.style.display = 'inline-flex';
  log(`Done. ✅ ${stats.success} success  ❌ ${stats.error} failed`, 'info');
}

async function submitEntry(url, entry) {
  const { id, data } = entry;
  const params = {};

  for (const [key, value] of Object.entries(data)) {
    if (!key.startsWith('entry.') || key.includes('PLACEHOLDER')) continue;

    // For radio fields with "Other": if value doesn't match a preset,
    // send __other_option__ as the value + the actual text in .other_option_response
    if (OTHER_OPTION_FIELDS.has(key)) {
      const presets = VALUE_ALIASES[key];
      const upper = value.toUpperCase();
      if (presets && presets[upper]) {
        params[key] = presets[upper];
      } else {
        params[key] = '__other_option__';
        params[key + '.other_option_response'] = value;
      }
    } else {
      params[key] = value;
    }
  }

  const name = `${data['entry.1109815499'] || '?'}, ${data['entry.705218577'] || '?'}`;

  // ── Detailed console logging ──────────────────────────────
  const FIELD_LABELS = {
    'entry.1109815499': 'LAST NAME',
    'entry.705218577':  'FIRST NAME',
    'entry.1635498050': 'COURSE',
    'entry.601164691':  'YEAR',
    'entry.943988708':  'SUBJECT CODE',
    'entry.560266358':  'SUBJECT TITLE',
    'entry.304427281':  'TERM FAILED',
    'entry.86770068':   'REASON FOR FAILURE',
    'entry.833249190':  'WHEN STARTED',
    'entry.722132350':  'ACTION TAKEN',
  };

  const REQUIRED_ENTRIES = [
    'entry.1109815499', 'entry.705218577', 'entry.1635498050',
    'entry.601164691', 'entry.943988708', 'entry.560266358',
    'entry.304427281', 'entry.86770068', 'entry.833249190',
    'entry.722132350',
  ];

  // Log each field
  console.group(`📤 Submitting: ${name}`);
  for (const entryId of REQUIRED_ENTRIES) {
    const label = FIELD_LABELS[entryId];
    const value = params[entryId];
    if (value) {
      const display = value === '__other_option__'
        ? `Other → "${params[entryId + '.other_option_response'] || ''}"` 
        : `"${value}"`;
      console.log(`  ✅ ${label}: ${display}`);
    } else {
      console.warn(`  ⚠️ ${label}: MISSING`);
    }
  }

  const missing = REQUIRED_ENTRIES.filter(e => !params[e]);
  if (missing.length > 0) {
    const missingLabels = missing.map(e => FIELD_LABELS[e]).join(', ');
    console.warn(`⚠️ Missing fields: ${missingLabels}`);
    log(`⚠️ ${name} — missing: ${missingLabels}`, 'warn');
  }
  console.groupEnd();

  // Block submission if required fields are missing
  if (missing.length > 0) {
    const missingLabels = missing.map(e => FIELD_LABELS[e]).join(', ');
    entry.status = 'error';
    entry.msg = `Missing: ${missingLabels}`;
    log(`🚫 ${name} — SKIPPED (missing: ${missingLabels})`, 'err');
    return;
  }

  // Google Forms hidden fields required for multi-page form submission
  params['fvv'] = '1';                       // form version
  params['pageHistory'] = '0,1,2';           // tells Google all 3 pages were completed
  params['fbzx'] = Math.floor(Math.random() * 1e18).toString();

  try {
    // Use hidden iframe + form POST so browser sends Google auth cookies
    await submitViaIframe(url, params);

    entry.status = 'success';
    entry.msg = 'Submitted with all fields ✓';
    log(`✅ ${name} — submitted (complete)`, 'ok');
  } catch (err) {
    entry.status = 'error';
    entry.msg = `Error: ${err.message}`;
    log(`❌ ${name} — ${err.message}`, 'err');
  }
}

/**
 * Submit form data via a hidden iframe + dynamically created <form>.
 * This allows the browser to send cookies (Google auth) with the request.
 */
function submitViaIframe(url, params) {
  return new Promise((resolve) => {
    const iframeName = 'submit-frame-' + Date.now();
    const iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url;
    form.target = iframeName;
    form.style.display = 'none';

    for (const [key, value] of Object.entries(params)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    }

    document.body.appendChild(form);

    // Resolve after iframe loads (form submitted)
    iframe.addEventListener('load', () => {
      // Clean up after a short delay
      setTimeout(() => {
        form.remove();
        iframe.remove();
      }, 1000);
      resolve();
    });

    // Also resolve on error (cross-origin frames can't be read, that's ok)
    iframe.addEventListener('error', () => {
      setTimeout(() => {
        form.remove();
        iframe.remove();
      }, 1000);
      resolve();
    });

    form.submit();
  });
}

async function retrySingle(id) {
  const url = getFormUrl();
  if (!url) return;

  const entry = queue.find(e => e.id === id);
  if (!entry) return;

  entry.status = 'pending';
  entry.msg = '';
  updateTodoItem(entry.id);
  updateStats();

  logPanel.style.display = 'block';
  entry.status = 'running';
  updateTodoItem(entry.id);
  await submitEntry(url, entry);
  updateTodoItem(entry.id);
  updateStats();
}

function handleReset() {
  queue = [];
  renderQueue();
  updateStats();
  submitAllBtn.disabled = true;
  resetBtn.style.display = 'none';
  rawInputEl.value = '';
}

// ── Helpers ───────────────────────────────────────────────────
function getFormUrl() {
  return FORM_URL;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg, type = 'info') {
  const classMap = { ok: 'log-line-ok', err: 'log-line-err', info: 'log-line-info', warn: 'log-line-warn' };
  const div = document.createElement('div');
  div.className = classMap[type] || '';
  const ts = new Date().toLocaleTimeString();
  div.textContent = `[${ts}] ${msg}`;
  logOutput.appendChild(div);
  logOutput.scrollTop = logOutput.scrollHeight;
}

function showToast(msg, type = 'info') {
  // Simple inline toast via log + console
  console[type === 'err' ? 'error' : 'warn'](msg);
  log(msg, type);
  logPanel.style.display = 'block';
}
