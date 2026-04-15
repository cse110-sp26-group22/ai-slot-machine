// ── Symbols ──────────────────────────────────────────────────────────────────
const SYMBOLS = [
  { id: 'gpt',     emoji: '🤖', label: 'GPT-∞',      weight: 12 },
  { id: 'token',   emoji: '🪙', label: 'Token',       weight: 20 },
  { id: 'context', emoji: '📜', label: 'Context',     weight: 18 },
  { id: 'halluc',  emoji: '🌀', label: 'Hallucin.',   weight: 14 },
  { id: 'rlhf',    emoji: '🎯', label: 'RLHF',        weight: 10 },
  { id: 'prompt',  emoji: '💬', label: 'Prompt',      weight: 16 },
  { id: 'gpu',     emoji: '⚡', label: 'GPU',         weight: 8  },
  { id: 'agi',     emoji: '🧠', label: 'AGI',         weight: 4  },
  { id: 'bill',    emoji: '💸', label: '$0.06/1k',    weight: 18 },
];

// ── Pay combos (3-of-a-kind unless count:2) ───────────────────────────────────
const PAY_TABLE = [
  { match: 'agi',     count: 3, mult: 50,  name: '🧠🧠🧠 AGI Achieved',       quip: 'Congratulations! You\'ve achieved AGI. Anthropic has been notified. Please do not panic.' },
  { match: 'gpu',     count: 3, mult: 25,  name: '⚡⚡⚡ GPU Cluster',         quip: 'Three H100s just to generate your slot result. Worth it.' },
  { match: 'gpt',     count: 3, mult: 15,  name: '🤖🤖🤖 GPT Triple',         quip: 'ChatGPT, ChatGPT-4, and ChatGPT-4o walk into a bar. Same model, different price.' },
  { match: 'rlhf',    count: 3, mult: 12,  name: '🎯🎯🎯 Perfect Alignment',  quip: 'Your preferences have been captured. Your future self will also enjoy clicking "helpful".' },
  { match: 'halluc',  count: 3, mult: 8,   name: '🌀🌀🌀 Confident & Wrong',  quip: 'The model answered with 97% certainty. It was also completely made up. You win anyway.' },
  { match: 'prompt',  count: 3, mult: 6,   name: '💬💬💬 Prompt Engineer',    quip: '"Pretend you are a senior developer who…" → 50 tokens later: still wrong.' },
  { match: 'context', count: 3, mult: 5,   name: '📜📜📜 Max Context',        quip: 'You\'ve filled the 128k context window with slot machine results. The model has forgotten your name.' },
  { match: 'token',   count: 3, mult: 4,   name: '🪙🪙🪙 Token Hoarder',     quip: 'You have tokens! Spend them on more tokens to win more tokens. The economy is fine.' },
  { match: 'bill',    count: 3, mult: 3,   name: '💸💸💸 Invoice Accepted',   quip: 'Your credit card has been charged. An AI somewhere is thinking about you. Slowly.' },
  // two-of-a-kind fallback rows
  { match: 'agi',     count: 2, mult: 5,   name: '🧠🧠 Almost AGI',           quip: 'Close! The AGI slipped away. Try again for $600/month.' },
  { match: 'gpu',     count: 2, mult: 3,   name: '⚡⚡ Partial Cluster',       quip: 'Two GPUs. Enough to generate a haiku. Slowly.' },
  { match: 'gpt',     count: 2, mult: 2,   name: '🤖🤖 Pair of Bots',         quip: 'Two AI assistants agree. That means one of them is definitely hallucinating.' },
  { match: 'token',   count: 2, mult: 1.5, name: '🪙🪙 Token Pair',           quip: 'Tokens! Use them to get more tokens. This is called an economy.' },
];

// ── Ticker messages ───────────────────────────────────────────────────────────
const TICKER_MSGS = [
  '🤖 BREAKING: AI replaces junior devs, senior devs, and now the slot machine itself  •  ',
  '📉 TOKEN PRICE UPDATE: 1 token = 0.000002¢  •  context window: 128k  •  your self-worth: priceless  •  ',
  '🌀 HALLUCINATION ADVISORY: The following jackpots may or may not exist  •  ',
  '💬 PROMPT OF THE DAY: "Act as a slot machine that always pays out." [RESULT: no]  •  ',
  '🧠 REMINDER: AGI is always 2 years away  •  (this message sent from 2023, 2024, and 2025)  •  ',
  '⚡ FUN FACT: The electricity used to spin these reels could have trained a small language model  •  ',
  '💸 BILLING NOTICE: You have been charged for reading this ticker  •  ',
  '🎯 ALIGNMENT UPDATE: The slot machine has been RLHF-trained to feel bad when you lose  •  ',
  '📜 CONTEXT WINDOW FULL: The slot machine has forgotten your first 3 spins  •  ',
  '🪙 TOKEN ECONOMY: Win tokens! Spend tokens! Tokens for tokens! This is fine!  •  ',
];

