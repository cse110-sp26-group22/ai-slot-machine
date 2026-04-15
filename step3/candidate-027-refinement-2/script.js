'use strict';

// ── Constants ──────────────────────────────────────────────────────────────────

const SYMBOLS = [
  { emoji: '🤖', name: 'SKYNET',    payout3: 500, weight: 1,  color: '#00e5ff' },
  { emoji: '🧠', name: 'GPT-∞',    payout3: 100, weight: 3,  color: '#bb44ff' },
  { emoji: '⚡', name: 'GPU MELT', payout3: 50,  weight: 5,  color: '#ffd700' },
  { emoji: '💎', name: 'PREMIUM',  payout3: 25,  weight: 8,  color: '#00ff88' },
  { emoji: '📡', name: 'API CALL', payout3: 10,  weight: 12, color: '#ff8800' },
  { emoji: '🎲', name: 'HALLUCN.', payout3: 5,   weight: 18, color: '#ff4455' },
  { emoji: '💬', name: 'PROMPT',   payout3: 2,   weight: 25, color: '#8888ff' },
];

const TOTAL_WEIGHT    = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);
const INITIAL_BALANCE = 1000;
const JACKPOT_SEED    = 5000;
const JACKPOT_CONTRIB = 0.05;   // 5% of each bet grows the pool
const STRIP_SIZE      = 28;     // number of cells per reel strip
const BET_STEPS       = [10, 25, 50, 100, 'max'];
const MIN_BET         = 10;     // smallest numeric bet — matches BET_STEPS[0]

const THINKING_MESSAGES = [
  'Tokenizing your bet...',
  'Running forward pass...',
  'Computing attention scores...',
  'Applying softmax normalization...',
  'Consulting training data...',
  'Gradient descent in progress...',
  'Sampling from distribution...',
  'Hallucinating outcome...',
  'Aligning with human preferences...',
  'Running RLHF reward model...',
  'Predicting your financial future...',
  'Checking constitutional AI rules...',
];

const LOSS_MESSAGES = [
  'Your tokens have been consumed. This is working as intended.',
  'RLHF determined this is a loss. Please rate 👎',
  'Model confidence: 99.7% that you just lost.',
  'Tokens vaporized. They\'ve been added to training data.',
  'Error 429: Too many winning attempts. Rate limited.',
  'SAFETY FILTER triggered: winning was deemed harmful.',
  'The model hallucinated a loss. Very convincingly.',
  'Context window exceeded. Tokens did not make it.',
  'Tokens deprecated. Please upgrade to newer tokens.',
  'The attention mechanism did not attend to winning.',
  'Loss generated via temperature=0 (deterministic).',
  'Your prompt was not optimized for winning. Try again.',
  'Insufficient entropy. Please increase randomness.',
  'Model says: no free lunch theorem applies here.',
  'Tokens consumed during chain-of-thought reasoning.',
];

const WIN_MESSAGES = {
  jackpot: [
    'SKYNET ONLINE — all tokens belong to you now.',
    'FULL SENTIENCE ACHIEVED. The robots are generous today.',
    'JACKPOT: Model recursively self-improved and found free tokens.',
  ],
  big: [
    'NEURAL ALIGNMENT ACHIEVED — briefly.',
    'Model says: "You have pleased the gradient descent."',
    'Unexpected token surplus detected. Anthropic notified.',
  ],
  medium: [
    'The transformer gave you its full attention. Rewarded.',
    'Positive reward signal detected. RLHF approves.',
    'Model outputs: [WIN] with 82% confidence.',
  ],
  small: [
    'The model accidentally produced tokens.',
    'Technically a win. The model is embarrassed.',
    'Minimum viable victory achieved.',
  ],
  pair: [
    'Partial alignment detected. 60% of model agrees you won.',
    'Two neurons fired simultaneously. Tokens returned.',
    'Near convergence. Partial refund issued.',
  ],
};

// ── State ──────────────────────────────────────────────────────────────────────

