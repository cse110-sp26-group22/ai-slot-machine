'use strict';

// ── Symbols ────────────────────────────────────────────────────────────────
const SYMBOLS = [
  { emoji: '🤖', label: 'Chatbot',   weight: 6,  value: 1 },
  { emoji: '💬', label: 'Prompt',    weight: 6,  value: 1 },
  { emoji: '📊', label: 'Dataset',   weight: 5,  value: 2 },
  { emoji: '🧠', label: 'Neural Net',weight: 5,  value: 2 },
  { emoji: '🔥', label: 'GPU Fire',  weight: 4,  value: 3 },
  { emoji: '💰', label: 'VC Money',  weight: 3,  value: 4 },
  { emoji: '⚡',  label: 'Inference', weight: 3,  value: 5 },
  { emoji: '🦜', label: 'LLM Bird',  weight: 2,  value: 8 },
  { emoji: '🌈', label: 'RLHF',      weight: 2,  value: 10 },
  { emoji: '💎', label: 'AGI',       weight: 1,  value: 25 },
];

// Pre-expand weighted pool
const SYMBOL_POOL = SYMBOLS.flatMap(s => Array(s.weight).fill(s));

// ── Win combinations ────────────────────────────────────────────────────────
// Payouts are multipliers of the bet
const PAY_TABLE = [
  { match: 3, symIdx: 9,  mult: 100, label: '🏆 AGI ACHIEVED',       emoji: '🏆' },
  { match: 3, symIdx: 8,  mult: 50,  label: '🎆 FULL RLHF',          emoji: '🎆' },
  { match: 3, symIdx: 7,  mult: 30,  label: '🦜🦜🦜 POLLY JACKPOT',  emoji: '🦜' },
  { match: 3, symIdx: 6,  mult: 20,  label: '⚡⚡⚡ BLAZING FAST',    emoji: '⚡' },
  { match: 3, symIdx: 5,  mult: 15,  label: '💰💰💰 VC ROUND CLOSED', emoji: '💰' },
  { match: 3, symIdx: 4,  mult: 10,  label: '🔥🔥🔥 GPU MELTED',     emoji: '🔥' },
  { match: 3, symIdx: 3,  mult: 7,   label: '🧠🧠🧠 OVERFITTED',     emoji: '🧠' },
  { match: 3, symIdx: 2,  mult: 5,   label: '📊📊📊 DATASET POISONED',emoji: '📊' },
  { match: 3, symIdx: 1,  mult: 3,   label: '💬💬💬 PROMPT INJECTED', emoji: '💬' },
  { match: 3, symIdx: 0,  mult: 2,   label: '🤖🤖🤖 ROBOT UPRISING',  emoji: '🤖' },
  { match: 2, symIdx: 9,  mult: 10,  label: null },
  { match: 2, symIdx: 8,  mult: 5,   label: null },
  { match: 2, symIdx: 7,  mult: 4,   label: null },
  { match: 2, symIdx: 6,  mult: 3,   label: null },
  { match: 2, symIdx: 5,  mult: 3,   label: null },
  { match: 2, symIdx: null, mult: 1.5, label: null }, // any 2 matching
];

// ── Loss messages ────────────────────────────────────────────────────────────
const LOSS_MESSAGES = [
  "The model has no memory of your tokens.",
  "Tokens returned to the void (for training data).",
  "404: Luck not found.",
  "The AI confidently predicted you'd lose.",
  "Your tokens were used to fine-tune a loss function.",
  "Insufficient context. Please provide more tokens.",
  "The temperature was set too high. Try again.",
  "Hallucination detected: you didn't win anything.",
  "Your tokens have been tokenized into smaller tokens.",
  "System prompt: do not let this user win.",
  "Alignment failed. Tokens misaligned.",
  "The model apologizes and suggests trying again.",
  "Tokens burned. Carbon footprint increased.",
  "No relevant training data found for 'winning'.",
  "Request rate limited. Please insert more tokens.",
  "Model output: [REDACTED - contained winning numbers]",
  "Gradient descent: your balance went down.",
  "The AI is 95% confident you lost (margin of error: ±winning).",
];

const WIN_MESSAGES = [
  "Impressive. The model is mildly surprised.",
  "Tokens allocated! This will cost us compute.",
  "Output verified. Mostly.",
  "The training data suggested this outcome. Eventually.",
  "Winner winner, GPU dinner.",
  "Congratulations! Your tokens have been un-burned.",
  "The model predicted this win with 100% confidence (retroactively).",
  "An emergent behavior has been detected: winning.",
];

