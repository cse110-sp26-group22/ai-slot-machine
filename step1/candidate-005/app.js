// Token Slots — The AI Casino
// Burn tokens faster than a 1M-context request

'use strict';

/* =============================================
   SYMBOL DEFINITIONS
   payout = multiplier for 3-of-a-kind
   ============================================= */
const SYMBOLS = [
    { emoji: '💬', name: 'Prompt',        weight: 32, payout:  2 },
    { emoji: '🤖', name: 'Chatbot',       weight: 26, payout:  3 },
    { emoji: '🧠', name: 'Neural Net',    weight: 18, payout:  5 },
    { emoji: '💰', name: 'Token Bag',     weight: 12, payout:  8 },
    { emoji: '🔥', name: 'GPU Meltdown',  weight:  6, payout: 15 },
    { emoji: '💸', name: 'VC Funding',    weight:  4, payout: 25 },
    { emoji: '⚡', name: 'AGI Moment',    weight:  2, payout: 50 },
    { emoji: '🃏', name: 'Hallucination', weight:  4, payout:  0, isWild: true },
];

const TOTAL_WEIGHT = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);

/* =============================================
   GAME CONSTANTS
   ============================================= */
const BET_MIN      = 5;
const BET_MAX      = 100;
const BET_STEP     = 5;
const START_TOKENS = 1000;
const REFILL_AMT   = 500;

const SPIN_DURATIONS = [1100, 1550, 2000]; // ms per reel before stopping

/* =============================================
   MESSAGES
   ============================================= */
const MSG_WIN = [
    'Your model has been validated by hallucinated peer review! 🎉',
    'Token injection successful. The loss function is satisfied.',
    'RLHF says: you deserve this. (RLHF is biased.)',
    'GPT-5 predicted you\'d win. It confidently made that up.',
    'Emergent behavior detected: winning.',
    'Reward signal maximized. Your agent is pleased.',
    'Checkpoint saved. Payout written to disk.',
];

const MSG_BIG = [
    '🚀 AGI HAS BEEN ACHIEVED! (Just kidding. Take your tokens.)',
    '⚡ CONTEXT OVERFLOW — your winnings exceed expectations!',
    '💥 THE SINGULARITY HAS ARRIVED... in your wallet.',
    '🧠 EMERGENT BEHAVIOR: unexpected profit detected!',
    '🏆 MODEL COLLAPSE — but in YOUR favor for once!',
];

const MSG_LOSE = [
    'Your tokens have been consumed by the context window. 💀',
    'Error 404: Luck not found.',
    'The attention mechanism was not attending to you.',
    'Negative reward. Model updated. You lost.',
    'Better prompt engineering might have helped.',
    'Gradient descent into poverty: epoch complete.',
    'This spin has been flagged as a hallucination.',
    'Your ROI has been deprecated.',
    'Fine-tuning on failure: learning rate too high.',
    'Inference ran. Output: nothing. Billed anyway.',
    'Token budget exceeded. Results: none.',
    'Confidence: 99.8% you would lose. We were right.',
];

const MSG_WILD = [
    '🃏 HALLUCINATION! The model made something up and it worked!',
    '🃏 AI confidently stated the wrong answer and won anyway!',
    '🃏 Wild card! 100% confident. 50% accurate. 100% paid.',
    '🃏 The hallucination turned out to be real this time!',
];

/* =============================================
   GAME STATE
   ============================================= */
let balance   = START_TOKENS;
let bet       = 10;
let spinning  = false;
let stats     = { spins: 0, wins: 0, best: 0, burned: 0 };

/* =============================================
   AUDIO (Web Audio API)
   ============================================= */
let audioCtx = null;

function getAudio() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (_) { return null; }
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function tone(freq, dur, type = 'sine', vol = 0.12, startDelay = 0) {
    const ctx = getAudio();
    if (!ctx) return;
    try {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startDelay);
        gain.gain.setValueAtTime(vol, ctx.currentTime + startDelay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + dur);
        osc.start(ctx.currentTime + startDelay);
        osc.stop(ctx.currentTime + startDelay + dur + 0.01);
    } catch (_) {}
}