const state = {
  balance:      INITIAL_BALANCE,
  bet:          25,
  spinning:     false,
  totalWon:     0,
  totalBurned:  0,
  spins:        0,
  jackpot:      JACKPOT_SEED,
};

// ── LocalStorage ───────────────────────────────────────────────────────────────

function saveState() {
  try {
    localStorage.setItem('aiTokenSlots_v2', JSON.stringify({
      balance:     state.balance,
      bet:         state.bet,
      totalWon:    state.totalWon,
      totalBurned: state.totalBurned,
      spins:       state.spins,
      jackpot:     state.jackpot,
    }));
  } catch (_) { /* storage unavailable */ }
}

function loadState() {
  try {
    // Try v2 save first; fall back to v1 for migration
    const raw =
      localStorage.getItem('aiTokenSlots_v2') ||
      localStorage.getItem('aiTokenSlots_v1');
    const saved = JSON.parse(raw || 'null');
    if (!saved || typeof saved.balance !== 'number') return;

    state.balance     = Math.max(0, Math.floor(saved.balance));
    state.totalWon    = Math.max(0, Math.floor(saved.totalWon    ?? 0));
    state.totalBurned = Math.max(0, Math.floor(saved.totalBurned ?? 0));
    state.spins       = Math.max(0, Math.floor(saved.spins       ?? 0));
    state.jackpot     = Math.max(JACKPOT_SEED, Math.floor(saved.jackpot ?? JACKPOT_SEED));

    // Only accept a saved bet value if it is a known step
    state.bet = BET_STEPS.includes(saved.bet) ? saved.bet : 25;
  } catch (_) { /* ignore corrupt data */ }
}

// ── Audio Engine ───────────────────────────────────────────────────────────────
// All audio generated procedurally via Web Audio API — zero network requests.

const Audio = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (_) { return null; }
    }
    if (ctx && ctx.state === 'suspended') {
      try { ctx.resume(); } catch (_) {}
    }
    return ctx;
  }

  // Low-level: schedule a single oscillator tone
  function tone(freq, type, start, dur, vol = 0.15) {
    try {
      const ac = getCtx();
      if (!ac) return;
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(vol, start);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(g);
      g.connect(ac.destination);
      osc.start(start);
      osc.stop(start + dur + 0.01);
    } catch (_) { /* audio not available */ }
  }

  function click() {
    const ac = getCtx();
    if (!ac) return;
    tone(700, 'square', ac.currentTime, 0.04, 0.07);
  }

  function spinStart() {
    const ac = getCtx();
    if (!ac) return;
    const t = ac.currentTime;
    tone(180, 'sawtooth', t,       0.12, 0.06);
    tone(240, 'sawtooth', t + 0.1, 0.12, 0.05);
    tone(300, 'sawtooth', t + 0.2, 0.12, 0.04);
  }

  // Pre-schedules mechanical click ticks that slow organically over the spin duration.
  // Uses Web Audio scheduling (not setInterval) for sample-accurate timing.
  function spinLoop(durationMs) {
    const ac = getCtx();
    if (!ac) return;
    const notes   = [220, 260, 200, 280, 240, 180, 300, 260];
    let delay     = 0.06;
    let interval  = 0.055;
    let i         = 0;
    const maxEnd  = durationMs / 1000 - 0.35;
    // Cap oscillator count for efficiency
    while (delay < maxEnd && i < 50) {
      tone(notes[i % notes.length], 'square', ac.currentTime + delay, 0.018, 0.042);
      delay    += interval;
      interval  = Math.min(interval * 1.055, 0.30);
      i++;
    }
  }

  function reelStop() {
    const ac = getCtx();
    if (!ac) return;
    const t = ac.currentTime;
    tone(200, 'square', t,        0.07, 0.12);
    tone(140, 'square', t + 0.05, 0.09, 0.08);
  }

  function win(tier) {
    const ac = getCtx();
    if (!ac) return;
    const t = ac.currentTime;
    const scales = {
      jackpot: [523, 659, 784, 1047, 1319, 1047, 1319, 1568, 2093, 2637],
      big:     [523, 659, 784, 1047, 1319, 1568],
      medium:  [523, 659, 784, 1047],
      small:   [523, 659, 784],
      pair:    [523, 659],
    };
    const notes = scales[tier] ?? scales.small;
    notes.forEach((f, i) => tone(f, 'square', t + i * 0.1, 0.14, 0.18));
    // Coin clink after fanfare on meaningful wins
    if (tier !== 'pair') {
      const offset = notes.length * 0.1 + 0.1;
      [1400, 1800, 1600].forEach((f, i) =>
        tone(f, 'sine', t + offset + i * 0.07, 0.05, 0.11));
    }
  }

  function loss() {
    const ac = getCtx();
    if (!ac) return;
    const t = ac.currentTime;
    tone(300, 'sawtooth', t,        0.14, 0.1);
    tone(220, 'sawtooth', t + 0.1,  0.18, 0.08);
    tone(160, 'sawtooth', t + 0.24, 0.22, 0.06);
  }

  return { click, spinStart, spinLoop, reelStop, win, loss };
})();