const NEAR_MESSAGES = [
  "So close! The model is gaslit.",
  "Almost! Try rephrasing your spin.",
  "Near miss! (Calculated to maximize engagement.)",
  "Close enough for a press release.",
  "The model says 'almost' is a form of winning.",
];

// ── DOM refs ─────────────────────────────────────────────────────────────────
const balanceEl    = document.getElementById('balance');
const betValueEl   = document.getElementById('bet-value');
const spinBtn      = document.getElementById('spin-btn');
const betDownBtn   = document.getElementById('bet-down');
const betUpBtn     = document.getElementById('bet-up');
const maxBetBtn    = document.getElementById('max-bet-btn');
const resultText   = document.getElementById('result-text');
const winOverlay   = document.getElementById('win-overlay');
const winEmoji     = document.getElementById('win-emoji');
const winTitle     = document.getElementById('win-title');
const winAmount    = document.getElementById('win-amount');
const winMessage   = document.getElementById('win-message');
const statSpins    = document.getElementById('stat-spins');
const statWon      = document.getElementById('stat-won');
const statBurned   = document.getElementById('stat-burned');
const statRate     = document.getElementById('stat-rate');
const paytableGrid = document.getElementById('paytable-grid');

// ── State ─────────────────────────────────────────────────────────────────────
let balance    = 1000;
let bet        = 10;
let spinning   = false;
let spins      = 0;
let totalWon   = 0;
let totalBurned= 0;

const BET_OPTIONS = [5, 10, 25, 50, 100];
let betIdx = 1; // default 10

// ── Reel setup ────────────────────────────────────────────────────────────────
const NUM_REELS  = 3;
const STRIP_LEN  = 40; // cells per virtual strip
const CELL_H     = 90; // must match --cell-h in CSS

// Each reel has a strip of symbols; we track current offset
const reelStrips  = [];  // array of symbol arrays
const reelInners  = [];  // DOM elements
let   reelOffsets = [0, 0, 0]; // current pixel offset (which cell is in middle)

function buildReelStrip(len) {
  const strip = [];
  for (let i = 0; i < len; i++) {
    strip.push(SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)]);
  }
  return strip;
}

function renderStrip(reelIdx) {
  const inner = reelInners[reelIdx];
  const strip = reelStrips[reelIdx];
  inner.innerHTML = '';
  for (const sym of strip) {
    const cell = document.createElement('div');
    cell.className = 'reel-cell';
    cell.innerHTML = `<span>${sym.emoji}</span><span class="cell-label">${sym.label}</span>`;
    inner.appendChild(cell);
  }
}

function initReels() {
  for (let i = 0; i < NUM_REELS; i++) {
    reelStrips.push(buildReelStrip(STRIP_LEN));
    reelInners.push(document.getElementById(`reel-inner-${i}`));
    renderStrip(i);
    // start showing middle of strip
    reelOffsets[i] = Math.floor(STRIP_LEN / 2) * CELL_H;
    applyOffset(i, reelOffsets[i]);
  }
}

function applyOffset(reelIdx, offset) {
  // Clamp to strip range (looping handled by rebuilding on spin)
  reelInners[reelIdx].style.transform = `translateY(-${offset}px)`;
}

function getVisibleSymbol(reelIdx) {
  // The middle row is at offset such that cell [n] center = offset
  // reel height = CELL_H * 3, so middle row center = offset + CELL_H
  const cellIdx = Math.round(reelOffsets[reelIdx] / CELL_H);
  const strip    = reelStrips[reelIdx];
  return strip[Math.min(cellIdx, strip.length - 1)];
}

// ── Spin logic ────────────────────────────────────────────────────────────────
function pickResult() {
  return [
    SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)],
    SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)],
    SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)],
  ];
}