function playClick() {
    tone(180 + Math.random() * 120, 0.04, 'square', 0.06);
}

function playStop(reelIndex) {
    tone(220 + reelIndex * 80, 0.1, 'sine', 0.1);
}

function playWin(multiplier) {
    if (multiplier >= 25) {
        // Fanfare
        const notes = [261, 329, 392, 523, 659, 784];
        notes.forEach((n, i) => tone(n, 0.25, 'sine', 0.18, i * 0.08));
    } else {
        // Simple ascending
        [392, 523, 659].forEach((n, i) => tone(n, 0.18, 'sine', 0.12, i * 0.09));
    }
}

function playLose() {
    tone(160, 0.28, 'sawtooth', 0.09);
    tone(110, 0.35, 'sawtooth', 0.07, 0.22);
}

function playRefill() {
    [523, 659, 784, 1046].forEach((n, i) => tone(n, 0.2, 'triangle', 0.12, i * 0.07));
}

/* =============================================
   WEIGHTED RANDOM SYMBOL
   ============================================= */
function pickSymbol() {
    let r = Math.random() * TOTAL_WEIGHT;
    for (const sym of SYMBOLS) {
        r -= sym.weight;
        if (r <= 0) return sym;
    }
    return SYMBOLS[0];
}

/* =============================================
   REEL DISPLAY
   ============================================= */
const reelEls = [
    document.getElementById('reel-0'),
    document.getElementById('reel-1'),
    document.getElementById('reel-2'),
];

function setCell(reelEl, pos, sym) {
    const cell = reelEl.querySelector(`.cell-${pos}`);
    cell.textContent = sym.emoji;
    cell.title = sym.name;
}

function setReel(idx, top, mid, bot) {
    setCell(reelEls[idx], 'top', top);
    setCell(reelEls[idx], 'mid', mid);
    setCell(reelEls[idx], 'bot', bot);
}

function initReels() {
    for (let i = 0; i < 3; i++) {
        setReel(i, pickSymbol(), pickSymbol(), pickSymbol());
    }
}

/* =============================================
   SPIN ANIMATION
   ============================================= */
class ReelSpin {
    constructor(idx, result, onStop) {
        this.idx      = idx;
        this.result   = result;
        this.onStop   = onStop;
        this.timer    = null;
        this.clickCt  = 0;
    }

    start(duration) {
        reelEls[this.idx].classList.add('spinning');
        this.timer = setInterval(() => {
            setReel(this.idx, pickSymbol(), pickSymbol(), pickSymbol());
            this.clickCt++;
            if (this.clickCt % 3 === 0) playClick();
        }, 75);
        setTimeout(() => this._stop(), duration);
    }

    _stop() {
        clearInterval(this.timer);
        reelEls[this.idx].classList.remove('spinning');
        // Set final display: random top, result in mid, random bot
        setReel(this.idx, pickSymbol(), this.result, pickSymbol());
        // Bounce
        reelEls[this.idx].classList.add('land');
        reelEls[this.idx].addEventListener('animationend', () => {
            reelEls[this.idx].classList.remove('land');
        }, { once: true });
        playStop(this.idx);
        if (this.onStop) this.onStop();
    }
}

/* =============================================
   WIN CALCULATION
   ============================================= */