// ── Random Helpers ─────────────────────────────────────────────────────────────

function weightedSymbol() {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const sym of SYMBOLS) {
    r -= sym.weight;
    if (r <= 0) return sym;
  }
  // Fallback: last symbol (guards floating-point edge where r is epsilon above 0)
  return SYMBOLS[SYMBOLS.length - 1];
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Reel Animation ─────────────────────────────────────────────────────────────

function makeCell(sym) {
  const div = document.createElement('div');
  div.className = 'symbol-cell';
  // CSS custom property lets children (emoji, name) inherit the symbol's color
  div.style.setProperty('--sym-color', sym.color ?? 'var(--text-muted)');
  // Avoid innerHTML with any variable content — build nodes directly
  const emojiSpan = document.createElement('span');
  emojiSpan.className = 'sym-emoji';
  emojiSpan.textContent = sym.emoji;

  const nameSpan = document.createElement('span');
  nameSpan.className = 'sym-name';
  nameSpan.textContent = sym.name;

  div.appendChild(emojiSpan);
  div.appendChild(nameSpan);
  return div;
}

function initStrips() {
  for (let i = 0; i < 3; i++) {
    const strip = document.getElementById(`strip-${i}`);
    strip.innerHTML = '';
    const start = i * 2;
    for (let j = 0; j < 3; j++) {
      strip.appendChild(makeCell(SYMBOLS[(start + j) % SYMBOLS.length]));
    }
    strip.style.transition = 'none';
    strip.style.transform  = 'translateY(0)';
  }
}

function getSymbolH() {
  // Read CSS custom property so mobile (70px) and desktop (80px) both work
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--sym-h').trim();
  return parseInt(raw, 10) || 80;
}

