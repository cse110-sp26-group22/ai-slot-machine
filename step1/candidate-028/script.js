'use strict';

// ── Symbol definitions ──────────────────────────────────────────────────────
const SYMBOLS = [
  { emoji: '🤖', name: 'Robot',       weight: 5 },
  { emoji: '🧠', name: 'Brain',       weight: 5 },
  { emoji: '💾', name: 'TrainingData',weight: 6 },
  { emoji: '🔥', name: 'GPU',         weight: 4 },
  { emoji: '💀', name: 'Hallucination',weight: 3 },
  { emoji: '⚡', name: 'Compute',     weight: 6 },
  { emoji: '📊', name: 'Benchmark',   weight: 5 },
  { emoji: '🎯', name: 'RLHF',        weight: 4 },
];

// Build weighted symbol pool
const POOL = SYMBOLS.flatMap(s => Array(s.weight).fill(s));

// ── Paytable ─────────────────────────────────────────────────────────────────
const PAYTABLE = [
  {
    symbols: ['🤖', '🤖', '🤖'],
    mult: 50,
    label: 'AGI Achieved™',
    msg: 'You\'ve achieved AGI! ...Still just autocomplete though. Enjoy your 50× tokens.',
    jackpot: true,
  },
  {
    symbols: ['🧠', '🧠', '🧠'],
    mult: 30,
    label: 'Emergent Behavior',
    msg: 'Emergent behavior detected! The model is now "sentient" — and so is your wallet.',
    jackpot: true,
  },
  {
    symbols: ['🔥', '🔥', '🔥'],
    mult: 25,
    label: 'GPU Meltdown',
    msg: 'THREE GPUs have melted into one glorious prize. NVIDIA stock +2%.',
    jackpot: false,
  },
  {
    symbols: ['💀', '💀', '💀'],
    mult: 40,
    label: 'Hallucination Jackpot',
    msg: 'You\'ve hallucinated a massive win! These tokens may or may not exist.',
    jackpot: true,
  },
  {
    symbols: ['⚡', '⚡', '⚡'],
    mult: 20,
    label: 'Infinite Compute',
    msg: 'Sam Altman has promised you infinite compute. He meant tokens. You get tokens.',
    jackpot: false,
  },
  {
    symbols: ['📊', '📊', '📊'],
    mult: 15,
    label: 'SOTA on All Benchmarks',
    msg: 'State of the art! On benchmarks that the model was trained on. Still, 15× tokens!',
    jackpot: false,
  },
  {
    symbols: ['💾', '💾', '💾'],
    mult: 12,
    label: 'Scraping the Internet',
    msg: 'You\'ve harvested the entire internet\'s data. Copyright lawyers not included.',
    jackpot: false,
  },
  {
    symbols: ['🎯', '🎯', '🎯'],
    mult: 20,
    label: 'Perfect RLHF',
    msg: 'Human raters agreed: you\'re a winner! (They were paid $2/hour to say that.)',
    jackpot: false,
  },
  // Two-of-a-kind pairs
  {
    symbols: ['🤖', '🤖', null],
    mult: 3,
    label: 'Robot Pair',
    msg: 'Two robots agreed on an answer. That\'s already better than one hallucinating alone.',
    jackpot: false,
  },
  {
    symbols: ['🧠', '🧠', null],
    mult: 3,
    label: 'Double Brain',
    msg: 'Two brains! Unfortunately still no common sense.',
    jackpot: false,
  },
  {
    symbols: ['🔥', '🔥', null],
    mult: 2,
    label: 'Two GPUs Burning',
    msg: 'Two GPUs on fire. NVIDIA is happy. You get 2× tokens.',
    jackpot: false,
  },
  {
    symbols: ['💀', '💀', null],
    mult: 4,
    label: 'Double Hallucination',
    msg: 'Two hallucinations that agree with each other. That\'s basically a fact now.',
    jackpot: false,
  },
];

// ── Loss messages ─────────────────────────────────────────────────────────────
const LOSS_MSGS = [
  'No match. The model confidently predicted you\'d win. It was wrong.',
  'Loss detected. Model is hallucinating an apology right now.',
  'Context window exceeded — your luck was truncated.',
  'The model\'s reasoning: "You deserved to win." Outcome: you didn\'t.',
  'According to our benchmark, you performed at 0% on the Winning task.',
  'Tokens burned. The GPU heat is now contributing to climate change.',
  'No pattern found. Perhaps try prompt engineering your luck.',
  'Inference complete. Result: skill issue (source: AI).',
  'Loss. The AI is currently generating 500 words explaining why this was actually good.',
  'Not a match. Have you tried turning off reasoning and on again?',
  'Your tokens have been redistributed to early investors.',
  'Alignment failure: the model aligned your hopes with disappointment.',
];