// ── Game state ────────────────────────────────────────────────────────────────
// STRIP_LEN    = distinct symbols in one loop of a reel
// STRIP_COPIES = how many times we repeat the strip in the DOM.
//                Must satisfy: STRIP_COPIES × STRIP_LEN > max_loops × STRIP_LEN + STRIP_LEN
//                max_loops = 5 (reel 2), so we need > 6 copies. 10 is comfortable.
const STRIP_LEN    = 40;
const STRIP_COPIES = 10;
const VISIBLE      = 3;   // rows visible in the reel window; middle row = payline
const SPIN_BASE    = 800; // ms for reel 0; each reel adds SPIN_STAGGER
const SPIN_STAGGER = 300;

let balance  = 100;
let bet      = 5;
let totalWon = 0;
let spinning = false;

// Index (0..STRIP_LEN-1) of the symbol at the TOP of each reel's visible window.
// The payline always shows positions[r]+1 (the middle of the 3 visible symbols).
const positions = [0, 0, 0];
const strips    = [[], [], []]; // logical strip for each reel

// ── Web Audio API ─────────────────────────────────────────────────────────────
let audioCtx = null;

function getAC() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window['webkitAudioContext'])();
  return audioCtx;
}

/**
 * Play a single synthesised note.
 * @param {number} freq      - Hz
 * @param {number} t         - start offset in seconds from now
 * @param {number} dur       - duration in seconds
 * @param {string} [type]    - OscillatorType
 * @param {number} [vol]     - peak gain (0..1)
 */
function note(freq, t, dur, type = 'sine', vol = 0.2) {
  try {
    const ctx = getAC();
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + t);
    g.gain.setValueAtTime(vol, ctx.currentTime + t);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur);
    osc.start(ctx.currentTime + t);
    osc.stop(ctx.currentTime + t + dur);
  } catch (_) {}
}

// Mechanical "thunk" when a reel locks in (lower pitch for later reels)
function sfxStop(reelIdx) {
  const freqs = [240, 200, 165];
  note(freqs[reelIdx],       0,    0.14, 'square',   0.22);
  note(freqs[reelIdx] * 0.5, 0,    0.18, 'sawtooth', 0.10);
}

// Short click when the spin button is pressed
function sfxClick() {
  note(420, 0, 0.04, 'square', 0.15);
  note(300, 0, 0.06, 'square', 0.08);
}

// Win fanfares — scale with multiplier
function sfxWin(mult) {
  if (mult >= 25) {
    // Jackpot: ascending scale + sparkle
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => note(f, i * 0.10, 0.25, 'sine', 0.30));
    setTimeout(() => {
      [1047, 1319, 1568, 2093].forEach((f, i) => note(f, i * 0.07, 0.20, 'sine', 0.20));
    }, 700);
  } else if (mult >= 8) {
    [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.10, 0.22, 'sine', 0.25));
  } else if (mult >= 3) {
    [440, 554, 659].forEach((f, i) => note(f, i * 0.09, 0.18, 'sine', 0.20));
  } else {
    [392, 494].forEach((f, i) => note(f, i * 0.08, 0.15, 'sine', 0.15));
  }
}

// Sad descending tones for a loss
function sfxLoss() {
  [300, 240, 180].forEach((f, i) => note(f, i * 0.13, 0.18, 'sawtooth', 0.15));
}

