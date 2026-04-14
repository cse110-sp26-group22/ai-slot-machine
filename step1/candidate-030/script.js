/* ===========================
   AI Token Slots — Logic
   =========================== */

'use strict';

// ---------- Symbol definitions ----------

const SYMBOLS = [
  { emoji: '🪙', name: 'token',       weight: 1,  payout: 500 },
  { emoji: '⚡', name: 'gpu',         weight: 2,  payout: 100 },
  { emoji: '🧠', name: 'brain',       weight: 4,  payout: 50  },
  { emoji: '🤖', name: 'robot',       weight: 6,  payout: 25  },
  { emoji: '💾', name: 'memory',      weight: 8,  payout: 15  },
  { emoji: '🎯', name: 'hallucinate', weight: 10, payout: 10  },
  { emoji: '📎', name: 'paperclip',   weight: 12, payout: 5   },
];

// Build weighted pool for random draws
const SYMBOL_POOL = SYMBOLS.flatMap(s => Array(s.weight).fill(s));

// AI-flavoured quips for each outcome tier
const QUIPS = {
  jackpot: [
    "Mined your own tokens! This is unprecedented. Have you tried prompting GPT-5?",
    "The model actually got one right. Frame this moment.",
    "Congratulations! You've unlocked the context window of infinite wealth.",
  ],
  bigwin: [
    "Even a broken model is right sometimes.",
    "Your luck is inversely proportional to your API bill.",
    "The gradient descended into profit for once.",
  ],
  win: [
    "A partial alignment! Almost as good as an alignment tax.",
    "Two reels agreed — more consensus than most AI safety committees.",
    "Fine-tuned for mild success.",
  ],
  lose: [
    "404: Skill Not Found. Try a different prompt.",
    "Misaligned outputs detected. Classic.",
    "The model hallucinated a win, then corrected itself.",
    "Gradient descent: mostly descent.",
    "Your tokens have been redistributed to train the next model.",
    "Have you tried turning your luck off and on again?",
    "This result has been RLHF'd to maximize your disappointment.",
    "Insufficient context. Please provide more tokens.",
    "Error: reasoning capabilities not included in this spin.",
    "The AI confidently predicted the wrong symbols.",
  ],
  broke: [
    "You've run out of tokens. Just like every AI startup by Q3.",
    "Bankruptcy achieved. Classic product-market misfit.",
    "Token supply exhausted. Time to raise a Series A.",
  ],
};

// Win messages shown on the reels frame
const WIN_TITLES = {
  jackpot: ['JACKPOT!', 'TOKEN MILLIONAIRE!', 'COMPUTE GOD!'],
  bigwin:  ['BIG WIN!', 'GPU UNLOCKED!', 'PARALLELISED!'],
  win:     ['WINNER!', 'ALIGNED!', 'INFERENCE!'],
};

// ---------- State ----------

const state = {
  tokens:    100,
  bet:       5,
  spinning:  false,
  spins:     0,
  wins:      0,
  bestWin:   0,
  netPL:     0,
  streak:    0,          // positive = win streak, negative = loss streak
};

// Reel strip length (symbols above + centre + below)
const STRIP_SIZE = 9;

// ---------- DOM references ----------

const tokenDisplay  = document.getElementById('token-display');
const streakDisplay = document.getElementById('streak-display');
const resultMsg     = document.getElementById('result-message');
const spinBtn       = document.getElementById('spin-btn');
const resetBtn      = document.getElementById('reset-btn');
const reelsFrame    = document.querySelector('.reels-frame');
const winOverlay    = document.getElementById('win-overlay');
const winTitle      = document.getElementById('win-title');
const winAmount     = document.getElementById('win-amount');
const winQuip       = document.getElementById('win-quip');
const winEmoji      = document.getElementById('win-emoji');
const winCloseBtn   = document.getElementById('win-close-btn');

const statEls = {
  spins: document.getElementById('stat-spins'),
  wins:  document.getElementById('stat-wins'),
  best:  document.getElementById('stat-best'),
  net:   document.getElementById('stat-net'),
};

/** Each reel strip element, pre-populated with symbols */
const reelStrips = [0, 1, 2].map(i => document.getElementById(`reel-strip-${i}`));

// ---------- Helpers ----------

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickSymbol() {
  return pick(SYMBOL_POOL);
}