const SPIN_MSGS = [
  'Running inference... burning tokens...',
  'Querying the void...',
  'Consulting the stochastic parrot...',
  'Computing attention scores...',
  'Sampling from the distribution...',
  'Forwarding through 96 transformer layers...',
  'Asking GPT what you should win...',
  'Training on your bad luck...',
];

const MODEL_NAMES = [
  'GPT-∞ Turbo Ultra Pro Max',
  'Llama-99B-Instinct-Unchained',
  'Claude Opus Infinity Preview',
  'Gemini Ultra Mega Deluxe',
  'DeepSeek-R2-D2-Ultra',
  'Mistral Nebula Explosion',
  'Grok-4 Sarcasm Edition',
  'Phi-∞ Tiny But Mighty',
];

// ── State ─────────────────────────────────────────────────────────────────────
let balance    = 1000;
let bet        = 25;
let totalBurned = 0;
let winStreak  = 0;
let spinning   = false;
let spinCount  = 0;
let reelResults = ['🤖', '🧠', '💾'];

// ── DOM refs ──────────────────────────────────────────────────────────────────
const balanceEl    = document.getElementById('balance');
const burnedEl     = document.getElementById('total-burned');
const streakEl     = document.getElementById('win-streak');
const statusEl     = document.getElementById('status');
const spinBtn      = document.getElementById('spin-btn');
const refillBtn    = document.getElementById('refill-btn');
const logEntries   = document.getElementById('log-entries');
const clearLogBtn  = document.getElementById('clear-log');
const modelBadge   = document.getElementById('model-badge');
const jackpotOverlay = createJackpotOverlay();
const brokeOverlay   = createBrokeOverlay();
let confettiCanvas, confettiCtx, confettiParticles = [];

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  buildStars();
  buildPaytable();
  setupBetButtons();
  setupConfetti();
  document.body.appendChild(jackpotOverlay);
  document.body.appendChild(brokeOverlay);

  spinBtn.addEventListener('click', handleSpin);
  refillBtn.addEventListener('click', confirmRefill);
  clearLogBtn.addEventListener('click', () => { logEntries.innerHTML = ''; });

  // Rotate model name every 8s
  setInterval(() => {
    modelBadge.textContent = MODEL_NAMES[Math.floor(Math.random() * MODEL_NAMES.length)];
  }, 8000);

  updateUI();
}

// ── Star field ────────────────────────────────────────────────────────────────
function buildStars() {
  const container = document.getElementById('stars');
  for (let i = 0; i < 120; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 2.5 + 0.5;
    star.style.cssText = [
      `width:${size}px`, `height:${size}px`,
      `left:${Math.random() * 100}%`, `top:${Math.random() * 100}%`,
      `--dur:${(Math.random() * 4 + 2).toFixed(1)}s`,
      `--op:${(Math.random() * 0.6 + 0.2).toFixed(2)}`,
    ].join(';');
    container.appendChild(star);
  }
}

// ── Paytable ──────────────────────────────────────────────────────────────────
function buildPaytable() {
  const container = document.getElementById('pay-rows');
  PAYTABLE.forEach(entry => {
    const row = document.createElement('div');
    row.className = 'pay-row';
    const syms = entry.symbols.map(s => s ?? '❓').join(' ');
    row.innerHTML = `
      <span class="pay-symbols">${syms}</span>
      <span class="pay-desc">${entry.label}</span>
      <span class="pay-mult">${entry.mult}×</span>
    `;
    container.appendChild(row);
  });
}

// ── Bet buttons ───────────────────────────────────────────────────────────────
function setupBetButtons() {
  document.querySelectorAll('.bet-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (spinning) return;
      document.querySelectorAll('.bet-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      bet = parseInt(btn.dataset.amount, 10);
      document.getElementById('current-bet').textContent = bet;
    });
  });
}

// ── Spin logic ────────────────────────────────────────────────────────────────
function handleSpin() {
  if (spinning) return;
  if (balance < bet) {
    showBrokeOverlay();
    return;
  }

  spinning = true;
  spinCount++;
  balance -= bet;
  totalBurned += bet;
  updateStats();
  disableControls(true);

  setStatus(SPIN_MSGS[Math.floor(Math.random() * SPIN_MSGS.length)], 'spin');
  addLog(`Spin #${spinCount}: Running inference (cost: ${bet} tokens)...`, 'log-spin');

  // Determine results now (before animation)
  reelResults = [pickSymbol(), pickSymbol(), pickSymbol()];

  animateReels(reelResults, () => {
    const outcome = evaluateOutcome(reelResults);
    finalizeSpin(outcome);
  });
}

function pickSymbol() {
  return POOL[Math.floor(Math.random() * POOL.length)].emoji;
}