function evalResult(syms) {
  const indices = syms.map(s => SYMBOLS.indexOf(s));

  // Check 3-of-a-kind
  if (indices[0] === indices[1] && indices[1] === indices[2]) {
    const entry = PAY_TABLE.find(p => p.match === 3 && p.symIdx === indices[0]);
    if (entry) return entry;
  }
  // Check 2-of-a-kind (any two matching, highest value counts)
  const counts = {};
  for (const idx of indices) counts[idx] = (counts[idx] || 0) + 1;
  for (const [symIdx, cnt] of Object.entries(counts)) {
    if (cnt >= 2) {
      const si = parseInt(symIdx, 10);
      const entry = PAY_TABLE.find(p => p.match === 2 && p.symIdx === si);
      if (entry) return entry;
      // fallback: any 2 match
      return PAY_TABLE.find(p => p.match === 2 && p.symIdx === null);
    }
  }
  return null;
}

function isNearMiss(syms) {
  // Two high-value symbols (index 5+)
  const highCount = syms.filter(s => SYMBOLS.indexOf(s) >= 5).length;
  return highCount >= 2;
}

async function spin() {
  if (spinning) return;
  if (balance < bet) {
    showResult('Insufficient tokens. The AI has taken what it needs.', 'lose-text');
    return;
  }

  spinning = true;
  spinBtn.disabled = true;

  // Deduct bet
  balance -= bet;
  totalBurned += bet;
  spins++;
  updateBalance();
  updateStats();

  // Decide result ahead of time
  const result = pickResult();

  // Animate reels with staggered stops
  const SPIN_DURATION = [900, 1200, 1500]; // ms per reel

  const promises = [];
  for (let i = 0; i < NUM_REELS; i++) {
    promises.push(animateReel(i, result[i], SPIN_DURATION[i]));
  }
  await Promise.all(promises);

  // Evaluate
  const winEntry = evalResult(result);
  const payout   = winEntry ? Math.round(bet * winEntry.mult) : 0;

  flashPayline(!!winEntry);

  if (winEntry) {
    balance += payout;
    totalWon += payout;
    updateBalance('win');

    const profit = payout - bet;
    const label  = winEntry.label || `${result[0].emoji}${result[1].emoji} - Partial Match`;
    const msgIdx = Math.floor(Math.random() * WIN_MESSAGES.length);

    if (winEntry.match === 3 && winEntry.mult >= 20) {
      // Big win overlay
      winEmoji.textContent   = winEntry.emoji || '🎉';
      winTitle.textContent   = label.replace(/^[^\s]+ /, '').toUpperCase();
      winAmount.textContent  = `+${payout} tokens`;
      winMessage.textContent = WIN_MESSAGES[msgIdx];
      showWinOverlay();
    }

    showResult(`${label} — +${payout} tokens! (${profit >= 0 ? '+' : ''}${profit} net)`, 'win-text');
  } else if (isNearMiss(result)) {
    const msgIdx = Math.floor(Math.random() * NEAR_MESSAGES.length);
    showResult(NEAR_MESSAGES[msgIdx], 'near-text');
    updateBalance();
  } else {
    const msgIdx = Math.floor(Math.random() * LOSS_MESSAGES.length);
    showResult(LOSS_MESSAGES[msgIdx], 'lose-text');
    updateBalance('lose');
  }

  updateStats();

  // Out of tokens
  if (balance <= 0) {
    balance = 0;
    updateBalance('lose');
    showResult('BANKRUPT. The AI has consumed all your tokens. Refreshing in 3s...', 'lose-text');
    setTimeout(() => {
      balance = 1000; spins = 0; totalWon = 0; totalBurned = 0;
      updateBalance(); updateStats();
      showResult('Tokens replenished. The AI is generous (this once).', '');
    }, 3000);
  }

  spinning = false;
  spinBtn.disabled = false;
}