/** Build a full reel strip: STRIP_SIZE cells with random symbols */
function buildReelStrip(reelEl, finalSymbol) {
  reelEl.innerHTML = '';
  // Fill all but the centre (index STRIP_SIZE>>1) with random symbols
  const mid = Math.floor(STRIP_SIZE / 2);
  for (let i = 0; i < STRIP_SIZE; i++) {
    const div = document.createElement('div');
    div.className = 'reel-symbol';
    div.textContent = i === mid ? finalSymbol.emoji : pickSymbol().emoji;
    reelEl.appendChild(div);
  }
}

/** Returns a CSS easing for the reel spin that feels mechanical */
function reelEasing(index) {
  // Each reel stops slightly later
  return `cubic-bezier(0.25, 0.1, 0.05, 1.0)`;
}

// ---------- Reel animation ----------

/**
 * Animate a single reel strip to land on `finalSymbol`.
 * Uses CSS transitions for maximum compatibility.
 */
function animateReel(reelEl, finalSymbol, delay, duration) {
  return new Promise(resolve => {
    buildReelStrip(reelEl, finalSymbol);

    const symbolHeight = 40; // px — must match .reel-symbol height in CSS
    const mid          = Math.floor(STRIP_SIZE / 2);
    const startY       = -symbolHeight * 0.5;
    const endY         = -(mid * symbolHeight) + symbolHeight;

    // Snap to start without transition
    reelEl.style.transition = 'none';
    reelEl.style.transform  = `translateY(${startY}px)`;

    setTimeout(() => {
      // Force reflow so the snap registers before we add the transition
      void reelEl.offsetHeight;

      reelEl.style.transition = `transform ${duration}ms cubic-bezier(0.25, 0.1, 0.05, 1.0)`;
      reelEl.style.transform  = `translateY(${endY}px)`;

      // Resolve via transitionend, with a timeout fallback
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      reelEl.addEventListener('transitionend', finish, { once: true });
      setTimeout(finish, duration + 100); // fallback
    }, delay);
  });
}

// ---------- Payout logic ----------

/**
 * Given three symbols, return { tier, multiplier }.
 * tier: 'jackpot' | 'bigwin' | 'win' | 'lose'
 */
function evaluate(s0, s1, s2) {
  if (s0.name === s1.name && s1.name === s2.name) {
    // Three of a kind
    const mult = s0.payout;
    const tier = mult >= 100 ? 'jackpot' : mult >= 25 ? 'bigwin' : 'win';
    return { tier, multiplier: mult };
  }

  // Two of a kind
  if (s0.name === s1.name || s1.name === s2.name || s0.name === s2.name) {
    return { tier: 'win', multiplier: 2 };
  }

  return { tier: 'lose', multiplier: 0 };
}

// ---------- UI updates ----------

function refreshTokenDisplay(delta) {
  tokenDisplay.textContent = state.tokens;
  tokenDisplay.classList.remove('flash-win', 'flash-lose');
  void tokenDisplay.offsetWidth; // force reflow to restart animation
  if (delta > 0) tokenDisplay.classList.add('flash-win');
  else if (delta < 0) tokenDisplay.classList.add('flash-lose');
}

function updateStats() {
  statEls.spins.textContent = state.spins;
  statEls.wins.textContent  = state.wins;
  statEls.best.textContent  = state.bestWin;
  const net = state.netPL;
  statEls.net.textContent   = (net >= 0 ? '+' : '') + net;
  statEls.net.style.color   = net >= 0 ? 'var(--green)' : 'var(--red)';
}

function setResultMsg(text, cls) {
  resultMsg.className = 'result-message ' + cls;
  resultMsg.textContent = text;
}

function updateStreakDisplay() {
  if (state.streak >= 3) {
    streakDisplay.textContent = `🔥 ${state.streak}x streak`;
  } else if (state.streak <= -3) {
    streakDisplay.textContent = `❄️ ${Math.abs(state.streak)}x cold`;
  } else {
    streakDisplay.textContent = '';
  }
}

// ---------- Confetti ----------