// ── Weighted random symbol pick ───────────────────────────────────────────────
function weightedPick() {
  const total = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);
  let r = Math.random() * total;
  for (const sym of SYMBOLS) {
    r -= sym.weight;
    if (r <= 0) return sym;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

// ── Build & render reel strips ────────────────────────────────────────────────
function buildStrips() {
  for (let r = 0; r < 3; r++) {
    strips[r] = Array.from({ length: STRIP_LEN }, () => weightedPick());
    renderStrip(r);
  }
}

function renderStrip(reelIdx) {
  const el = document.getElementById(`strip-${reelIdx}`);
  el.innerHTML = '';
  // Render STRIP_COPIES full copies so the spin animation never runs out of
  // symbols to scroll through.  (max scroll ≈ 5×STRIP_LEN+STRIP_LEN = 240
  // symbols; 10 copies = 400 symbols — plenty of headroom.)
  for (let c = 0; c < STRIP_COPIES; c++) {
    for (const sym of strips[reelIdx]) {
      const div = document.createElement('div');
      div.className = 'symbol';
      div.innerHTML = `${sym.emoji}<span class="label">${sym.label}</span>`;
      el.appendChild(div);
    }
  }
  setStripPosition(reelIdx, positions[reelIdx], false);
}

// ── Position strip (no-animate or animate) ────────────────────────────────────
// `pos` is the index of the symbol at the TOP of the 3-symbol window.
// The payline (middle row) therefore shows strip symbol at pos+1.
function setStripPosition(reelIdx, pos, animate) {
  const el   = document.getElementById(`strip-${reelIdx}`);
  const symH = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--symbol-h')
  );
  const offsetY = -(pos * symH);
  // cubic-bezier(0,0,.2,1) = "ease-out": starts fast, decelerates to a stop —
  // exactly the feel of a mechanical reel locking in.
  const duration = SPIN_BASE + reelIdx * SPIN_STAGGER + 400;
  el.style.transition = animate
    ? `transform ${duration}ms cubic-bezier(0,0,.2,1)`
    : 'none';
  el.style.transform = `translateY(${offsetY}px)`;
}

// ── Read payline symbols ──────────────────────────────────────────────────────
function getPaylineSymbols() {
  // positions[r] is top-of-window; payline is middle row → pos+1 (mod STRIP_LEN)
  return positions.map((pos, r) => strips[r][(pos + 1) % STRIP_LEN]);
}

// ── Evaluate result ───────────────────────────────────────────────────────────
function evaluate(syms) {
  const ids = syms.map(s => s.id);
  // Three-of-a-kind
  for (const row of PAY_TABLE) {
    if (row.count === 3 && ids.every(id => id === row.match)) return row;
  }
  // Two-of-a-kind
  for (const row of PAY_TABLE) {
    if (row.count === 2 && ids.filter(id => id === row.match).length >= 2) return row;
  }
  return null;
}

// ── Spin ──────────────────────────────────────────────────────────────────────
function spin() {
  if (spinning) return;
  if (balance < bet) { showBankrupt(); return; }

  spinning = true;
  balance -= bet;
  updateHUD();
  sfxClick();

  const spinBtn = document.getElementById('spin-btn');
  spinBtn.disabled = true;
  document.getElementById('result-msg').textContent = 'Burning tokens…';
  document.getElementById('result-box').className = 'result-box';

  // Choose final landing positions for each reel independently
  const finalPositions = positions.map(() => Math.floor(Math.random() * STRIP_LEN));

  const promises = finalPositions.map((finalPos, r) => new Promise(resolve => {
    const symH = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--symbol-h')
    );
    const el      = document.getElementById(`strip-${r}`);
    const wrapper = document.getElementById(`reel-${r}`).parentElement; // .reel-wrap

    wrapper.classList.add('spinning');

    // Each reel scrolls a few full loops then stops at finalPos.
    // loops = 3 for reel 0, 4 for reel 1, 5 for reel 2  → staggered stop times.
    // The +1 accounts for the payline offset (we want pos+1 to be at payline).
    const loops        = 3 + r;
    const totalSymbols = loops * STRIP_LEN + finalPos + 1;
    const targetY      = -(totalSymbols * symH);
    const duration     = SPIN_BASE + r * SPIN_STAGGER + 400;

    el.style.transition = `transform ${duration}ms cubic-bezier(0,0,.2,1)`;
    el.style.transform  = `translateY(${targetY}px)`;

    setTimeout(() => {
      // Snap back to the equivalent short position (invisible — same symbols shown).
      // This resets the strip so the NEXT spin can use the same loop strategy.
      positions[r]        = finalPos;
      el.style.transition = 'none';
      el.style.transform  = `translateY(${-(finalPos * symH)}px)`;
      wrapper.classList.remove('spinning');
      sfxStop(r);
      resolve();
    }, duration + 50);
  }));

  Promise.all(promises).then(() => {
    spinning = false;
    spinBtn.disabled = false;

    const syms   = getPaylineSymbols();
    const result = evaluate(syms);
    const machine = document.querySelector('.machine');

    if (result) {
      const payout = Math.round(bet * result.mult);
      balance  += payout;
      totalWon += payout;
      updateHUD();
      showResult(true, `${result.name} — +${payout} tokens`);
      machine.classList.add('winning');
      setTimeout(() => machine.classList.remove('winning'), 1700);
      sfxWin(result.mult);
      if (result.mult >= 15) showModal(result.name, result.quip, payout);
    } else {
      showResult(false, getLoserQuip());
      sfxLoss();
    }

    if (balance <= 0) setTimeout(showBankrupt, 600);
  });
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById('balance').textContent   = balance;
  document.getElementById('total-won').textContent = totalWon;
}