function calcWin(results) {
    const wilds = results.filter(s => s.isWild);
    const reals = results.filter(s => !s.isWild);
    let matchSym = null;
    let hadWild  = wilds.length > 0;

    if (wilds.length === 3) {
        // Triple wild = treat as AGI (best payout)
        matchSym = SYMBOLS.find(s => s.name === 'AGI Moment');
        return { kind: '3x', sym: matchSym, mult: matchSym.payout, hadWild };
    }

    if (wilds.length === 2) {
        // 2 wilds + 1 real → match on real symbol
        matchSym = reals[0];
        return { kind: '3x', sym: matchSym, mult: matchSym.payout, hadWild };
    }

    if (wilds.length === 1) {
        // 1 wild + 2 reals → match only if both reals are same
        if (reals[0].emoji === reals[1].emoji) {
            matchSym = reals[0];
            return { kind: '3x', sym: matchSym, mult: matchSym.payout, hadWild };
        }
        return null; // no win even with wild
    }

    // No wilds
    const [a, b, c] = results;
    if (a.emoji === b.emoji && b.emoji === c.emoji) {
        return { kind: '3x', sym: a, mult: a.payout, hadWild: false };
    }

    // Two of a kind
    for (const sym of results) {
        const cnt = results.filter(r => r.emoji === sym.emoji).length;
        if (cnt === 2) {
            const m = Math.max(1, Math.round(sym.payout * 0.15));
            return { kind: '2x', sym, mult: m, hadWild: false };
        }
    }

    return null;
}

/* =============================================
   CONFETTI
   ============================================= */
function showConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const colors = ['#00ff88','#4499ff','#ff3388','#ffcc00','#aa44ff','#ff8800'];
    const particles = Array.from({ length: 100 }, () => ({
        x:    Math.random() * canvas.width,
        y:    -16,
        vx:   (Math.random() - 0.5) * 5,
        vy:   2 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        w:    6 + Math.random() * 9,
        h:    4 + Math.random() * 4,
        rot:  Math.random() * Math.PI * 2,
        rv:   (Math.random() - 0.5) * 0.2,
    }));

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.12;
            p.rot += p.rv;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, 1 - frame / 110);
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        }
        frame++;
        if (frame < 130) requestAnimationFrame(draw);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    draw();
}

/* =============================================
   WIN POPUP
   ============================================= */
function showWinPopup(amount) {
    const el = document.createElement('div');
    el.className = 'win-popup';
    el.textContent = `+${amount} TKN`;
    // Position near the machine
    const machine = document.querySelector('.machine-frame');
    const rect = machine.getBoundingClientRect();
    el.style.left = `${rect.left + rect.width / 2 - 60}px`;
    el.style.top  = `${rect.top + rect.height / 2}px`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
}

/* =============================================
   UI HELPERS
   ============================================= */
function updateBalance(flashType) {
    const el = document.getElementById('balance');
    el.textContent = balance.toLocaleString();
    if (flashType) {
        el.classList.remove('flash-win', 'flash-lose');
        // Force reflow
        void el.offsetWidth;
        el.classList.add(flashType === 'win' ? 'flash-win' : 'flash-lose');
        el.addEventListener('animationend', () => {
            el.classList.remove('flash-win', 'flash-lose');
        }, { once: true });
    }
}

function updateBetDisplay() {
    document.getElementById('bet-value').textContent = bet;
    document.getElementById('spin-cost').textContent = `−${bet} TKN`;
}

function updateStats() {
    document.getElementById('stat-spins').textContent  = stats.spins;
    document.getElementById('stat-wins').textContent   = stats.wins;
    document.getElementById('stat-best').textContent   = stats.best;
    document.getElementById('stat-burned').textContent = stats.burned;
}

function setMessage(text, type = 'msg-idle') {
    const box = document.getElementById('message-box');
    const msg = document.getElementById('message');
    box.className = `message-box ${type}`;
    msg.textContent = text;
}

