// ── SignSpeak Gesture Engine v4 ───────────────────────────────────────
// MediaPipe Hands · Fingerpose ASL Classifier · Keyboard Fallback · Auto-speak
// ─────────────────────────────────────────────────────────────────────

// ── Sentence Builder ──────────────────────────────────────────────────
class SentenceBuilder {
    constructor() {
        this.text    = '';
        this.history = [];
        this.el      = document.getElementById('sentence-display');
        this.render();
    }

    _save() { this.history.push(this.text); if (this.history.length > 50) this.history.shift(); }

    append(char) {
        this._save();
        if (char === 'SPACE') this.text += ' ';
        else                  this.text += char;
        this._afterChange();
    }

    addPunct(ch) { this._save(); this.text += ch; this._afterChange(); }
    setPhrase(phrase) { this._save(); this.text = phrase; this._afterChange(); }
    clear()     { this._save(); this.text = ''; this._afterChange(); }
    backspace() { this._save(); this.text = this.text.slice(0, -1); this._afterChange(); }

    undo() {
        if (!this.history.length) { window.showToast('Nothing to undo', 'warning'); return; }
        this.text = this.history.pop();
        this._afterChange(false);
    }

    get() { return this.text; }

    _afterChange(checkAutoSpeak = true) {
        this.render();
        window.updateStats?.(this.text);
        if (checkAutoSpeak) {
            const autoTog = document.getElementById('autospeak-toggle');
            if (autoTog?.checked) {
                const last = this.text.slice(-1);
                if (['.', '!', '?'].includes(last)) {
                    const sentence = this.text.trim();
                    if (sentence) {
                        setTimeout(() => window.speakText?.(sentence), 100);
                        window.addHistoryEntry?.(sentence, 'auto');
                    }
                }
            }
        }
    }

    render() {
        if (!this.el) return;
        this.el.innerHTML = this.text
            ? `<span>${escapeHtmlInner(this.text)}</span><span class="cursor"></span>`
            : `<span class="placeholder-text">Start signing or type using keyboard…</span>`;
        this.el.scrollTop = this.el.scrollHeight;
    }
}

