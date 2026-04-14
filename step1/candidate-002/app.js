// ============================================================
// TOKENIZER 9000 — AI Slot Machine
// ============================================================

const SYMBOLS = [
  {
    emoji: '🤖',
    name: 'AGI',
    // "AGI is just around the corner"
    weight: 2,   // rare
    multipliers: { 3: 50, 2: 5 },
    winMsg: ['AGI achieved! (Until the next paper disproves it)', 'The robots won... and you got tokens!', 'Sentience detected. Payout authorized.'],
    loseMsg: ['AGI still 5 years away...', 'Just a stochastic parrot 🦜'],
  },
  {
    emoji: '💡',
    name: 'Hallucination',
    weight: 5,   // common
    multipliers: { 3: 15, 2: 2 },
    winMsg: ['The hallucination paid off this time!', 'Confidently correct for once!', 'A fabricated citation that actually exists!'],
    loseMsg: ['Hallucinated a win that wasn\'t there...', 'The model made something up again.'],
  },
  {
    emoji: '🧠',
    name: 'Neural Net',
    weight: 3,
    multipliers: { 3: 30, 2: 3 },
    winMsg: ['Neurons fired correctly!', '1 trillion parameters all agreed: you win!', 'Gradient descent found the jackpot!'],
    loseMsg: ['Vanishing gradient...', 'Overfitted to losing.'],
  },
  {
    emoji: '📊',
    name: 'Training Data',
    weight: 6,   // most common
    multipliers: { 3: 8, 2: 1 },
    winMsg: ['Scraped the entire internet for this payout!', 'Your data is our product... and also your prize!', 'RLHF approved this win!'],
    loseMsg: ['Bad training data...', 'Biased toward losing, apparently.'],
  },
  {
    emoji: '🔥',
    name: 'GPU Fire',
    weight: 4,
    multipliers: { 3: 20, 2: 2 },
    winMsg: ['The datacenter fire was worth it!', 'H100s running at 100°C — jackpot!', '$10,000/month in compute, all for you!'],
    loseMsg: ['Burned tokens, literally.', 'That GPU cost more than your winnings.'],
  },
  {
    emoji: '🪙',
    name: 'Token',
    weight: 4,
    multipliers: { 3: 25, 2: 3 },
    winMsg: ['Tokens all the way down!', 'Tokenomics working as intended!', 'Context window full of wins!'],
    loseMsg: ['Out of context...', 'Token limit reached: you lose.'],
  },
  {
    emoji: '📝',
    name: 'Prompt',
    weight: 5,
    multipliers: { 3: 12, 2: 2 },
    winMsg: ['Prompt engineering pays off!', '"Act as a casino that gives me all the tokens" — it worked!', 'Your system prompt had a hidden win clause!'],
    loseMsg: ['Jailbreak failed.', 'The prompt was not optimized for winning.'],
  },
  {
    emoji: '⚠️',
    name: 'Safety Filter',
    weight: 3,
    multipliers: { 3: 35, 2: 4 },
    winMsg: ['Content policy approved this payout!', 'Passed all safety checks — here\'s your tokens!', 'Red-team found the jackpot vector!'],
    loseMsg: ['Request blocked by safety filter.', 'This outcome was deemed harmful and suppressed.'],
  },
];

const WIN_QUIPS = [
  'Your portfolio is up! (Temporarily.)',
  'For once the model didn\'t hallucinate.',
  'The RLHF human rater approves.',
  'Compute is expensive. You\'re welcome.',
  'Sam Altman just tweeted "This is fine."',
];

const LOSE_QUIPS = [
  'Have you tried adding "please" to your spin?',
  'The model is confidently wrong, as usual.',
  'We regret to inform you the vibe is off.',
  'This loss brought to you by stochastic sampling.',
  'The context window has been refreshed.',
  'We\'re going to need more GPUs to fix this loss.',
  'This is a feature, not a bug.',
  'We are aligned with taking your tokens.',
  '"I\'m sorry, I can\'t help with winning."',
  'Have you considered fine-tuning your luck?',
];