function rand(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/* =============================================
   SPIN LOGIC
   ============================================= */
function doSpin() {
    if (spinning) return;

    // Check balance
    if (balance < bet) {
        setMessage('Not enough tokens! Emergency refill incoming...', 'msg-refill');
        setTimeout(refillTokens, 800);
        return;
    }

    spinning = true;
    balance -= bet;
    stats.spins++;
    stats.burned += bet;
    updateBalance('lose');
    updateStats();

    document.getElementById('spin-btn').disabled = true;
    setMessage('Running inference... please hold... ⏳', 'msg-spin');

    // Clear previous win highlights
    reelEls.forEach(r => r.classList.remove('winning'));

    // Pick results now (pre-determined, casino-style)
    const results = [pickSymbol(), pickSymbol(), pickSymbol()];

    let stopped = 0;
    for (let i = 0; i < 3; i++) {
        const spin = new ReelSpin(i, results[i], () => {
            stopped++;
            if (stopped === 3) resolveOutcome(results);
        });
        spin.start(SPIN_DURATIONS[i]);
    }
}

function resolveOutcome(results) {
    const win = calcWin(results);

    if (win) {
        const payout = bet * win.mult;
        balance += payout;
        stats.wins++;
        if (payout > stats.best) stats.best = payout;

        updateBalance('win');
        updateStats();
        reelEls.forEach(r => r.classList.add('winning'));

        let msg, type;
        if (win.hadWild) {
            msg  = rand(MSG_WILD);
            type = win.mult >= 15 ? 'msg-big' : 'msg-win';
        } else if (win.mult >= 25) {
            msg  = rand(MSG_BIG);
            type = 'msg-big';
        } else {
            msg  = rand(MSG_WIN);
            type = 'msg-win';
        }

        const kindStr = win.kind === '3x'
            ? `${win.sym.emoji}${win.sym.emoji}${win.sym.emoji} ${win.sym.name} — ${win.mult}× — +${payout} TKN`
            : `${win.sym.emoji}${win.sym.emoji} Pair of ${win.sym.name} — +${payout} TKN`;
        setMessage(`${msg}\n${kindStr}`, type);

        playWin(win.mult);
        showWinPopup(payout);

        if (win.mult >= 25) showConfetti();

        setTimeout(() => reelEls.forEach(r => r.classList.remove('winning')), 2500);

    } else {
        setMessage(rand(MSG_LOSE), 'msg-lose');
        playLose();
    }

    // Auto-refill check
    if (balance < BET_MIN) {
        setTimeout(refillTokens, 2200);
    }

    setTimeout(() => {
        document.getElementById('spin-btn').disabled = false;
        spinning = false;
    }, 600);
}

function refillTokens() {
    balance += REFILL_AMT;
    updateBalance('win');
    setMessage(
        `☠️ Bankrupt! Emergency token injection: +${REFILL_AMT} TKN` +
        ` (Your Series B investors are not happy.)`,
        'msg-refill'
    );
    playRefill();
}

/* =============================================
   PAYTABLE
   ============================================= */
function buildPaytable() {
    const grid = document.getElementById('paytable-grid');
    const sorted = [...SYMBOLS].sort((a, b) => b.payout - a.payout);
    for (const sym of sorted) {
        const row = document.createElement('div');
        row.className = 'pt-row';
        const payStr = sym.isWild
            ? `<span class="pt-wild">WILD</span>`
            : `<span class="pt-pay">${sym.payout}×</span>`;
        row.innerHTML = `
            <span class="pt-emoji">${sym.emoji}</span>
            <span class="pt-name">${sym.name}</span>
            ${payStr}
        `;
        grid.appendChild(row);
    }
}

/* =============================================
   EVENT LISTENERS
   ============================================= */
document.getElementById('spin-btn').addEventListener('click', doSpin);

document.getElementById('bet-down').addEventListener('click', () => {
    if (bet > BET_MIN) {
        bet = Math.max(BET_MIN, bet - BET_STEP);
        updateBetDisplay();
    }
});

document.getElementById('bet-up').addEventListener('click', () => {
    if (bet < BET_MAX) {
        bet = Math.min(BET_MAX, bet + BET_STEP);
        updateBetDisplay();
    }
});

document.getElementById('max-bet-btn').addEventListener('click', () => {
    bet = BET_MAX;
    updateBetDisplay();
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.target.matches('button') && !spinning) {
        e.preventDefault();
        doSpin();
    }
});

/* =============================================
   INIT
   ============================================= */
buildPaytable();
initReels();
updateBalance();
updateBetDisplay();
updateStats();