function escapeHtmlInner(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

const builder = new SentenceBuilder();
window.sentenceBuilder = builder;

// ── Button Bindings ───────────────────────────────────────────────────
document.getElementById('speak-btn')?.addEventListener('click', () => {
    const txt = builder.get().trim();
    if (txt) { window.speakText(txt); window.addHistoryEntry(txt, 'spoken'); window.showToast('Speaking…', 'info'); }
    else      { window.showToast('Nothing to speak yet', 'warning'); }
});
document.getElementById('clear-btn')?.addEventListener('click', () => { builder.clear(); window.showToast('Cleared', 'info'); });
document.getElementById('backspace-btn')?.addEventListener('click', () => builder.backspace());
document.getElementById('undo-btn')?.addEventListener('click', () => builder.undo());
document.getElementById('copy-btn')?.addEventListener('click', () => {
    const txt = builder.get();
    if (txt) {
        navigator.clipboard.writeText(txt)
            .then(() => window.showToast('Copied to clipboard ✓', 'success'))
            .catch(() => window.showToast('Copy failed', 'error'));
    } else { window.showToast('Nothing to copy', 'warning'); }
});
document.querySelectorAll('.punct-btn').forEach(btn => {
    btn.addEventListener('click', () => builder.addPunct(btn.dataset.char));
});

// ── Gesture Hold Settings ─────────────────────────────────────────────
const holdSlider = document.getElementById('hold-duration');
const holdValEl  = document.getElementById('hold-val');
const confSlider = document.getElementById('conf-threshold');
const confValEl  = document.getElementById('conf-val');

let holdDuration  = 1200;
let confThreshold = 75;

holdSlider?.addEventListener('input', () => {
    holdDuration = parseInt(holdSlider.value);
    if (holdValEl) holdValEl.textContent = (holdDuration / 1000).toFixed(1) + 's';
});
confSlider?.addEventListener('input', () => {
    confThreshold = parseInt(confSlider.value);
    if (confValEl) confValEl.textContent = confThreshold + '%';
});

// ── Ring Progress ─────────────────────────────────────────────────────
function setRingProgress(pct) {
    const circumference = 157.1;
    const ring  = document.getElementById('ring-progress');
    const pctEl = document.getElementById('hold-pct');
    if (!ring) return;
    ring.style.strokeDashoffset = circumference - (pct / 100) * circumference;
    if (pctEl) pctEl.textContent = Math.round(pct) + '%';
}

// ── Fingerpose ASL Gesture Definitions ───────────────────────────────
function buildASLGestures() {
    const { GestureDescription, GestureEstimator, Finger, FingerCurl, FingerDirection } = fp;
    const { Thumb, Index, Middle, Ring, Pinky } = Finger;
    const { NoCurl, HalfCurl, FullCurl } = FingerCurl;
    const { VerticalUp, DiagonalUpLeft, DiagonalUpRight, HorizontalLeft, HorizontalRight } = FingerDirection;

    function setCurl(g, fingers, curl, weight = 1.0) { fingers.forEach(f => g.addCurl(f, curl, weight)); }
    function setDir(g, fingers, dir, weight = 1.0)   { fingers.forEach(f => g.addDirection(f, dir, weight)); }

    // A: closed fist, thumb resting on side
    const A = new GestureDescription('A');
    setCurl(A, [Index, Middle, Ring, Pinky], FullCurl, 1.0);
    A.addCurl(Thumb, HalfCurl, 0.9);

    // B: four fingers straight up, thumb folded across palm
    const B = new GestureDescription('B');
    setCurl(B, [Index, Middle, Ring, Pinky], NoCurl, 1.0);
    setDir(B,  [Index, Middle, Ring, Pinky], VerticalUp, 0.9);
    B.addCurl(Thumb, FullCurl, 1.0);

    // C: all fingers in a curved C shape
    const C = new GestureDescription('C');
    setCurl(C, [Index, Middle, Ring, Pinky, Thumb], HalfCurl, 1.0);

    // D: index points up; others curl to meet thumb
    const D = new GestureDescription('D');
    D.addCurl(Index, NoCurl, 1.0);
    D.addDirection(Index, VerticalUp, 1.0);
    setCurl(D, [Middle, Ring, Pinky], FullCurl, 1.0);
    D.addCurl(Thumb, HalfCurl, 0.8);

    // E: fingers bent (claw), thumb tucked under
    const E = new GestureDescription('E');
    setCurl(E, [Index, Middle, Ring, Pinky], HalfCurl, 1.0);
    E.addCurl(Thumb, FullCurl, 0.9);

    // F: index + thumb circle; middle, ring, pinky up
    const F = new GestureDescription('F');
    setCurl(F, [Middle, Ring, Pinky], NoCurl, 1.0);
    setDir(F,  [Middle, Ring, Pinky], VerticalUp, 0.8);
    F.addCurl(Index, HalfCurl, 1.0);
    F.addCurl(Thumb, HalfCurl, 0.9);

    // I: only pinky straight up
    const I = new GestureDescription('I');
    setCurl(I, [Index, Middle, Ring], FullCurl, 1.0);
    I.addCurl(Pinky, NoCurl, 1.0);
    I.addDirection(Pinky, VerticalUp, 1.0);
    I.addCurl(Thumb, HalfCurl, 0.7);

    // K: index up, middle half-curled, thumb between them
    const K = new GestureDescription('K');
    K.addCurl(Index, NoCurl, 1.0);
    K.addDirection(Index, DiagonalUpRight, 0.9);
    K.addCurl(Middle, HalfCurl, 0.9);
    K.addDirection(Middle, DiagonalUpLeft, 0.8);
    setCurl(K, [Ring, Pinky], FullCurl, 1.0);
    K.addCurl(Thumb, HalfCurl, 0.8);

    // L: index up, thumb out horizontally (L shape)
    const L = new GestureDescription('L');
    L.addCurl(Index, NoCurl, 1.0);
    L.addDirection(Index, VerticalUp, 1.0);
    setCurl(L, [Middle, Ring, Pinky], FullCurl, 1.0);
    L.addCurl(Thumb, NoCurl, 1.0);
    L.addDirection(Thumb, DiagonalUpRight, 0.9);

    // O: all fingers curve to meet thumb (tighter than C)
    const O = new GestureDescription('O');
    setCurl(O, [Index, Middle, Ring, Pinky], HalfCurl, 1.0);
    setCurl(O, [Index, Middle, Ring, Pinky], FullCurl, 0.5); // slightly more closed than C
    O.addCurl(Thumb, HalfCurl, 1.0);

    // S: fist with thumb folded OVER fingers
    const S = new GestureDescription('S');
    setCurl(S, [Index, Middle, Ring, Pinky], FullCurl, 1.0);
    S.addCurl(Thumb, HalfCurl, 1.0);
    S.addDirection(Thumb, HorizontalRight, 0.9);

    // U: index + middle together pointing up
    const U = new GestureDescription('U');
    setCurl(U, [Index, Middle], NoCurl, 1.0);
    setDir(U,  [Index, Middle], VerticalUp, 1.0);
    setCurl(U, [Ring, Pinky], FullCurl, 1.0);
    U.addCurl(Thumb, FullCurl, 0.8);

    // V: index + middle spread in V shape
    const V = new GestureDescription('V');
    V.addCurl(Index, NoCurl, 1.0);
    V.addDirection(Index, DiagonalUpLeft, 1.0);
    V.addCurl(Middle, NoCurl, 1.0);
    V.addDirection(Middle, DiagonalUpRight, 1.0);
    setCurl(V, [Ring, Pinky], FullCurl, 1.0);
    V.addCurl(Thumb, FullCurl, 0.8);

    // W: index + middle + ring up
    const W = new GestureDescription('W');
    setCurl(W, [Index, Middle, Ring], NoCurl, 1.0);
    setDir(W,  [Index, Middle, Ring], VerticalUp, 0.9);
    W.addCurl(Pinky, FullCurl, 1.0);
    W.addCurl(Thumb, FullCurl, 0.8);

    // X: index finger hooked/bent
    const X = new GestureDescription('X');
    X.addCurl(Index, HalfCurl, 1.0);
    X.addDirection(Index, DiagonalUpRight, 0.8);
    setCurl(X, [Middle, Ring, Pinky], FullCurl, 1.0);
    X.addCurl(Thumb, HalfCurl, 0.7);

    // Y: thumb + pinky extended, rest folded
    const Y = new GestureDescription('Y');
    setCurl(Y, [Index, Middle, Ring], FullCurl, 1.0);
    Y.addCurl(Pinky, NoCurl, 1.0);
    Y.addDirection(Pinky, DiagonalUpLeft, 0.8);
    Y.addCurl(Thumb, NoCurl, 1.0);
    Y.addDirection(Thumb, DiagonalUpRight, 0.8);

    // G: index + thumb point horizontally (like pointing a gun sideways)
    const G = new GestureDescription('G');
    G.addCurl(Index, NoCurl, 1.0);
    G.addDirection(Index, HorizontalRight, 1.0);
    setCurl(G, [Middle, Ring, Pinky], FullCurl, 1.0);
    G.addCurl(Thumb, NoCurl, 0.9);
    G.addDirection(Thumb, HorizontalRight, 0.8);

    // H: index + middle extended horizontally side by side
    const H = new GestureDescription('H');
    setCurl(H, [Index, Middle], NoCurl, 1.0);
    setDir(H,  [Index, Middle], HorizontalRight, 1.0);
    setCurl(H, [Ring, Pinky], FullCurl, 1.0);
    H.addCurl(Thumb, FullCurl, 0.8);

    // J: static shape is pinky pointing up, thumb folded (same hand as I but motion traces J)
    const J = new GestureDescription('J');
    setCurl(J, [Index, Middle, Ring], FullCurl, 1.0);
    J.addCurl(Pinky, NoCurl, 1.0);
    J.addDirection(Pinky, DiagonalUpLeft, 1.0);
    J.addCurl(Thumb, HalfCurl, 0.9);

    // M: three fingers (index, middle, ring) folded over thumb
    const M = new GestureDescription('M');
    setCurl(M, [Index, Middle, Ring], HalfCurl, 1.0);
    M.addCurl(Pinky, FullCurl, 0.9);
    M.addCurl(Thumb, HalfCurl, 0.9);

    // N: two fingers (index, middle) folded over thumb
    const N = new GestureDescription('N');
    setCurl(N, [Index, Middle], HalfCurl, 1.0);
    setCurl(N, [Ring, Pinky], FullCurl, 1.0);
    N.addCurl(Thumb, HalfCurl, 0.9);

    // P: index points diagonally down, thumb out — like K rotated down
    const P = new GestureDescription('P');
    P.addCurl(Index, NoCurl, 1.0);
    P.addDirection(Index, DiagonalUpRight, 0.8);
    P.addCurl(Middle, HalfCurl, 0.9);
    setCurl(P, [Ring, Pinky], FullCurl, 1.0);
    P.addCurl(Thumb, NoCurl, 0.8);
    P.addDirection(Thumb, HorizontalRight, 0.7);

    // Q: like G but pointing downward — index + thumb point down
    const Q = new GestureDescription('Q');
    Q.addCurl(Index, NoCurl, 1.0);
    Q.addDirection(Index, DiagonalUpLeft, 0.8);
    setCurl(Q, [Middle, Ring, Pinky], FullCurl, 1.0);
    Q.addCurl(Thumb, NoCurl, 0.9);
    Q.addDirection(Thumb, HorizontalLeft, 0.8);

    // R: index + middle crossed (index over middle), pointing up
    const R = new GestureDescription('R');
    R.addCurl(Index, NoCurl, 1.0);
    R.addDirection(Index, VerticalUp, 1.0);
    R.addCurl(Middle, HalfCurl, 0.9);
    R.addDirection(Middle, VerticalUp, 0.8);
    setCurl(R, [Ring, Pinky], FullCurl, 1.0);
    R.addCurl(Thumb, FullCurl, 0.7);

    // T: thumb tucked between index and middle (index over thumb)
    const T = new GestureDescription('T');
    setCurl(T, [Index, Middle, Ring, Pinky], FullCurl, 1.0);
    T.addCurl(Thumb, HalfCurl, 1.0);
    T.addDirection(Thumb, DiagonalUpRight, 0.9);

    // Z: index finger extended, motion traces a Z shape (static shape: index pointing forward/diagonal)
    const Z = new GestureDescription('Z');
    Z.addCurl(Index, NoCurl, 1.0);
    Z.addDirection(Index, DiagonalUpRight, 1.0);
    setCurl(Z, [Middle, Ring, Pinky], FullCurl, 1.0);
    Z.addCurl(Thumb, HalfCurl, 0.9);

    // SPACE: open flat hand (all fingers up, thumb out)
    const SPACE = new GestureDescription('SPACE');
    setCurl(SPACE, [Index, Middle, Ring, Pinky], NoCurl, 1.0);
    setDir(SPACE,  [Index, Middle, Ring, Pinky], VerticalUp, 0.8);
    SPACE.addCurl(Thumb, NoCurl, 0.9);

    return new GestureEstimator([
        A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z, SPACE
    ]);
}

// ── Classifier ────────────────────────────────────────────────────────
let gestureEstimator = null;

function initFingerpose() {
    if (typeof fp === 'undefined') {
        console.error('Fingerpose library not loaded. Ensure the CDN script is in index.html.');
        window.showToast('Fingerpose not loaded — check console', 'error');
        return false;
    }
    try {
        gestureEstimator = buildASLGestures();
        console.log('Fingerpose gesture estimator ready with 27 gestures (A–Z + SPACE)');
        return true;
    } catch(e) {
        console.error('Fingerpose init failed:', e);
        return false;
    }
}

function classifyASL(landmarks) {
    if (!landmarks || landmarks.length < 21) return { letter: null, confidence: 0 };
    if (!gestureEstimator && !initFingerpose()) return { letter: null, confidence: 0 };

    // Convert MediaPipe normalised {x,y,z} → pixel-space [[x,y,z]] for fingerpose
    const keypoints = landmarks.map(lm => [lm.x * 640, lm.y * 480, lm.z * 640]);

    // minScore threshold: 7 out of 10 (~70% match)
    const result = gestureEstimator.estimate(keypoints, 7);

    if (!result.gestures || result.gestures.length === 0)
        return { letter: null, confidence: 0 };

    // Best-scoring gesture wins
    const best = result.gestures.reduce((a, b) => a.score > b.score ? a : b);
    return { letter: best.name, confidence: Math.min(best.score / 10, 1.0) };
}

// ── Hand Drawing ──────────────────────────────────────────────────────
const CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],
    [9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],[0,17]
];