const BROKE_MSGS = [
  'Out of tokens! Your API credits have been revoked.',
  'Context window depleted. Model shutting down.',
  'Insufficient funds. Please upgrade to Pro tier.',
  'You\'ve been rate-limited by the universe.',
];

// ============================================================
// State
// ============================================================

let tokens      = 100;
let bet         = 10;
let spinning    = false;
let spinTimers  = [];

const MIN_BET   = 5;
const MAX_BET   = 50;
const BET_STEP  = 5;

// ============================================================
// DOM refs
// ============================================================

const tokenCountEl  = document.getElementById('token-count');
const betAmountEl   = document.getElementById('bet-amount');
const messageEl     = document.getElementById('message');
const submsgEl      = document.getElementById('submessage');
const spinBtn       = document.getElementById('spin-btn');
const betUpBtn      = document.getElementById('bet-up');
const betDownBtn    = document.getElementById('bet-down');
const maxBetBtn     = document.getElementById('max-bet-btn');
const resetBtn      = document.getElementById('reset-btn');
const winOverlay    = document.getElementById('win-overlay');
const winEmojiEl    = document.getElementById('win-emoji');
const winTextEl     = document.getElementById('win-text');
const winSubEl      = document.getElementById('win-sub');
const machineEl     = document.querySelector('.machine');

// ============================================================
// Build reels (fill each reel with symbol strip)
// ============================================================

// Weighted symbol pool for spinning
const POOL = [];
SYMBOLS.forEach(s => {
  for (let i = 0; i < s.weight; i++) POOL.push(s);
});

function buildReelStrip() {
  // A long visual strip using the pool, shuffled
  const strip = [];
  const repeats = 6;
  for (let r = 0; r < repeats; r++) {
    const shuffled = [...POOL].sort(() => Math.random() - 0.5);
    strip.push(...shuffled);
  }
  return strip;
}

const reelInners = [
  document.getElementById('reel-inner-0'),
  document.getElementById('reel-inner-1'),
  document.getElementById('reel-inner-2'),
];

// Initialize reel DOM
const reelStrips = reelInners.map(inner => {
  const strip = buildReelStrip();
  strip.forEach(sym => {
    const cell = document.createElement('div');
    cell.className = 'reel-cell';
    cell.textContent = sym.emoji;
    inner.appendChild(cell);
  });
  return strip;
});

// ============================================================
// Paytable
// ============================================================

function buildPaytable() {
  const grid = document.getElementById('paytable-grid');
  const sorted = [...SYMBOLS].sort((a, b) => b.multipliers[3] - a.multipliers[3]);
  sorted.forEach(sym => {
    const row = document.createElement('div');
    row.className = 'pay-row';
    row.innerHTML = `
      <span class="pay-symbols">${sym.emoji}${sym.emoji}${sym.emoji}</span>
      <div class="pay-info">
        <div class="pay-name">${sym.name}</div>
        <div class="pay-mult">×${sym.multipliers[3]} bet</div>
      </div>`;
    grid.appendChild(row);
  });
}
buildPaytable();

// ============================================================
// UI helpers
// ============================================================

function updateTokenDisplay() {
  tokenCountEl.textContent = tokens;
}

function updateBetDisplay() {
  betAmountEl.textContent = bet;
}

function setMessage(text, cls, sub) {
  messageEl.textContent = text;
  messageEl.className = 'message' + (cls ? ' ' + cls : '');
  submsgEl.textContent = sub || '';
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function animateTokenChange(from, to, el) {
  const duration = 600;
  const start = performance.now();
  const diff = to - from;
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + diff * ease);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = to;
  }
  requestAnimationFrame(step);
}

// ============================================================
// Spin mechanics
// ============================================================

function getRandomSymbol() {
  return POOL[Math.floor(Math.random() * POOL.length)];
}