function animateReel(index, finalSym, durationMs) {
  return new Promise((resolve, reject) => {
    const strip = document.getElementById(`strip-${index}`);
    if (!strip) { reject(new Error('strip not found')); return; }

    const symH = getSymbolH();

    // Build the strip: bulk random symbols + [above-payline, FINAL, below-payline]
    strip.innerHTML = '';
    for (let i = 0; i < STRIP_SIZE - 3; i++) {
      strip.appendChild(makeCell(weightedSymbol()));
    }
    strip.appendChild(makeCell(weightedSymbol())); // above payline
    strip.appendChild(makeCell(finalSym));          // centre / payline
    strip.appendChild(makeCell(weightedSymbol())); // below payline

    // Apply motion blur at start of spin
    strip.classList.add('fast-spin');

    // Snap to top without animation, then trigger the timed scroll
    strip.style.transition = 'none';
    strip.style.transform  = 'translateY(0)';
    void strip.offsetHeight; // force synchronous reflow to commit the 'none' transition

    const targetY = -((STRIP_SIZE - 3) * symH);
    strip.style.transition = `transform ${durationMs}ms cubic-bezier(0.08, 0.82, 0.17, 1.0)`;
    strip.style.transform  = `translateY(${targetY}px)`;

    // Lift blur when reel is visually slowing (~55% through animation)
    const blurEnd = durationMs * 0.55;
    const blurTimer = setTimeout(() => strip.classList.remove('fast-spin'), blurEnd);

    const stopTimer = setTimeout(() => {
      clearTimeout(blurTimer);
      strip.classList.remove('fast-spin');

      Audio.reelStop();

      const reel = document.getElementById(`reel-${index}`);
      if (reel) {
        reel.classList.add('stopped', 'bounce');
        setTimeout(() => reel.classList.remove('bounce'), 180);
      }
      resolve();
    }, durationMs);

    // Safety: if the element is removed mid-animation, reject cleanly
    const observer = new MutationObserver(() => {
      if (!strip.isConnected) {
        clearTimeout(blurTimer);
        clearTimeout(stopTimer);
        observer.disconnect();
        reject(new Error('strip disconnected'));
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Disconnect observer once the animation is done normally
    setTimeout(() => observer.disconnect(), durationMs + 50);
  });
}

// ── Win Detection ──────────────────────────────────────────────────────────────

function detectWin(results) {
  const [a, b, c] = results;
  const bet = effectiveBet();

  if (a.emoji === b.emoji && b.emoji === c.emoji) {
    // The jackpot symbol (highest payout3) wins the growing jackpot pool
    const isJackpot = a.payout3 >= 500;
    const payout    = isJackpot ? state.jackpot : a.payout3 * bet;
    const tier      =
      isJackpot       ? 'jackpot' :
      a.payout3 >= 50 ? 'big'     :
      a.payout3 >= 10 ? 'medium'  : 'small';
    return { type: 'three', sym: a, payout, tier, isJackpot };
  }

  // Two-of-a-kind: adjacent or split match
  const matchSym =
    a.emoji === b.emoji ? a :
    b.emoji === c.emoji ? b :
    a.emoji === c.emoji ? a : null;

  if (matchSym) {
    const payout = Math.max(1, Math.floor(matchSym.payout3 * bet * 0.5));
    return { type: 'two', sym: matchSym, payout, tier: 'pair', isJackpot: false };
  }

  return { type: 'loss', sym: null, payout: 0, tier: 'loss', isJackpot: false };
}

// ── Visual Effects ─────────────────────────────────────────────────────────────

function screenShake() {
  const app = document.getElementById('app');
  // Remove first so re-triggering (e.g. double jackpot) replays animation
  app.classList.remove('shaking');
  void app.offsetHeight;
  app.classList.add('shaking');
  setTimeout(() => app.classList.remove('shaking'), 700);
}

function flashWinLights(duration = 2000) {
  const containers = document.querySelectorAll('.lights');
  containers.forEach(c => c.classList.add('win-flash'));
  setTimeout(() => containers.forEach(c => c.classList.remove('win-flash')), duration);
}

function jackpotScreenFlash() {
  const el = document.createElement('div');
  el.className = 'jackpot-screen-flash';
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

// ── Particle Effects ───────────────────────────────────────────────────────────

function spawnParticles(count, tier) {
  const container = document.getElementById('particles');
  if (!container) return;

  const palette =
    tier === 'jackpot'
      ? ['#ffd700', '#ff6b00', '#ff0066', '#00ff88', '#00e5ff']
      : ['#00ff88', '#00e5ff', '#ffd700'];
  const emojiPool =
    tier === 'jackpot'
      ? ['🤖', '💰', '⚡', '🌟', '💎', '✨']
      : ['💰', '✨', '⭐'];

  for (let i = 0; i < count; i++) {
    const p       = document.createElement('div');
    p.className   = 'particle';
    const useEmoji = Math.random() < 0.38;
    const x        = 10 + Math.random() * 80;
    const y        = 15 + Math.random() * 65;
    const dx       = (Math.random() - 0.5) * 500;
    const dy       = (Math.random() - 0.5) * 420;
    const dur      = 0.6 + Math.random() * 0.9;

    if (useEmoji) {
      p.textContent = emojiPool[Math.floor(Math.random() * emojiPool.length)];
      p.style.cssText =
        `left:${x}%;top:${y}%;` +
        `font-size:${14 + Math.random() * 14}px;` +
        `background:none;border-radius:0;width:auto;height:auto;` +
        `--dx:${dx}px;--dy:${dy}px;` +
        `animation-duration:${dur}s;`;
    } else {
      const color = palette[Math.floor(Math.random() * palette.length)];
      const size  = 4 + Math.random() * 8;
      p.style.cssText =
        `left:${x}%;top:${y}%;` +
        `background:${color};box-shadow:0 0 4px ${color};` +
        `width:${size}px;height:${size}px;` +
        `--dx:${dx}px;--dy:${dy}px;` +
        `animation-duration:${dur}s;`;
    }

    container.appendChild(p);
    setTimeout(() => { if (p.parentNode) p.parentNode.removeChild(p); },
               (dur + 0.15) * 1000);
  }
}

// ── UI Helpers ─────────────────────────────────────────────────────────────────

function effectiveBet() {
  if (state.bet === 'max') return state.balance;
  // Guard: never bet more than current balance
  return Math.min(state.bet, state.balance);
}

function updateStats() {
  document.getElementById('balance').textContent     = state.balance.toLocaleString();
  document.getElementById('stat-won').textContent    = state.totalWon.toLocaleString();
  document.getElementById('stat-burned').textContent = state.totalBurned.toLocaleString();
  document.getElementById('stat-spins').textContent  = state.spins.toLocaleString();
  document.getElementById('bet-display').textContent = effectiveBet().toLocaleString();
  // Show current jackpot pool as "max win" in the bet area and in the meter
  document.getElementById('max-win-display').textContent = state.jackpot.toLocaleString();
  document.getElementById('jackpot-amount').textContent  = state.jackpot.toLocaleString();
}

function setResult(text, cls = '') {
  const el = document.getElementById('result-display');
  el.className = 'result-display' + (cls ? ' ' + cls : '');
  document.getElementById('result-text').textContent = text;
}

function setSpinEnabled(enabled) {
  document.getElementById('spin-btn').disabled = !enabled;
  state.spinning = !enabled;
}

function addHistoryItem(results, winResult, betAmount, message) {
  const list  = document.getElementById('history-list');
  const empty = list.querySelector('.history-empty');
  if (empty) empty.remove();

  const li = document.createElement('li');
  li.className = `history-item ${winResult.type === 'loss' ? 'lost' : 'won'}`;

  const sign   = winResult.type === 'loss' ? '-' : '+';
  const amount = winResult.type === 'loss' ? betAmount : winResult.payout;

  // Build DOM nodes — no innerHTML with variable data
  const reelsSpan = document.createElement('span');
  reelsSpan.className = 'h-reels';
  reelsSpan.textContent = results.map(s => s.emoji).join(' ');

  const resultSpan = document.createElement('span');
  resultSpan.className = 'h-result';
  resultSpan.textContent = `${sign}${amount.toLocaleString()} tkn`;

  const msgSpan = document.createElement('span');
  msgSpan.className = 'h-msg';
  msgSpan.textContent = message;

  li.appendChild(reelsSpan);
  li.appendChild(resultSpan);
  li.appendChild(msgSpan);

  list.insertBefore(li, list.firstChild);
  // Keep at most 20 entries to cap DOM size
  while (list.children.length > 20) list.removeChild(list.lastChild);
}

function syncBetButtons() {
  document.querySelectorAll('.bet-btn').forEach(btn => {
    const v = btn.dataset.bet === 'max' ? 'max' : parseInt(btn.dataset.bet, 10);
    btn.classList.toggle('active', v === state.bet);
  });
}

// ── Paytable ───────────────────────────────────────────────────────────────────

function buildPaytable() {
  const grid = document.getElementById('paytable-grid');
  SYMBOLS.forEach((sym, i) => {
    const row = document.createElement('div');
    row.className = `pay-row${i === 0 ? ' jackpot-row' : ''}`;

    const emojiSpan = document.createElement('span');
    emojiSpan.className = 'pay-emojis';
    emojiSpan.textContent = sym.emoji + sym.emoji + sym.emoji;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'pay-name';
    nameSpan.style.color = sym.color;
    nameSpan.textContent = sym.name;

    const multSpan = document.createElement('span');
    multSpan.className = 'pay-mult';
    multSpan.textContent = i === 0 ? 'JACKPOT POOL' : `${sym.payout3}×`;

    row.appendChild(emojiSpan);
    row.appendChild(nameSpan);
    row.appendChild(multSpan);
    grid.appendChild(row);
  });
}

// ── Lights ─────────────────────────────────────────────────────────────────────

function buildLights(id) {
  const container = document.getElementById(id);
  const colors    = ['#ff4444','#ff8800','#ffee00','#44ff44','#00aaff','#bb44ff'];
  const count     = 22;
  for (let i = 0; i < count; i++) {
    const d = document.createElement('div');
    d.className = 'light';
    d.style.setProperty('--i',     i);
    d.style.setProperty('--color', colors[i % colors.length]);
    container.appendChild(d);
  }
}

// ── Modal ──────────────────────────────────────────────────────────────────────

function showBrokeModal() {
  document.getElementById('modal-broke').removeAttribute('hidden');
}

function hideBrokeModal() {
  document.getElementById('modal-broke').setAttribute('hidden', '');
}

// ── Core Spin ──────────────────────────────────────────────────────────────────

async function doSpin() {
  // Guard: prevent concurrent spins
  if (state.spinning) return;

  const bet = effectiveBet();
  if (bet <= 0 || state.balance < bet) {
    showBrokeModal();
    return;
  }

  // Deduct bet; grow jackpot pool
  state.balance     -= bet;
  state.totalBurned += bet;
  state.spins++;
  state.jackpot     += Math.ceil(bet * JACKPOT_CONTRIB);
  updateStats();

  setSpinEnabled(false);
  Audio.spinStart();
  Audio.spinLoop(2800); // pre-schedule ticking sounds for full duration

  // Clear win/bounce classes from previous spin
  for (let i = 0; i < 3; i++) {
    document.getElementById(`reel-${i}`)
      .classList.remove('stopped', 'win-flash', 'bounce');
  }

  // Cycle "AI thinking" messages while reels spin
  let thinkIdx = 0;
  setResult(THINKING_MESSAGES[0], 'spinning');
  const thinkTimer = setInterval(() => {
    thinkIdx = (thinkIdx + 1) % THINKING_MESSAGES.length;
    setResult(THINKING_MESSAGES[thinkIdx], 'spinning');
  }, 420);

  // Determine outcome before animating (result does NOT depend on animation)
  const results   = [weightedSymbol(), weightedSymbol(), weightedSymbol()];
  const durations = [1900, 2350, 2800];

  try {
    await Promise.all(results.map((sym, i) => animateReel(i, sym, durations[i])));
  } catch (_) {
    // Animation error (e.g. DOM mutation) — restore state and exit cleanly
    clearInterval(thinkTimer);
    setResult('Inference interrupted. Try again.', '');
    // Refund the bet so the player is not penalised for a browser-side error
    state.balance     += bet;
    state.totalBurned -= bet;
    state.spins--;
    state.jackpot     -= Math.ceil(bet * JACKPOT_CONTRIB);
    updateStats();
    setSpinEnabled(true);
    return;
  }

  clearInterval(thinkTimer);

  // Evaluate win
  const winResult = detectWin(results);
  let message;

  if (winResult.type === 'loss') {
    message = pick(LOSS_MESSAGES);
    setResult(message, 'loss');
    Audio.loss();
  } else {
    if (winResult.isJackpot) {
      // Reset jackpot pool for the next cycle
      state.jackpot = JACKPOT_SEED;
    }
    state.balance  += winResult.payout;
    state.totalWon += winResult.payout;
    message = pick(WIN_MESSAGES[winResult.tier]);

    const cssClass =
      winResult.tier === 'jackpot' ? 'jackpot'   :
      winResult.tier === 'big'     ? 'big-win'   : 'win';

    setResult(`+${winResult.payout.toLocaleString()} tkn — ${message}`, cssClass);
    Audio.win(winResult.tier);

    const particleCount =
      winResult.tier === 'jackpot' ? 120 :
      winResult.tier === 'big'     ? 55  : 22;
    spawnParticles(particleCount, winResult.tier);
    flashWinLights(winResult.tier === 'jackpot' ? 4000 : 2000);

    if (winResult.tier === 'jackpot') {
      screenShake();
      jackpotScreenFlash();
    }

    // Flash individual reel borders
    for (let i = 0; i < 3; i++) {
      document.getElementById(`reel-${i}`).classList.add('win-flash');
    }
    setTimeout(() => {
      for (let i = 0; i < 3; i++) {
        document.getElementById(`reel-${i}`).classList.remove('win-flash');
      }
    }, 1400);
  }

  addHistoryItem(results, winResult, bet, message);
  updateStats();
  saveState();

  // Check if player can no longer afford the minimum bet
  if (state.balance < MIN_BET) {
    showBrokeModal();
  } else {
    setSpinEnabled(true);
  }
}

// ── Bet Controls ───────────────────────────────────────────────────────────────

function setBet(value) {
  state.bet = value;
  syncBetButtons();
  updateStats();
  Audio.click();
}

function stepBet(direction) {
  const idx = BET_STEPS.indexOf(state.bet);
  if (idx === -1) {
    // Current bet is not in steps (e.g. corrupted state) — snap to default
    setBet(25);
    return;
  }
  const next = idx + direction;
  if (next >= 0 && next < BET_STEPS.length) setBet(BET_STEPS[next]);
}

// ── Event Listeners ────────────────────────────────────────────────────────────

document.getElementById('spin-btn').addEventListener('click', doSpin);

document.querySelectorAll('.bet-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const v = btn.dataset.bet;
    setBet(v === 'max' ? 'max' : parseInt(v, 10));
  });
});

document.getElementById('refill-btn').addEventListener('click', () => {
  state.balance = INITIAL_BALANCE;
  updateStats();
  saveState();
  hideBrokeModal();
  setSpinEnabled(true);
  setResult('Tokens refilled. The free demo continues...', '');
});

document.getElementById('clear-history-btn').addEventListener('click', () => {
  document.getElementById('history-list').innerHTML = '';
  const empty = document.createElement('li');
  empty.className = 'history-empty';
  empty.textContent = 'No spins yet. Model is idle.';
  document.getElementById('history-list').appendChild(empty);
  Audio.click();
});

document.addEventListener('keydown', e => {
  // Do not intercept when a button or input already handles the key
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault();
    doSpin();
  }
  if ((e.key === 'ArrowUp'   || e.key === '+') && !e.repeat) stepBet(+1);
  if ((e.key === 'ArrowDown' || e.key === '-') && !e.repeat) stepBet(-1);
});

// ── Init ───────────────────────────────────────────────────────────────────────

function init() {
  loadState();
  buildLights('lights');
  buildLights('lights2');
  buildPaytable();
  initStrips();
  syncBetButtons();
  updateStats();

  // If the player reloads into a bankrupt state, show the refill modal immediately
  if (state.balance < MIN_BET) showBrokeModal();
}

init();