function drawHand(ctx, L, w, h, show) {
    if (!show) return;
    ctx.strokeStyle = 'rgba(94,234,212,0.75)';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    for (const [a,b] of CONNECTIONS) {
        ctx.beginPath();
        ctx.moveTo(L[a].x*w, L[a].y*h);
        ctx.lineTo(L[b].x*w, L[b].y*h);
        ctx.stroke();
    }
    L.forEach((lm, i) => {
        const isTip   = [4,8,12,16,20].includes(i);
        const isWrist = i === 0;
        ctx.beginPath();
        ctx.arc(lm.x*w, lm.y*h, isTip ? 7 : isWrist ? 5 : 3.5, 0, Math.PI*2);
        ctx.fillStyle = isTip ? '#5eead4' : isWrist ? '#38bdf8' : 'rgba(255,255,255,0.65)';
        if (isTip) { ctx.shadowColor = '#5eead4'; ctx.shadowBlur = 8; }
        ctx.fill();
        ctx.shadowBlur = 0;
    });
}

// ── Camera & MediaPipe ────────────────────────────────────────────────
let hands         = null;
let cameraActive  = false;
let showLandmarks = true;

let gestureHoldStart = null;
let lastGesture      = null;
let gestureAdded     = false;

const video  = document.getElementById('input-video');
const canvas = document.getElementById('output-canvas');
const ctx    = canvas?.getContext('2d');