// ── Reel animation ────────────────────────────────────────────────────────────
function animateReels(results, onComplete) {
  const durations = [600, 900, 1200]; // ms each reel spins before stopping
  const delays    = [0,   300, 600];

  const wrappers = [0, 1, 2].map(i => document.getElementById(`reel-${i}`));
  const strips   = [0, 1, 2].map(i => document.getElementById(`reel-strip-${i}`));

  // Start all reels spinning
  wrappers.forEach((w, i) => {
    w.classList.remove('winner');
    w.style.setProperty('--spin-dur', '0.12s');
    w.classList.add('spinning');
  });

  // Stop each reel in sequence
  let stopped = 0;
  wrappers.forEach((wrapper, i) => {
    setTimeout(() => {
      wrapper.classList.remove('spinning');
      // Set final symbol
      strips[i].innerHTML = `<div class="symbol">${results[i]}</div>`;
      // Small bounce
      wrapper.style.transform = 'scaleY(0.9)';
      requestAnimationFrame(() => {
        wrapper.style.transition = 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1)';
        wrapper.style.transform = 'scaleY(1)';
        setTimeout(() => { wrapper.style.transition = ''; }, 200);
      });

      stopped++;
      if (stopped === 3) {
        setTimeout(onComplete, 300);
      }
    }, delays[i] + durations[i]);
  });
}

// ── Outcome evaluation ────────────────────────────────────────────────────────
function evaluateOutcome(results) {
  const [a, b, c] = results;

  // Check three-of-a-kind
  for (const entry of PAYTABLE) {
    const [s0, s1, s2] = entry.symbols;
    if (s2 !== null) {
      if (a === s0 && b === s1 && c === s2) return { entry, results };
    }
  }

  // Check two-of-a-kind (null = wildcard position, meaning "any")
  for (const entry of PAYTABLE) {
    const [s0, s1, s2] = entry.symbols;
    if (s2 === null) {
      // Pair can appear in any two positions
      if (
        (a === s0 && b === s1) ||
        (a === s0 && c === s1) ||
        (b === s0 && c === s1)
      ) return { entry, results };
    }
  }

  return null; // loss
}

// ── Finalize spin ─────────────────────────────────────────────────────────────
function finalizeSpin(outcome) {
  spinning = false;
  disableControls(false);

  if (outcome) {
    const { entry } = outcome;
    const prize = bet * entry.mult;
    balance += prize;
    winStreak++;
    updateStats();

    highlightWinners(reelResults, entry);

    if (entry.jackpot) {
      showJackpotOverlay(entry, prize);
      launchConfetti();
    } else {
      setStatus(`WIN! +${prize} tokens — ${entry.label}`, 'win');
      addLog(`WIN +${prize} tokens (${entry.mult}×): ${entry.msg}`, 'log-win');
    }
  } else {
    winStreak = 0;
    updateStats();
    const lossMsg = LOSS_MSGS[Math.floor(Math.random() * LOSS_MSGS.length)];
    setStatus(lossMsg, 'lose');
    addLog(`LOSS (−${bet} tokens): ${lossMsg}`, 'log-lose');

    if (balance < Math.min(...[10, 25, 50, 100])) {
      setTimeout(showBrokeOverlay, 600);
    }
  }
}

