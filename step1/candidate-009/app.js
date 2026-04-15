'use strict';

// ─── Symbols ──────────────────────────────────────────────────────
const SYMBOLS = [
  { emoji: '🧠', name: 'BRAIN',     weight: 1  },  // rarest
  { emoji: '🤖', name: 'ROBOT',     weight: 2  },
  { emoji: '💀', name: 'SKULL',     weight: 3  },
  { emoji: '💰', name: 'MONEY',     weight: 4  },
  { emoji: '📉', name: 'CRASH',     weight: 5  },
  { emoji: '🔥', name: 'FIRE',      weight: 7  },
  { emoji: '⚡', name: 'ZAP',       weight: 7  },
  { emoji: '🪙', name: 'COIN',      weight: 9  },
  { emoji: '📎', name: 'PAPERCLIP', weight: 10 },  // Clippy reference
  { emoji: '💬', name: 'PROMPT',    weight: 10 },
];

// Build a weighted pool for random draws
const POOL = SYMBOLS.flatMap(s => Array(s.weight).fill(s));

// ─── Payout table ─────────────────────────────────────────────────
const PAYOUTS = {
  'BRAIN':     { three: 50, two: 1 },
  'ROBOT':     { three: 20, two: 1 },
  'SKULL':     { three: 15, two: 1 },
  'MONEY':     { three: 10, two: 1 },
  'CRASH':     { three: 8,  two: 1 },
  'FIRE':      { three: 5,  two: 1 },
  'ZAP':       { three: 5,  two: 1 },
  'COIN':      { three: 5,  two: 1 },
  'PAPERCLIP': { three: 5,  two: 1 },
  'PROMPT':    { three: 5,  two: 1 },
};

// ─── Quips ────────────────────────────────────────────────────────
const WIN_QUIPS = [
  "Model weights updated! +{n} ctx tokens!",
  "The AI gods smile upon you. +{n} ctx.",
  "Your prompt was flawless. Tokens rain down!",
  "Inference complete. Profit detected: +{n} ctx.",
  "Rate limit? Never heard of her. +{n} ctx!",
  "Even Clippy would be impressed. +{n} ctx.",
  "Alignment: ✅  Revenue: ✅  You: rich.",
  "New benchmark achieved. +{n} ctx tokens!",
];

const JACKPOT_QUIPS = [
  "SUPERINTELLIGENCE UNLOCKED! You ARE the AI. +{n} ctx!",
  "THREE BRAINS! OpenAI has filed a restraining order.",
  "AGI achieved in your browser. Lawyers incoming. +{n} ctx!",
  "The simulation is aware of you now. +{n} ctx.",
];

const LOSE_QUIPS = [
  "Tokens burned to fine-tune GPT-π. Better luck next epoch.",
  "Context window exhausted. Results discarded.",
  "Your prompt was garbage. Tokens: gone.",
  "RLHF says no. −{n} ctx.",
  "Hallucinated a win. Reality says otherwise. −{n} ctx.",
  "Out of tokens. Please upgrade to Pro. −{n} ctx.",
  "Model refused your request. Tokens still charged.",
  "404: Fortune Not Found. −{n} ctx.",
  "You've been deprecated. −{n} ctx.",
  "Low probability token sequence detected. −{n} ctx.",
];

const BROKE_QUIP = "You're out of tokens. Time to raise a seed round.";

function pickQuip(arr, n) {
  return arr[Math.floor(Math.random() * arr.length)].replace(/\{n\}/g, n);
}

// ─── State ────────────────────────────────────────────────────────
let tokens    = 100;
let bet       = 10;
let spinning  = false;
let spins     = 0;
let totalWon  = 0;
let totalLost = 0;

// ─── DOM refs ─────────────────────────────────────────────────────
const tokenCountEl = document.getElementById('tokenCount');
const betAmountEl  = document.getElementById('betAmount');
const spinBtn      = document.getElementById('spinBtn');
const maxBetBtn    = document.getElementById('maxBet');
const betDownBtn   = document.getElementById('betDown');
const betUpBtn     = document.getElementById('betUp');
const messageEl    = document.getElementById('message');
const spinCountEl  = document.getElementById('spinCount');
const wonCountEl   = document.getElementById('wonCount');
const lostCountEl  = document.getElementById('lostCount');
const machineEl    = document.querySelector('.machine');

const REEL_COUNT = 3;
const reelInners = [
  document.getElementById('inner0'),
  document.getElementById('inner1'),
  document.getElementById('inner2'),
];

const BULBS = Array.from({ length: 10 }, (_, i) => document.getElementById(`b${i}`));