function updateGestureUI(letter, confidence) {
    const letterEl = document.getElementById('detected-letter');
    const bar      = document.getElementById('confidence-bar');
    const hint     = document.getElementById('current-gesture');
    if (letterEl) letterEl.textContent = letter || '—';
    if (bar)      bar.style.width = (letter ? Math.round(confidence*100) : 0) + '%';
    if (hint)     hint.textContent = letter
        ? `${letter} — ${Math.round(confidence*100)}% confidence`
        : 'Waiting for gesture…';
}

async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
        window.showToast('Camera not supported in this browser', 'error');
        return;
    }
    window.setStatus('detecting', 'Loading MediaPipe…');
    if (!gestureEstimator) initFingerpose();

    try {
        hands = new Hands({
            locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        hands.setOptions({
            maxNumHands: 1, modelComplexity: 1,
            minDetectionConfidence: 0.7, minTrackingConfidence: 0.6,
        });
        hands.onResults(onHandResults);

        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: 'user' }
        });
        video.srcObject = stream;
        await video.play();

        canvas.width  = video.videoWidth  || 640;
        canvas.height = video.videoHeight || 480;

        cameraActive = true;
        document.getElementById('camera-placeholder').style.display = 'none';
        window.setStatus('detecting', 'Camera Active');
        window.showToast('Camera started ✓', 'success');
        processFrame();
    } catch(err) {
        console.error(err);
        window.setStatus('error', 'Camera Error');
        window.showToast('Camera access denied — check permissions', 'error');
    }
}