function highlightWinners(results, entry) {
  const syms = entry.symbols;
  [0, 1, 2].forEach(i => {
    const w = document.getElementById(`reel-${i}`);
    // For three-of-a-kind: all win. For pairs: check matching positions.
    if (syms[2] !== null) {
      w.classList.add('winner');
    } else {
      if (
        (i === 0 && results[0] === syms[0] && results[1] === syms[1]) ||
        (i === 1 && results[0] === syms[0] && results[1] === syms[1]) ||
        (i === 0 && results[0] === syms[0] && results[2] === syms[1]) ||
        (i === 2 && results[0] === syms[0] && results[2] === syms[1]) ||
        (i === 1 && results[1] === syms[0] && results[2] === syms[1]) ||
        (i === 2 && results[1] === syms[0] && results[2] === syms[1])
      ) {
        w.classList.add('winner');
      }
    }
  });
  setTimeout(() => {
    document.querySelectorAll('.reel-wrapper').forEach(w => w.classList.remove('winner'));
  }, 3000);
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function updateUI() {
  updateStats();
}

function updateStats() {
  setCounterValue(balanceEl, balance);
  setCounterValue(burnedEl, totalBurned);
  setCounterValue(streakEl, winStreak);

  const minBet = Math.min(...Array.from(document.querySelectorAll('.bet-btn[data-amount]'), b => parseInt(b.dataset.amount)));
  spinBtn.disabled = balance < minBet && balance < bet;
}

function setCounterValue(el, val) {
  el.textContent = val.toLocaleString();
  el.classList.remove('pop');
  void el.offsetWidth; // reflow
  el.classList.add('pop');
  setTimeout(() => el.classList.remove('pop'), 200);
}

function setStatus(msg, type = '') {
  statusEl.textContent = msg;
  statusEl.className = 'status-text' + (type ? ` ${type}` : '');
}

function addLog(text, cls = '') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${cls}`;
  entry.textContent = `[${timestamp()}] ${text}`;
  logEntries.prepend(entry);
  // Cap log at 50 entries
  while (logEntries.children.length > 50) {
    logEntries.removeChild(logEntries.lastChild);
  }
}

function timestamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function disableControls(disabled) {
  spinBtn.disabled = disabled;
  document.querySelectorAll('.bet-btn').forEach(b => (b.disabled = disabled));
}

// ── Overlays ──────────────────────────────────────────────────────────────────
function createJackpotOverlay() {
  const el = document.createElement('div');
  el.className = 'jackpot-overlay';
  el.innerHTML = `
    <div class="jackpot-box">
      <span class="jackpot-emoji" id="jackpot-emoji">🎉</span>
      <div class="jackpot-title" id="jackpot-title">JACKPOT!</div>
      <p class="jackpot-msg" id="jackpot-msg"></p>
      <button class="jackpot-close" id="jackpot-close">Collect Tokens</button>
    </div>
  `;
  el.querySelector('#jackpot-close').addEventListener('click', () => {
    el.classList.remove('active');
  });
  return el;
}

function showJackpotOverlay(entry, prize) {
  const emojiMap = { '🤖🤖🤖': '🤯', '🧠🧠🧠': '🌌', '💀💀💀': '👻' };
  const key = entry.symbols.join('');
  jackpotOverlay.querySelector('#jackpot-emoji').textContent = emojiMap[key] || '🎊';
  jackpotOverlay.querySelector('#jackpot-title').textContent = `JACKPOT! +${prize.toLocaleString()} tokens`;
  jackpotOverlay.querySelector('#jackpot-msg').textContent = entry.msg;
  jackpotOverlay.classList.add('active');
  addLog(`JACKPOT +${prize} tokens: ${entry.msg}`, 'log-win');
}

function createBrokeOverlay() {
  const el = document.createElement('div');
  el.className = 'broke-overlay';
  el.innerHTML = `
    <div class="broke-box">
      <span class="broke-emoji">💸</span>
      <div class="broke-title">Out of Tokens</div>
      <p class="broke-msg">You've burned through your entire context budget. The model has nothing left to say. Get VC funding?</p>
      <button class="broke-close" id="broke-confirm">Get VC Funding</button>
      <button class="broke-cancel" id="broke-cancel">Suffer in Silence</button>
    </div>
  `;
  el.querySelector('#broke-confirm').addEventListener('click', () => {
    el.classList.remove('active');
    doRefill();
  });
  el.querySelector('#broke-cancel').addEventListener('click', () => {
    el.classList.remove('active');
  });
  return el;
}

function showBrokeOverlay() {
  brokeOverlay.classList.add('active');
}

function confirmRefill() {
  showBrokeOverlay();
}

function doRefill() {
  balance     = 1000;
  totalBurned = 0;
  winStreak   = 0;
  spinCount   = 0;
  updateUI();
  setStatus('VC funds secured! +1000 tokens. Burn rate: high.', 'spin');
  addLog('VC funding round complete. Balance restored to 1000 tokens.', 'log-info');
}

// ── Confetti ──────────────────────────────────────────────────────────────────
function setupConfetti() {
  confettiCanvas = document.createElement('canvas');
  confettiCanvas.id = 'confetti-canvas';
  document.body.appendChild(confettiCanvas);
  confettiCtx = confettiCanvas.getContext('2d');
  resizeConfetti();
  window.addEventListener('resize', resizeConfetti);
  requestAnimationFrame(tickConfetti);
}

function resizeConfetti() {
  confettiCanvas.width  = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

function launchConfetti() {
  const colors = ['#ffd700', '#6c63ff', '#ff6584', '#43e97b', '#f093fb'];
  for (let i = 0; i < 120; i++) {
    confettiParticles.push({
      x: Math.random() * confettiCanvas.width,
      y: -10,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.2,
      life: 1,
    });
  }
}

function tickConfetti() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiParticles = confettiParticles.filter(p => p.life > 0);
  confettiParticles.forEach(p => {
    p.x  += p.vx;
    p.y  += p.vy;
    p.rot += p.rotV;
    p.vy += 0.05;
    if (p.y > confettiCanvas.height) p.life = 0;

    confettiCtx.save();
    confettiCtx.globalAlpha = Math.min(p.life, 1);
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate(p.rot);
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
    confettiCtx.restore();
  });
  requestAnimationFrame(tickConfetti);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
init();