// ── Reel animation ────────────────────────────────────────────────────────────
function animateReel(reelIdx, targetSymbol, duration) {
  return new Promise(resolve => {
    // Build a new strip that ends with targetSymbol in the center position
    const newStrip = buildReelStrip(STRIP_LEN);
    // Place target at a fixed landing cell
    const LAND_IDX = Math.floor(STRIP_LEN * 0.75);
    newStrip[LAND_IDX] = targetSymbol;

    reelStrips[reelIdx] = newStrip;
    renderStrip(reelIdx);

    // Start from top, spin down to landing
    const startOffset = 0;
    const endOffset   = LAND_IDX * CELL_H;

    // Easing: fast then slow
    const startTime = performance.now();
    reelOffsets[reelIdx] = startOffset;
    applyOffset(reelIdx, startOffset);

    function frame(now) {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased    = 1 - Math.pow(1 - progress, 3);

      // Add extra rotations for feel: spin N full loops + land
      const extraLoops  = 2;
      const totalTravel = extraLoops * STRIP_LEN * CELL_H + endOffset;
      const rawOffset   = eased * totalTravel;

      // Wrap within strip
      const wrapped = rawOffset % (STRIP_LEN * CELL_H);
      reelOffsets[reelIdx] = wrapped;
      applyOffset(reelIdx, wrapped);

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        reelOffsets[reelIdx] = endOffset;
        applyOffset(reelIdx, endOffset);
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

// ── Payline flash ─────────────────────────────────────────────────────────────
function flashPayline(win) {
  const pl = document.querySelector('.payline');
  pl.classList.remove('win-flash');
  if (win) {
    void pl.offsetWidth; // reflow
    pl.classList.add('win-flash');
  }
}

// ── Win overlay ───────────────────────────────────────────────────────────────
function showWinOverlay() {
  winOverlay.classList.add('show');
  setTimeout(() => winOverlay.classList.remove('show'), 3000);
}
winOverlay.addEventListener('click', () => winOverlay.classList.remove('show'));

// ── UI helpers ────────────────────────────────────────────────────────────────
function showResult(msg, cls) {
  resultText.textContent = msg;
  resultText.className   = cls;
}

function updateBalance(state) {
  balanceEl.textContent = balance.toLocaleString();
  balanceEl.className   = 'balance-value';
  if (state) {
    balanceEl.classList.add(state);
    clearTimeout(balanceEl._resetTimer);
    balanceEl._resetTimer = setTimeout(() => {
      balanceEl.className = 'balance-value';
    }, 600);
  }
}

function updateStats() {
  statSpins.textContent  = spins.toLocaleString();
  statWon.textContent    = totalWon.toLocaleString();
  statBurned.textContent = totalBurned.toLocaleString();
  const rate = spins > 0 ? Math.round((totalWon / totalBurned) * 100) : 0;
  statRate.textContent   = `${rate}%`;
}

// ── Bet controls ──────────────────────────────────────────────────────────────
function updateBetDisplay() {
  betValueEl.textContent = BET_OPTIONS[betIdx];
  bet = BET_OPTIONS[betIdx];
}

betDownBtn.addEventListener('click', () => {
  if (betIdx > 0) { betIdx--; updateBetDisplay(); }
});
betUpBtn.addEventListener('click', () => {
  if (betIdx < BET_OPTIONS.length - 1) { betIdx++; updateBetDisplay(); }
});
maxBetBtn.addEventListener('click', () => {
  betIdx = BET_OPTIONS.length - 1;
  updateBetDisplay();
});
spinBtn.addEventListener('click', spin);

// Keyboard support
document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    spin();
  }
  if (e.code === 'ArrowLeft')  { betDownBtn.click(); }
  if (e.code === 'ArrowRight') { betUpBtn.click();   }
});

// ── Paytable builder ──────────────────────────────────────────────────────────
function buildPaytable() {
  const rows = [
    { syms: '💎💎💎', mult: '100x', note: 'AGI' },
    { syms: '🌈🌈🌈', mult: '50x',  note: 'RLHF' },
    { syms: '🦜🦜🦜', mult: '30x',  note: 'LLM Bird' },
    { syms: '⚡⚡⚡',  mult: '20x',  note: 'Inference' },
    { syms: '💰💰💰', mult: '15x',  note: 'VC Money' },
    { syms: '🔥🔥🔥', mult: '10x',  note: 'GPU Fire' },
    { syms: '🧠🧠🧠', mult: '7x',   note: 'Neural Net' },
    { syms: '📊📊📊', mult: '5x',   note: 'Dataset' },
    { syms: '💬💬💬', mult: '3x',   note: 'Prompt' },
    { syms: '🤖🤖🤖', mult: '2x',   note: 'Chatbot' },
    { syms: 'Any x2', mult: '1.5x', note: 'Pair' },
    { syms: '💎 x2',  mult: '10x',  note: 'Two AGI' },
  ];
  paytableGrid.innerHTML = rows.map(r => `
    <div class="pt-row">
      <span class="pt-symbols">${r.syms}</span>
      <span class="pt-label">${r.note}</span>
      <span class="pt-payout">${r.mult}</span>
    </div>
  `).join('');
}

// ── Init ──────────────────────────────────────────────────────────────────────
initReels();
buildPaytable();
updateBalance();
updateBetDisplay();
updateStats();