function stopCamera() {
    video?.srcObject?.getTracks().forEach(t => t.stop());
    if (video) video.srcObject = null;
    cameraActive = false;
    document.getElementById('camera-placeholder').style.display = 'flex';
    window.setStatus('', 'Camera Off');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    document.getElementById('hand-badge').style.display = 'none';
}

async function processFrame() {
    if (!cameraActive || !hands) return;
    if (video.readyState >= 2) await hands.send({ image: video });
    window.tickFps?.();
    requestAnimationFrame(processFrame);
}

function onHandResults(results) {
    if (!ctx || !canvas) return;
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    const handBadge = document.getElementById('hand-badge');

    if (results.multiHandLandmarks?.length > 0) {
        const L = results.multiHandLandmarks[0];
        window.setStatus('detecting', 'Hand Detected');
        if (handBadge) handBadge.style.display = 'flex';

        ctx.save();
        ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
        drawHand(ctx, L, canvas.width, canvas.height, showLandmarks);
        ctx.restore();

        const { letter, confidence } = classifyASL(L);
        const pct = Math.round(confidence * 100);
        updateGestureUI(letter, confidence);

        if (letter && pct >= confThreshold) {
            const now = Date.now();
            if (letter !== lastGesture) {
                lastGesture = letter; gestureHoldStart = now; gestureAdded = false; setRingProgress(0);
            } else {
                const elapsed  = now - gestureHoldStart;
                const progress = Math.min((elapsed / holdDuration) * 100, 100);
                setRingProgress(progress);

                if (progress >= 100 && !gestureAdded) {
                    gestureAdded = true;
                    builder.append(letter);
                    window.playCommitSound?.();

                    const badge = document.getElementById('gesture-badge');
                    if (badge) {
                        badge.style.background = 'rgba(94,234,212,0.25)';
                        setTimeout(() => badge.style.background = '', 350);
                    }
                    window.showToast(`+ ${letter}`, 'success');

                    setTimeout(() => {
                        lastGesture = null; gestureHoldStart = null; gestureAdded = false; setRingProgress(0);
                    }, 700);
                }
            }
        } else {
            lastGesture = null; gestureHoldStart = null; gestureAdded = false; setRingProgress(0);
        }
    } else {
        window.setStatus('ready', 'Camera Active');
        if (handBadge) handBadge.style.display = 'none';
        updateGestureUI(null, 0);
        lastGesture = null; gestureHoldStart = null; setRingProgress(0);
    }
}