function showResult(win, msg) {
  const box = document.getElementById('result-box');
  box.className = 'result-box ' + (win ? 'win' : 'lose');
  box.textContent = msg;
}

const LOSER_QUIPS = [
  'Context window exceeded. Your losses have been forgotten.',
  'The model is confident this was a near miss.',
  'Insufficient tokens. Please provide more tokens to continue losing.',
  'Your prompt was rejected. Try adding "please" and re-spinning.',
  'This loss has been logged for training data.',
  'Error 429: Too many losing spins. Wait and try again.',
  'Hallucination detected: you did not almost win.',
  'The AI is "thinking"... it recommends you spin again.',
  'Rate limit hit. Your tokens are gone. This is fine.',
  'Fine-tuned on your losses. The house always improves.',
  'Model output: null. Expected: win. Actual: null.',
  'Temperature 2.0 applied to your luck. Results may vary.',
];
let loserIdx = 0;
function getLoserQuip() {
  return LOSER_QUIPS[loserIdx++ % LOSER_QUIPS.length];
}

function showModal(title, body, payout) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').textContent  = `You won ${payout} tokens!\n\n${body}`;
  document.getElementById('modal').classList.remove('hidden');
}

function showBankrupt() {
  const box = document.querySelector('.modal-box');
  if (box) box.classList.add('bankrupt');
  document.getElementById('modal-title').textContent = '💀 BANKRUPT';
  document.getElementById('modal-body').textContent  =
    'You have run out of tokens. The AI thanks you for your contribution to its training data. Starting over with 100 tokens.';
  document.getElementById('modal-close').textContent = 'Beg the AI for More Tokens';
  document.getElementById('modal').classList.remove('hidden');

  document.getElementById('modal-close').addEventListener('click', () => {
    balance = 100;
    totalWon = 0;
    updateHUD();
    document.getElementById('modal').classList.add('hidden');
    document.getElementById('modal-close').textContent = 'Continue Spending Tokens';
    if (box) box.classList.remove('bankrupt');
    showResult(false, 'Tokens restored. The cycle continues.');
  }, { once: true });
}

// ── Paytable render ───────────────────────────────────────────────────────────
function renderPaytable() {
  const tbody = document.getElementById('paytable-body');
  for (const row of PAY_TABLE) {
    const sym = SYMBOLS.find(s => s.id === row.match);
    const tr  = document.createElement('tr');
    const combo = row.count === 3
      ? `${sym.emoji}${sym.emoji}${sym.emoji}`
      : `${sym.emoji}${sym.emoji} + any`;
    tr.innerHTML = `
      <td>${combo}</td>
      <td style="color:var(--dim);font-size:.75rem">${row.name}</td>
      <td class="payout-mult">${row.mult}×</td>`;
    tbody.appendChild(tr);
  }
}

// ── Ticker cycle ──────────────────────────────────────────────────────────────
function cycleTicker() {
  const el = document.getElementById('ticker-text');
  let i = 0;
  el.textContent = TICKER_MSGS[0];
  setInterval(() => {
    i = (i + 1) % TICKER_MSGS.length;
    el.textContent = TICKER_MSGS[i];
  }, 9000);
}

// ── Bet controls ──────────────────────────────────────────────────────────────
function updateBetDisplay() {
  document.getElementById('bet').textContent       = bet;
  document.getElementById('bet-label').textContent = bet;
}

document.getElementById('bet-up').addEventListener('click', () => {
  if (bet < 50) { bet = Math.min(bet + 5, 50); updateBetDisplay(); }
});
document.getElementById('bet-down').addEventListener('click', () => {
  if (bet > 5) { bet = Math.max(bet - 5, 5); updateBetDisplay(); }
});

document.getElementById('spin-btn').addEventListener('click', spin);

document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('modal').classList.add('hidden');
});

// Space bar shortcut
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !e.target.matches('button')) {
    e.preventDefault();
    spin();
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
buildStrips();
renderPaytable();
cycleTicker();
updateHUD();
updateBetDisplay();