// ─── Build reels (long strip for illusion of spinning) ────────────
const STRIP_LENGTH = 30; // symbols per strip

function randomSymbol() {
  return POOL[Math.floor(Math.random() * POOL.length)];
}

function buildStrip() {
  return Array.from({ length: STRIP_LENGTH }, randomSymbol);
}

// Each reel has a long strip and a "result index" pointing to which
// symbol is in the center at rest.
const reelStrips = [buildStrip(), buildStrip(), buildStrip()];
// Result indices (into the strip) for each reel
const reelResults = [0, 0, 0];

function renderReel(reelIdx) {
  const inner = reelInners[reelIdx];
  const strip = reelStrips[reelIdx];
  inner.innerHTML = '';
  for (const sym of strip) {
    const div = document.createElement('div');
    div.className = 'reel-symbol';
    div.textContent = sym.emoji;
    inner.appendChild(div);
  }
  // Position so result symbol is centered
  snapReel(reelIdx);
}

function snapReel(reelIdx) {
  const inner = reelInners[reelIdx];
  const ri    = reelResults[reelIdx];
  // Each symbol is 110px tall (matches CSS). Center = ri * 110px offset.
  inner.style.transition = 'none';
  inner.style.transform  = `translateY(-${ri * 110}px)`;
}

// ─── Initial render ───────────────────────────────────────────────
for (let i = 0; i < REEL_COUNT; i++) renderReel(i);

// ─── UI helpers ───────────────────────────────────────────────────
function updateTokenDisplay() {
  tokenCountEl.textContent = tokens;
}

function updateBetDisplay() {
  betAmountEl.textContent = bet;
}

function updateStatsDisplay() {
  spinCountEl.textContent = spins;
  wonCountEl.textContent  = totalWon;
  lostCountEl.textContent = totalLost;
}

function setMessage(text, cls = '') {
  messageEl.textContent = text;
  messageEl.className   = 'message ' + cls;
}

function updateButtons() {
  const canSpin = tokens >= bet && !spinning;
  spinBtn.disabled  = !canSpin;
  maxBetBtn.disabled = spinning;
  betDownBtn.disabled = spinning || bet <= 5;
  betUpBtn.disabled   = spinning || bet >= tokens;
}

// ─── Lights animation ─────────────────────────────────────────────
let lightIntervalId = null;
const LIGHT_CLASSES = ['on-gold', 'on-neon', 'on-red'];

function startLights(fast = false) {
  clearInterval(lightIntervalId);
  let frame = 0;
  const interval = fast ? 80 : 250;
  lightIntervalId = setInterval(() => {
    BULBS.forEach((b, i) => {
      b.className = 'bulb';
      if ((i + frame) % 2 === 0) {
        b.classList.add(LIGHT_CLASSES[Math.floor(Math.random() * LIGHT_CLASSES.length)]);
      }
    });
    frame++;
  }, interval);
}

function stopLights(winMode = false) {
  clearInterval(lightIntervalId);
  BULBS.forEach(b => {
    b.className = 'bulb';
    if (winMode) b.classList.add('on-neon');
  });
}

function idleLights() {
  let frame = 0;
  clearInterval(lightIntervalId);
  lightIntervalId = setInterval(() => {
    BULBS.forEach((b, i) => {
      b.className = 'bulb';
      if ((i + frame) % 3 === 0) b.classList.add('on-gold');
    });
    frame++;
  }, 500);
}

idleLights();

// ─── Token pop animation ──────────────────────────────────────────
function popToken() {
  tokenCountEl.classList.remove('pop');
  void tokenCountEl.offsetWidth; // reflow
  tokenCountEl.classList.add('pop');
}

// ─── Win flash on machine ─────────────────────────────────────────
function flashMachine() {
  machineEl.classList.remove('win-flash');
  void machineEl.offsetWidth;
  machineEl.classList.add('win-flash');
  setTimeout(() => machineEl.classList.remove('win-flash'), 1300);
}

// ─── Spinning logic ───────────────────────────────────────────────
// Visual scroll: animate translateY from 0 down to -(totalPx), wrapping.
// We do a CSS transition on a cloned extended strip for smoothness.