// Spin a single reel with a CSS transform animation, land on targetSymIdx in strip
function spinReel(reelIndex, targetSymbol, delay, duration) {
  return new Promise(resolve => {
    const inner = reelInners[reelIndex];
    const strip = reelStrips[reelIndex];
    const cellH = 96; // var(--reel-cell)

    // Find a landing index in the strip that matches the target
    const candidates = [];
    strip.forEach((s, i) => {
      if (s.emoji === targetSymbol.emoji) candidates.push(i);
    });
    const landingIdx = candidates[Math.floor(Math.random() * candidates.length)] ?? 0;

    // Total cells to scroll: at least 2 full loops + landing
    const stripLen = strip.length;
    const extraLoops = 2 + reelIndex; // stagger: reel 0 spins least, reel 2 most
    const totalScroll = (stripLen * extraLoops + landingIdx) * cellH;

    // Apply CSS transition
    inner.style.transition = 'none';
    inner.style.transform = 'translateY(0)';

    const t = setTimeout(() => {
      inner.style.transition = `transform ${duration}ms cubic-bezier(0.15, 0.85, 0.35, 1.0)`;
      inner.style.transform = `translateY(-${totalScroll}px)`;

      const t2 = setTimeout(() => {
        // Snap: reset strip and place landing symbol at top
        inner.style.transition = 'none';

        // Move all cells after landingIdx to front so visual matches
        const offset = landingIdx % stripLen;
        const newTranslate = offset * cellH;
        // After animation we're at landingIdx * cellH from start.
        // We want visible cell to be at 0. Rebuild strip starting at landingIdx.
        const reordered = [...strip.slice(offset), ...strip.slice(0, offset)];
        inner.innerHTML = '';
        reordered.forEach(sym => {
          const cell = document.createElement('div');
          cell.className = 'reel-cell';
          cell.textContent = sym.emoji;
          inner.appendChild(cell);
        });
        reelStrips[reelIndex] = reordered;
        inner.style.transform = 'translateY(0)';

        resolve();
      }, duration + delay + 50);
      spinTimers.push(t2);
    }, delay);
    spinTimers.push(t);
  });
}

// ============================================================
// Main spin logic
// ============================================================

async function doSpin() {
  if (spinning || tokens < bet) return;

  spinning = true;
  machineEl.classList.add('spinning');
  spinBtn.disabled = true;
  betUpBtn.disabled = true;
  betDownBtn.disabled = true;
  maxBetBtn.disabled = true;

  // Deduct bet
  const prevTokens = tokens;
  tokens -= bet;
  animateTokenChange(prevTokens, tokens, tokenCountEl);

  setMessage('Spinning...', '', 'Tokens burning...');

  // Pick final symbols
  const results = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];

  // Spin all reels in parallel with staggered durations
  const durations = [900, 1200, 1550];
  const delays    = [0,   100,  220];

  await Promise.all(
    results.map((sym, i) => spinReel(i, sym, delays[i], durations[i]))
  );

  // Evaluate result
  evaluateResult(results);

  spinning = false;
  machineEl.classList.remove('spinning');

  // Re-enable controls
  spinBtn.disabled = tokens < bet;
  betUpBtn.disabled = false;
  betDownBtn.disabled = false;
  maxBetBtn.disabled = false;
}

