'use strict';

// ── Constants ──────────────────────────────────────────────────────────────────

const SYMBOLS = [
  { emoji: '🤖', name: 'SKYNET',    payout3: 500, weight: 1  },
  { emoji: '🧠', name: 'GPT-∞',    payout3: 100, weight: 3  },
  { emoji: '⚡', name: 'GPU MELT', payout3: 50,  weight: 5  },
  { emoji: '💎', name: 'PREMIUM',  payout3: 25,  weight: 8  },
  { emoji: '📡', name: 'API CALL', payout3: 10,  weight: 12 },
  { emoji: '🎲', name: 'HALLUCN.', payout3: 5,   weight: 18 },
  { emoji: '💬', name: 'PROMPT',   payout3: 2,   weight: 25 },
];

const TOTAL_WEIGHT = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);

const INITIAL_BALANCE = 1000;
const STRIP_SIZE = 28;

const BET_STEPS = [10, 25, 50, 100, 'max'];

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
};

// ── LocalStorage ───────────────────────────────────────────────────────────────

function saveState() {
  try {
    localStorage.setItem('aiTokenSlots_v1', JSON.stringify({
      balance:     state.balance,
      bet:         state.bet,
      totalWon:    state.totalWon,
      totalBurned: state.totalBurned,
      spins:       state.spins,
    }));
  } catch (_) { /* storage unavailable */ }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem('aiTokenSlots_v1') || 'null');
    if (saved && typeof saved.balance === 'number') {
      state.balance     = saved.balance;
      state.bet         = saved.bet ?? 25;
      state.totalWon    = saved.totalWon    ?? 0;
      state.totalBurned = saved.totalBurned ?? 0;
      state.spins       = saved.spins       ?? 0;
    }
  } catch (_) { /* ignore */ }
}

// ── Audio Engine ───────────────────────────────────────────────────────────────

const Audio = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, type, start, dur, vol = 0.15) {
    try {
      const ac  = getCtx();
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(vol, start);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(g);
      g.connect(ac.destination);
      osc.start(start);
      osc.stop(start + dur);
    } catch (_) { /* audio not available */ }
  }

  function click() {
    const ac = getCtx();
    const t  = ac.currentTime;
    tone(700, 'square', t, 0.04, 0.07);
  }

  function spinStart() {
    const ac = getCtx();
    const t  = ac.currentTime;
    tone(180, 'sawtooth', t,       0.12, 0.06);
    tone(240, 'sawtooth', t + 0.1, 0.12, 0.05);
    tone(300, 'sawtooth', t + 0.2, 0.12, 0.04);
  }

  function reelStop() {
    const ac = getCtx();
    const t  = ac.currentTime;
    tone(200, 'square', t,       0.07, 0.12);
    tone(140, 'square', t + 0.05, 0.09, 0.08);
  }

  function win(tier) {
    const ac = getCtx();
    const t  = ac.currentTime;
    const scales = {
      jackpot: [523, 659, 784, 1047, 1319, 1047, 1319, 1568],
      big:     [523, 659, 784, 1047, 1319],
      medium:  [523, 659, 784, 1047],
      small:   [523, 659, 784],
      pair:    [523, 659],
    };
    const notes = scales[tier] ?? scales.small;
    notes.forEach((f, i) => tone(f, 'square', t + i * 0.1, 0.14, 0.18));
  }

  function loss() {
    const ac = getCtx();
    const t  = ac.currentTime;
    tone(300, 'sawtooth', t,       0.14, 0.1);
    tone(220, 'sawtooth', t + 0.1, 0.18, 0.08);
    tone(160, 'sawtooth', t + 0.24, 0.22, 0.06);
  }

  return { click, spinStart, reelStop, win, loss };
})();

// ── Random Helpers ─────────────────────────────────────────────────────────────