// ── Camera Controls ───────────────────────────────────────────────────
document.getElementById('start-camera-btn')?.addEventListener('click', startCamera);
document.getElementById('toggle-camera')?.addEventListener('click', () => cameraActive ? stopCamera() : startCamera());
document.getElementById('toggle-landmarks')?.addEventListener('click', function() {
    showLandmarks = !showLandmarks;
    this.style.color   = showLandmarks ? '' : 'var(--text-muted)';
    this.style.opacity = showLandmarks ? '1' : '0.4';
    window.showToast(`Landmarks ${showLandmarks ? 'on' : 'off'}`, 'info');
});

document.getElementById('fullscreen-btn')?.addEventListener('click', () => {
    const container = document.getElementById('camera-container');
    if (!container) return;
    if (!document.fullscreenElement) container.requestFullscreen?.();
    else document.exitFullscreen?.();
});

// ── Keyboard Fallback ─────────────────────────────────────────────────
let kbdEnabled = true;

document.getElementById('kbd-toggle')?.addEventListener('click', function() {
    kbdEnabled = !kbdEnabled;
    const body = document.querySelector('.keyboard-body');
    if (body) body.style.opacity = kbdEnabled ? '1' : '0.35';
    this.classList.toggle('toggle-active', kbdEnabled);
    window.showToast(`Keyboard ${kbdEnabled ? 'enabled' : 'disabled'}`, 'info');
});

document.querySelectorAll('.key').forEach(key => {
    key.addEventListener('click', () => {
        if (!kbdEnabled) return;
        const char   = key.dataset.char;
        const action = key.dataset.action;
        if (char)                   { builder.append(char); }
        else if (action === 'space')     { builder.append('SPACE'); }
        else if (action === 'backspace') { builder.backspace(); }
    });
});

document.addEventListener('keydown', e => {
    if (!kbdEnabled) return;
    if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
    const key = e.key;
    if (key.length === 1 && !e.ctrlKey && !e.metaKey) {
        builder.append(key.toUpperCase());
    } else if (key === 'Backspace') {
        builder.backspace(); e.preventDefault();
    } else if (key === ' ') {
        builder.append('SPACE'); e.preventDefault();
    } else if (key === 'Enter') {
        const txt = builder.get().trim();
        if (txt) { window.speakText(txt); window.addHistoryEntry(txt, 'spoken'); }
        e.preventDefault();
    }
});

window.setStatus('ready', 'Ready');