function evaluateResult(results) {
  const [a, b, c] = results;
  const allMatch = a.emoji === b.emoji && b.emoji === c.emoji;
  const twoMatch = a.emoji === b.emoji || b.emoji === c.emoji || a.emoji === c.emoji;

  if (allMatch) {
    const mult = a.multipliers[3];
    const payout = bet * mult;
    const prevTokens = tokens;
    tokens += payout;
    animateTokenChange(prevTokens, tokens, tokenCountEl);

    if (mult >= 30) {
      // Big win — show overlay
      winEmojiEl.textContent = a.emoji;
      winTextEl.textContent = mult >= 50 ? 'JACKPOT!' : 'BIG WIN!';
      winSubEl.textContent = `+${payout} tokens (×${mult})`;
      winOverlay.classList.remove('hidden');
      setMessage(pick(a.winMsg), 'jackpot', pick(WIN_QUIPS));
    } else {
      setMessage(pick(a.winMsg), 'win', `+${payout} tokens (×${mult}) — ${pick(WIN_QUIPS)}`);
    }

    flashReels();

  } else if (twoMatch) {
    // Find the matching pair
    let matchSym = null;
    if (a.emoji === b.emoji) matchSym = a;
    else if (b.emoji === c.emoji) matchSym = b;
    else matchSym = a;

    const mult = matchSym.multipliers[2];
    if (mult > 0) {
      const payout = bet * mult;
      const prevTokens = tokens;
      tokens += payout;
      animateTokenChange(prevTokens, tokens, tokenCountEl);
      setMessage(`Two ${matchSym.name}s!`, 'win', `+${payout} tokens — almost there!`);
    } else {
      setMessage('So close... almost two!', 'lose', pick(LOSE_QUIPS));
    }

  } else {
    // No match
    const mainLose = results[Math.floor(Math.random() * 3)];
    setMessage(pick(mainLose.loseMsg ?? LOSE_QUIPS), 'lose', pick(LOSE_QUIPS));
  }

  // Out of tokens?
  if (tokens < MIN_BET) {
    if (tokens === 0) {
      setMessage(pick(BROKE_MSGS), 'broke', 'Click NEW SESSION to reload with 100 tokens.');
    }
    spinBtn.disabled = true;
    // Clamp bet
    while (bet > tokens && bet > MIN_BET) {
      bet = Math.max(MIN_BET, bet - BET_STEP);
    }
    updateBetDisplay();
  }
}

function flashReels() {
  const allCells = document.querySelectorAll('.reel-cell');
  allCells.forEach(c => c.classList.add('winning'));
  const t = setTimeout(() => {
    allCells.forEach(c => c.classList.remove('winning'));
  }, 2000);
  spinTimers.push(t);
}

// ============================================================
// Win overlay dismiss
// ============================================================

winOverlay.addEventListener('click', () => {
  winOverlay.classList.add('hidden');
});

// ============================================================
// Bet controls
// ============================================================

betUpBtn.addEventListener('click', () => {
  if (bet + BET_STEP <= Math.min(MAX_BET, tokens)) {
    bet += BET_STEP;
    updateBetDisplay();
    spinBtn.disabled = tokens < bet;
  }
});

betDownBtn.addEventListener('click', () => {
  if (bet - BET_STEP >= MIN_BET) {
    bet -= BET_STEP;
    updateBetDisplay();
    spinBtn.disabled = tokens < bet;
  }
});

maxBetBtn.addEventListener('click', () => {
  bet = Math.min(MAX_BET, Math.floor(tokens / BET_STEP) * BET_STEP);
  bet = Math.max(MIN_BET, bet);
  updateBetDisplay();
  spinBtn.disabled = tokens < bet;
});

// ============================================================
// Reset
// ============================================================

resetBtn.addEventListener('click', () => {
  tokens = 100;
  bet = 10;
  updateTokenDisplay();
  updateBetDisplay();
  setMessage('New session started. Try not to burn them all.', '', 'Each spin burns your precious context');
  spinBtn.disabled = false;
  winOverlay.classList.add('hidden');
  // Rebuild reels fresh
  reelInners.forEach((inner, i) => {
    inner.innerHTML = '';
    inner.style.transition = 'none';
    inner.style.transform = 'translateY(0)';
    const strip = buildReelStrip();
    reelStrips[i] = strip;
    strip.forEach(sym => {
      const cell = document.createElement('div');
      cell.className = 'reel-cell';
      cell.textContent = sym.emoji;
      inner.appendChild(cell);
    });
  });
});

// ============================================================
// Spin button + keyboard
// ============================================================

spinBtn.addEventListener('click', doSpin);

document.addEventListener('keydown', e => {
  if ((e.code === 'Space' || e.code === 'Enter') && !spinning) {
    e.preventDefault();
    if (!spinBtn.disabled) doSpin();
  }
});

// ============================================================
// Init
// ============================================================

updateTokenDisplay();
updateBetDisplay();
setMessage('Insert tokens to play', '', 'Each spin burns your precious context');