function weightedSymbol() {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const sym of SYMBOLS) {
    r -= sym.weight;
    if (r <= 0) return sym;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Reel Animation ─────────────────────────────────────────────────────────────

function makeCell(sym) {
  const div = document.createElement('div');
  div.className = 'symbol-cell';
  div.innerHTML =
    `<span class="sym-emoji">${sym.emoji}</span>` +
    `<span class="sym-name">${sym.name}</span>`;
  return div;
}

function initStrips() {
  for (let i = 0; i < 3; i++) {
    const strip = document.getElementById(`strip-${i}`);
    strip.innerHTML = '';
    // Idle display: 3 staggered symbols
    const start = i * 2;
    for (let j = 0; j < 3; j++) {
      strip.appendChild(makeCell(SYMBOLS[(start + j) % SYMBOLS.length]));
    }
    strip.style.transition = 'none';
    strip.style.transform  = 'translateY(0)';
  }
}

function getSymbolH() {
  // Read the CSS custom property so mobile (70px) and desktop (80px) both work
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--sym-h').trim();
  return parseInt(raw, 10) || 80;
}

function animateReel(index, finalSym, durationMs) {
  return new Promise(resolve => {
    const strip  = document.getElementById(`strip-${index}`);
    const symH   = getSymbolH();

    // Build strip: (STRIP_SIZE - 3) random symbols + context + final + context
    strip.innerHTML = '';
    for (let i = 0; i < STRIP_SIZE - 3; i++) {
      strip.appendChild(makeCell(weightedSymbol()));
    }
    strip.appendChild(makeCell(weightedSymbol())); // above payline
    strip.appendChild(makeCell(finalSym));          // payline (center)
    strip.appendChild(makeCell(weightedSymbol())); // below payline

    // Snap to top, then animate to bottom
    strip.style.transition = 'none';
    strip.style.transform  = 'translateY(0)';
    void strip.offsetHeight; // force reflow

    const targetY = -((STRIP_SIZE - 3) * symH);
    strip.style.transition = `transform ${durationMs}ms cubic-bezier(0.08, 0.82, 0.17, 1.0)`;
    strip.style.transform  = `translateY(${targetY}px)`;

    setTimeout(() => {
      Audio.reelStop();
      document.getElementById(`reel-${index}`).classList.add('stopped');
      resolve();
    }, durationMs);
  });
}

// ── Win Detection ──────────────────────────────────────────────────────────────

function detectWin(results) {
  const [a, b, c] = results;
  const bet = effectiveBet();

  if (a.emoji === b.emoji && b.emoji === c.emoji) {
    const payout = a.payout3 * bet;
    const tier =
      a.payout3 >= 500 ? 'jackpot' :
      a.payout3 >= 50  ? 'big'     :
      a.payout3 >= 10  ? 'medium'  : 'small';
    return { type: 'three', sym: a, payout, tier };
  }

  const matchSym =
    a.emoji === b.emoji ? a :
    b.emoji === c.emoji ? b :
    a.emoji === c.emoji ? a : null;

  if (matchSym) {
    const payout = Math.max(1, Math.floor(matchSym.payout3 * bet * 0.5));
    return { type: 'two', sym: matchSym, payout, tier: 'pair' };
  }

  return { type: 'loss', sym: null, payout: 0, tier: 'loss' };
}

// ── Particle Effects ───────────────────────────────────────────────────────────

function spawnParticles(count, tier) {
  const container = document.getElementById('particles');
  const palette   =
    tier === 'jackpot'
      ? ['#ffd700', '#ff6b00', '#ff0066', '#00ff88', '#00e5ff']
      : ['#00ff88', '#00e5ff', '#ffd700'];

  for (let i = 0; i < count; i++) {
    const p     = document.createElement('div');
    p.className = 'particle';
    const color = pick(palette);
    const size  = 4 + Math.random() * 8;
    const x     = 15 + Math.random() * 70;
    const y     = 20 + Math.random() * 60;
    const dx    = (Math.random() - 0.5) * 480;
    const dy    = (Math.random() - 0.5) * 400;
    const dur   = 0.6 + Math.random() * 0.9;

    p.style.cssText =
      `left:${x}%;top:${y}%;background:${color};` +
      `width:${size}px;height:${size}px;` +
      `--dx:${dx}px;--dy:${dy}px;` +
      `animation-duration:${dur}s;`;

    container.appendChild(p);
    setTimeout(() => p.remove(), (dur + 0.1) * 1000);
  }
}

// ── UI Helpers ─────────────────────────────────────────────────────────────────

function effectiveBet() {
  return state.bet === 'max'
    ? state.balance
    : Math.min(state.bet, state.balance);
}

function updateStats() {
  const bet = effectiveBet();
  document.getElementById('balance').textContent     = state.balance.toLocaleString();
  document.getElementById('stat-won').textContent    = state.totalWon.toLocaleString();
  document.getElementById('stat-burned').textContent = state.totalBurned.toLocaleString();
  document.getElementById('stat-spins').textContent  = state.spins.toLocaleString();
  document.getElementById('bet-display').textContent = bet.toLocaleString();
  document.getElementById('max-win-display').textContent =
    (bet * SYMBOLS[0].payout3).toLocaleString();
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

  const li  = document.createElement('li');
  li.className = `history-item ${winResult.type === 'loss' ? 'lost' : 'won'}`;

  const sign   = winResult.type === 'loss' ? '-' : '+';
  const amount = winResult.type === 'loss' ? betAmount : winResult.payout;

  li.innerHTML =
    `<span class="h-reels">${results.map(s => s.emoji).join(' ')}</span>` +
    `<span class="h-result">${sign}${amount.toLocaleString()} tkn</span>` +
    `<span class="h-msg">${message}</span>`;

  list.insertBefore(li, list.firstChild);
  // Keep last 20 entries
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
    const row   = document.createElement('div');
    row.className = `pay-row${i === 0 ? ' jackpot-row' : ''}`;
    row.innerHTML =
      `<span class="pay-emojis">${sym.emoji}${sym.emoji}${sym.emoji}</span>` +
      `<span class="pay-name">${sym.name}</span>` +
      `<span class="pay-mult">${sym.payout3}×</span>`;
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
  if (state.spinning) return;

  const bet = effectiveBet();
  if (bet <= 0 || state.balance < bet) {
    showBrokeModal();
    return;
  }

  // Deduct bet
  state.balance    -= bet;
  state.totalBurned += bet;
  state.spins++;
  updateStats();

  setSpinEnabled(false);
  Audio.spinStart();

  // Remove stopped class
  for (let i = 0; i < 3; i++) {
    document.getElementById(`reel-${i}`).classList.remove('stopped', 'win-flash');
  }

  // Cycle "AI thinking" messages while reels spin
  let thinkIdx = 0;
  setResult(THINKING_MESSAGES[0], 'spinning');
  const thinkTimer = setInterval(() => {
    thinkIdx = (thinkIdx + 1) % THINKING_MESSAGES.length;
    setResult(THINKING_MESSAGES[thinkIdx], 'spinning');
  }, 420);

  // Determine results and animate reels (staggered stops)
  const results   = [weightedSymbol(), weightedSymbol(), weightedSymbol()];
  const durations = [1900, 2350, 2800];
  await Promise.all(results.map((sym, i) => animateReel(i, sym, durations[i])));

  clearInterval(thinkTimer);

  // Evaluate win
  const winResult = detectWin(results);
  let message;

  if (winResult.type === 'loss') {
    message = pick(LOSS_MESSAGES);
    setResult(message, 'loss');
    Audio.loss();
  } else {
    state.balance    += winResult.payout;
    state.totalWon   += winResult.payout;
    message = pick(WIN_MESSAGES[winResult.tier]);

    const cssClass =
      winResult.tier === 'jackpot' ? 'jackpot'   :
      winResult.tier === 'big'     ? 'big-win'   : 'win';

    setResult(`+${winResult.payout.toLocaleString()} tkn — ${message}`, cssClass);
    Audio.win(winResult.tier);

    const particleCount =
      winResult.tier === 'jackpot' ? 90 :
      winResult.tier === 'big'     ? 45 : 20;
    spawnParticles(particleCount, winResult.tier);

    // Flash reel borders
    for (let i = 0; i < 3; i++) {
      document.getElementById(`reel-${i}`).classList.add('win-flash');
    }
    setTimeout(() => {
      for (let i = 0; i < 3; i++) {
        document.getElementById(`reel-${i}`).classList.remove('win-flash');
      }
    }, 1200);
  }

  addHistoryItem(results, winResult, bet, message);
  updateStats();
  saveState();

  // Check if player is broke (can't afford minimum bet)
  const minBet = BET_STEPS.find(b => typeof b === 'number');
  if (state.balance < minBet) {
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
  document.getElementById('history-list').innerHTML =
    '<li class="history-empty">No spins yet. Model is idle.</li>';
  Audio.click();
});

document.addEventListener('keydown', e => {
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

  // Show broke modal if loaded into a bankrupt state
  const minBet = BET_STEPS.find(b => typeof b === 'number');
  if (state.balance < minBet) showBrokeModal();
}

init();
