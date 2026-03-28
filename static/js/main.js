// ── SignSpeak main.js v3 ──────────────────────────────────────────────
// Theme · Status · Toast · TTS · Phrases · Stats · Export

// ── Theme Toggle ──────────────────────────────────────────────────────
(function initTheme() {
    const saved = localStorage.getItem('ss-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
})();

document.addEventListener('DOMContentLoaded', () => {
    const themeBtn = document.getElementById('theme-toggle');
    themeBtn?.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('ss-theme', next);
    });
});

// ── Toast ─────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
    let el = document.getElementById('__toast');
    if (!el) {
        el = document.createElement('div');
        el.id = '__toast';
        el.className = 'toast';
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = `toast ${type}`;
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2800);
}
window.showToast = showToast;

// ── Status ────────────────────────────────────────────────────────────
function setStatus(state, label) {
    const dot  = document.getElementById('system-status');
    const text = document.getElementById('status-text');
    if (dot)  dot.className  = `status-dot ${state}`;
    if (text) text.textContent = label;
}
window.setStatus = setStatus;

// ── TTS ───────────────────────────────────────────────────────────────
let _lastSpoken = '';

function speakText(text) {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utt);
    _lastSpoken = text;
}
window.speakText = speakText;

function repeatLast() {
    if (_lastSpoken) speakText(_lastSpoken);
    else showToast('Nothing spoken yet', 'warning');
}
window.repeatLast = repeatLast;

// ── Sound Feedback (Web Audio) ────────────────────────────────────────
let _soundEnabled = true;
let _audioCtx = null;

function playCommitSound() {
    if (!_soundEnabled) return;
    try {
        if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc  = _audioCtx.createOscillator();
        const gain = _audioCtx.createGain();
        osc.connect(gain); gain.connect(_audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, _audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, _audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, _audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + 0.15);
        osc.start(); osc.stop(_audioCtx.currentTime + 0.15);
    } catch(e) {}
}
window.playCommitSound = playCommitSound;

// ── Session Stats ─────────────────────────────────────────────────────
let _sessionStart = Date.now();
let _letterCount  = 0;
let _wordCount    = 0;

function updateStats(text) {
    _letterCount = text.replace(/\s/g, '').length;
    const words  = text.trim() ? text.trim().split(/\s+/).length : 0;
    _wordCount   = words;

    const lEl = document.getElementById('stat-letters');
    const wEl = document.getElementById('stat-words');
    if (lEl) lEl.textContent = _letterCount;
    if (wEl) wEl.textContent = _wordCount;

    // char/word in sentence panel
    const cEl = document.getElementById('char-count');
    const wdEl= document.getElementById('word-count-display');
    if (cEl)  cEl.textContent  = `${text.length} chars`;
    if (wdEl) wdEl.textContent = `${words} word${words !== 1 ? 's' : ''}`;
}
window.updateStats = updateStats;

// Session timer
setInterval(() => {
    const el = document.getElementById('stat-time');
    if (!el) return;
    const s = Math.floor((Date.now() - _sessionStart) / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    el.textContent = `${mm}:${ss}`;
}, 1000);

// ── Session History ───────────────────────────────────────────────────
const _history = [];

function addHistoryEntry(text, type = 'phrase') {
    if (!text.trim()) return;
    const log = document.getElementById('history-log');
    if (!log) return;

    const now = new Date();
    const ts  = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const entry = { text, ts, type };
    _history.push(entry);

    // Clear empty state
    const empty = log.querySelector('.history-empty');
    if (empty) empty.remove();

    const el = document.createElement('div');
    el.className = 'history-entry';
    el.innerHTML = `
        <span class="history-badge">${ts}</span>
        <span class="history-text">${escapeHtml(text)}</span>
        <button class="history-speak-btn" title="Speak this entry">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        </button>
    `;
    el.querySelector('.history-speak-btn').addEventListener('click', () => speakText(text));
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
}
window.addHistoryEntry = addHistoryEntry;

function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

document.getElementById('clear-history-btn')?.addEventListener('click', () => {
    const log = document.getElementById('history-log');
    if (!log) return;
    log.innerHTML = '<div class="history-empty">No entries yet — start communicating!</div>';
    _history.length = 0;
    showToast('History cleared', 'info');
});

// ── Export Transcript ─────────────────────────────────────────────────
function exportTranscript() {
    if (!_history.length) { showToast('Nothing to export yet', 'warning'); return; }
    const lines = _history.map(e => `[${e.ts}] ${e.text}`).join('\n');
    const header = `SignSpeak Session Transcript\nDate: ${new Date().toLocaleDateString()}\n${'─'.repeat(40)}\n\n`;
    const blob = new Blob([header + lines], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signspeek-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Transcript downloaded ✓', 'success');
}
window.exportTranscript = exportTranscript;

// ── Quick Phrases ─────────────────────────────────────────────────────
async function loadPhrases() {
    const grid = document.getElementById('phrases-grid');
    if (!grid) return;
    try {
        const res    = await fetch('/api/phrases');
        const phrases = await res.json();
        grid.innerHTML = '';
        phrases.forEach(phrase => {
            const chip = document.createElement('button');
            chip.className = 'phrase-chip';
            chip.textContent = phrase;
            chip.addEventListener('click', () => {
                window.sentenceBuilder?.setPhrase(phrase);
                showToast('Phrase loaded', 'success');
            });
            grid.appendChild(chip);
        });
    } catch(e) { console.warn('Phrases load failed', e); }
}

// ── TTS Controls ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadPhrases();
    setStatus('ready', 'Ready');


    // Sound toggle
    const soundBtn = document.getElementById('sound-toggle');
    soundBtn?.addEventListener('click', () => {
        _soundEnabled = !_soundEnabled;
        soundBtn.style.color  = _soundEnabled ? '' : 'var(--text-muted)';
        soundBtn.style.opacity = _soundEnabled ? '1' : '0.4';
        showToast(`Sound feedback ${_soundEnabled ? 'on' : 'off'}`, 'info');
    });

    // Repeat btn
    document.getElementById('repeat-btn')?.addEventListener('click', repeatLast);

    // Export btn
    document.getElementById('export-btn')?.addEventListener('click', exportTranscript);
});

// FPS counter helper
let _lastFpsTime = 0; let _fpsFrames = 0; let _fps = 0;
function tickFps() {
    _fpsFrames++;
    const now = performance.now();
    if (now - _lastFpsTime >= 1000) {
        _fps = _fpsFrames;
        _fpsFrames = 0;
        _lastFpsTime = now;
        const el = document.getElementById('fps-counter');
        if (el) el.textContent = _fps + ' fps';
    }
}
window.tickFps = tickFps;