function spawnConfetti(x, y, count = 25) {
  const colours = ['#f59e0b','#a855f7','#10b981','#3b82f6','#ef4444','#fff'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left            = `${x + (Math.random() - 0.5) * 120}px`;
    el.style.top             = `${y + (Math.random() - 0.5) * 30}px`;
    el.style.background      = pick(colours);
    el.style.animationDelay  = `${Math.random() * 0.4}s`;
    el.style.animationDuration = `${0.7 + Math.random() * 0.5}s`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

// ---------- Win overlay ----------

function showWinOverlay(tier, amount, symbols) {
  const titleText = pick(WIN_TITLES[tier] || WIN_TITLES.win);
  const quipText  = pick(QUIPS[tier] || QUIPS.win);
  const emoji     = symbols[0].emoji;

  winEmoji.textContent  = emoji;
  winTitle.textContent  = titleText;
  winAmount.textContent = `+${amount} tokens`;
  winQuip.textContent   = quipText;

  winOverlay.classList.add('visible');
  winOverlay.setAttribute('aria-hidden', 'false');

  // Confetti burst at overlay centre
  const rect = winOverlay.getBoundingClientRect();
  spawnConfetti(rect.width / 2, rect.height / 3, tier === 'jackpot' ? 60 : 30);
}

function hideWinOverlay() {
  winOverlay.classList.remove('visible');
  winOverlay.setAttribute('aria-hidden', 'true');
}

// ---------- Core spin ----------

async function spin() {
  if (state.spinning) return;
  if (state.tokens < state.bet) {
    setResultMsg('Not enough tokens! Hit REFILL.', 'lose');
    return;
  }

  state.spinning = true;
  spinBtn.disabled = true;
  spinBtn.classList.add('spinning');

  // Deduct bet upfront
  state.tokens -= state.bet;
  state.netPL  -= state.bet;
  state.spins++;
  refreshTokenDisplay(-state.bet);
  setResultMsg('Inference in progress...', '');

  // Draw three random result symbols
  const results = [pickSymbol(), pickSymbol(), pickSymbol()];

  // Animate reels (staggered stops)
  const durations = [600, 800, 1050];
  const delays    = [0,   150, 320];

  await Promise.all(
    reelStrips.map((strip, i) => animateReel(strip, results[i], delays[i], durations[i]))
  );

  // Evaluate
  const { tier, multiplier } = evaluate(...results);
  const winnings = tier !== 'lose' ? state.bet * multiplier : 0;

  state.tokens += winnings;
  state.netPL  += winnings;

  if (tier !== 'lose') {
    state.wins++;
    state.bestWin = Math.max(state.bestWin, winnings);
    state.streak  = Math.max(0, state.streak) + 1;

    reelsFrame.classList.remove('win-flash');
    void reelsFrame.offsetWidth;
    reelsFrame.classList.add('win-flash');

    if (tier === 'jackpot' || tier === 'bigwin') {
      showWinOverlay(tier, winnings, results);
    } else {
      setResultMsg(`${pick(QUIPS.win)} +${winnings} tokens`, 'win');
    }
  } else {
    state.streak = Math.min(0, state.streak) - 1;
    const quip = state.tokens <= 0 ? pick(QUIPS.broke) : pick(QUIPS.lose);
    setResultMsg(quip, 'lose');
  }

  refreshTokenDisplay(winnings > 0 ? winnings : 0);
  updateStats();
  updateStreakDisplay();

  // Auto-disable spin if broke
  if (state.tokens < Math.min(...[5, 10, 25])) {
    setResultMsg(pick(QUIPS.broke), 'lose');
  }

  state.spinning = false;
  spinBtn.disabled = false;
  spinBtn.classList.remove('spinning');
}

// ---------- Reset ----------

function resetGame() {
  state.tokens  = 100;
  state.spins   = 0;
  state.wins    = 0;
  state.bestWin = 0;
  state.netPL   = 0;
  state.streak  = 0;
  refreshTokenDisplay(1);
  setResultMsg('Feed me tokens to begin...', '');
  updateStats();
  updateStreakDisplay();
  // Clear reel strips back to idle
  reelStrips.forEach(strip => {
    strip.innerHTML = '';
    strip.style.transform = '';
    for (let i = 0; i < STRIP_SIZE; i++) {
      const div = document.createElement('div');
      div.className = 'reel-symbol';
      div.textContent = pickSymbol().emoji;
      strip.appendChild(div);
    }
    // Show middle cell
    const mid = Math.floor(STRIP_SIZE / 2);
    strip.style.transform = `translateY(${-(mid * 40) + 40}px)`;
  });
}

// ---------- Bet selection ----------

document.querySelectorAll('.bet-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (state.spinning) return;
    document.querySelectorAll('.bet-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.bet = parseInt(btn.dataset.bet, 10);
  });
});

// ---------- Event listeners ----------

spinBtn.addEventListener('click', spin);
resetBtn.addEventListener('click', resetGame);
winCloseBtn.addEventListener('click', hideWinOverlay);

// Keyboard shortcut: Space to spin
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !e.target.closest('button, input, select')) {
    e.preventDefault();
    spin();
  }
  if (e.code === 'Enter' && winOverlay.classList.contains('visible')) {
    hideWinOverlay();
  }
});

// ---------- Init ----------

resetGame();