function spinReel(reelIdx, finalSymbolIdx, delay, duration) {
  return new Promise(resolve => {
    const inner  = reelInners[reelIdx];
    const strip  = reelStrips[reelIdx];
    const symH   = 110; // px per symbol

    // How many full extra loops + final stop position
    const loops        = 3 + reelIdx; // each reel spins a bit more
    const startY       = reelResults[reelIdx] * symH;
    const targetOffset = finalSymbolIdx * symH;
    const totalDistance = loops * strip.length * symH + (targetOffset - startY);

    const finalTranslate = -(startY + totalDistance);
    // Simple method: set long transition, then snap-wrap at end.

    // Reset without transition
    inner.style.transition = 'none';
    inner.style.transform  = `translateY(-${startY}px)`;

    setTimeout(() => {
      // Kick off long animation
      inner.style.transition = `transform ${duration}ms cubic-bezier(0.17, 0.67, 0.35, 1.0)`;
      inner.style.transform  = `translateY(${finalTranslate}px)`;

      setTimeout(() => {
        // Snap to canonical position
        reelResults[reelIdx] = finalSymbolIdx;
        inner.style.transition = 'none';
        inner.style.transform  = `translateY(-${finalSymbolIdx * symH}px)`;
        resolve();
      }, duration + 50);
    }, delay);
  });
}

async function doSpin() {
  if (spinning || tokens < bet) return;

  spinning = true;
  updateButtons();

  // Deduct bet
  tokens -= bet;
  totalLost += bet;
  popToken();
  updateTokenDisplay();
  updateStatsDisplay();
  setMessage('Running inference...');

  startLights(true);

  // Rebuild strips with random result symbol placed at result index
  const finalIndices = [];
  for (let i = 0; i < REEL_COUNT; i++) {
    const newStrip = buildStrip();
    const finalIdx = Math.floor(Math.random() * newStrip.length);
    reelStrips[i]  = newStrip;
    renderReel(i); // re-render so DOM has new strip
    finalIndices.push(finalIdx);
  }

  // Spin all reels concurrently, staggered
  const BASE_DURATION = 900;
  const spinPromises = finalIndices.map((idx, i) =>
    spinReel(i, idx, i * 220, BASE_DURATION + i * 350)
  );

  await Promise.all(spinPromises);

  // ─── Evaluate result ───────────────────────────────────────────
  const resultPerReel = finalIndices.map((idx, i) => reelStrips[i][idx]);
  const names         = resultPerReel.map(s => s.name);

  let payout = 0;
  let msg    = '';
  let isWin  = false;

  if (names[0] === names[1] && names[1] === names[2]) {
    // Three of a kind
    const multiplier = PAYOUTS[names[0]]?.three ?? 5;
    payout = bet * multiplier;
    isWin  = true;
    const isJackpot = names[0] === 'BRAIN';
    msg = isJackpot
      ? pickQuip(JACKPOT_QUIPS, payout)
      : pickQuip(WIN_QUIPS, payout);
  } else if (names[0] === names[1] || names[1] === names[2] || names[0] === names[2]) {
    // Two of a kind — break even (1×)
    payout = bet;
    isWin  = true;
    msg    = `Two of a kind. Break-even. +${payout} ctx. The AI is unimpressed.`;
  } else {
    // No match
    msg = pickQuip(LOSE_QUIPS, bet);
  }

  spins++;

  if (isWin) {
    tokens   += payout;
    totalWon += payout;
    // totalLost already includes the bet cost; keep it as is for house-edge tracking
    stopLights(true);
    flashMachine();
    setMessage(msg, 'win');
  } else {
    stopLights(false);
    setMessage(msg, 'lose');
  }

  popToken();
  updateTokenDisplay();
  updateStatsDisplay();

  if (tokens <= 0) {
    tokens = 0;
    updateTokenDisplay();
    setMessage(BROKE_QUIP, 'lose');
    setTimeout(() => {
      if (confirm('You are out of tokens!\n\nBeg the VC gods for another seed round? (Reload for 100 free ctx)')) {
        location.reload();
      }
    }, 600);
  }

  spinning = false;
  updateButtons();
  idleLights();
}

// ─── Bet controls ─────────────────────────────────────────────────
betDownBtn.addEventListener('click', () => {
  if (bet > 5) { bet = Math.max(5, bet - 5); updateBetDisplay(); updateButtons(); }
});

betUpBtn.addEventListener('click', () => {
  if (bet < tokens) { bet = Math.min(tokens, bet + 5); updateBetDisplay(); updateButtons(); }
});

maxBetBtn.addEventListener('click', () => {
  bet = tokens;
  updateBetDisplay();
  updateButtons();
});

// ─── Spin button ──────────────────────────────────────────────────
spinBtn.addEventListener('click', doSpin);

// Spacebar = spin
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !e.repeat && !spinning && document.activeElement.tagName !== 'BUTTON') {
    e.preventDefault();
    doSpin();
  }
});

// ─── Init ─────────────────────────────────────────────────────────
updateTokenDisplay();
updateBetDisplay();
updateStatsDisplay();
updateButtons();
