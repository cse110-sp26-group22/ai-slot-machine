'use strict';

// ── Symbols ──────────────────────────────────────────────────────────────────
const SYMBOLS = [
  { emoji: '🤖', label: 'Robot',    weight: 2 },
  { emoji: '💀', label: 'Skull',    weight: 3 },
  { emoji: '🧠', label: 'Brain',    weight: 4 },
  { emoji: '📎', label: 'Paperclip',weight: 4 },
  { emoji: '🔥', label: 'Fire',     weight: 5 },
  { emoji: '💬', label: 'Chat',     weight: 6 },
  { emoji: '⚡', label: 'Zap',      weight: 8 },
  { emoji: '🐛', label: 'Bug',      weight: 8 },
];

// ── Payout table ─────────────────────────────────────────────────────────────
const PAYOUTS = {
  '🤖': { name: 'HALLUCINATION JACKPOT', tokens: 500, cls: 'jackpot' },
  '💀': { name: 'DEPRECATED',            tokens: 200, cls: 'jackpot' },
  '🧠': { name: 'CONTEXT WINDOW FULL',   tokens: 150, cls: 'jackpot' },
  '📎': { name: 'CLIPPY RETURNS',        tokens: 100, cls: 'jackpot' },
  '🔥': { name: 'GPU ON FIRE',           tokens: 75,  cls: 'win'     },
  '💬': { name: 'INFINITE TOKENS',       tokens: 50,  cls: 'win'     },
  '⚡': { name: 'OVERLOADED',            tokens: 30,  cls: 'win'     },
  '🐛': { name: 'FOUND A BUG',          tokens: 20,  cls: 'win'     },
};

const SPIN_COST = 10;
const PAIR_BONUS = 5;
const SPIN_DURATION = 1800; // ms total
const STOP_DELAYS = [600, 900, 1200]; // each reel stops at this ms

// ── AI quips ─────────────────────────────────────────────────────────────────
const WIN_QUIPS = [
  'Model weights redistributed. Net positive.',
  'Tokens materialised from the void.',
  'Training data approves.',
  'Stochastic gradient descend-ed into profit.',
  'Loss function: minimised.',
];
const LOSE_QUIPS = [
  'Tokens consumed by the attention mechanism.',
  'Your context window is now empty.',
  'RLHF said no.',
  'Tokens evaporated into the embedding space.',
  'Model: "I am fairly confident you lost."',
  'GPUs spun up and immediately gave up.',
  '404: Winning not found.',
  'Hallucination detected — the win was never real.',
];

// ── State ─────────────────────────────────────────────────────────────────────
let tokens = 100;
let spinning = false;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const tokenEl    = document.getElementById('token-count');
const spinBtn    = document.getElementById('spin-btn');
const banner     = document.getElementById('result-banner');
const logList    = document.getElementById('log');
const overlay    = document.getElementById('modal-overlay');
const modalMsg   = document.getElementById('modal-msg');
const modalBtn   = document.getElementById('modal-btn');
const inners     = [0,1,2].map(i => document.getElementById(`inner${i}`));
const reels      = [0,1,2].map(i => document.getElementById(`reel${i}`));
const bulbs      = [0,1,2,3,4].map(i => document.getElementById(`b${i}`));

// ── Weighted random pick ──────────────────────────────────────────────────────
function pickSymbol() {
  const total = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);
  let r = Math.random() * total;
  for (const sym of SYMBOLS) {
    r -= sym.weight;
    if (r <= 0) return sym;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

// ── Update token display ──────────────────────────────────────────────────────
function setTokens(n) {
  tokens = n;
  tokenEl.textContent = tokens;
}

// ── Log entry ─────────────────────────────────────────────────────────────────
function addLog(msg, cls = '') {
  const li = document.createElement('li');
  li.textContent = msg;
  if (cls) li.classList.add(cls);
  logList.prepend(li);
  // trim log to 20 entries
  while (logList.children.length > 20) logList.removeChild(logList.lastChild);
}

// ── Lights animation ─────────────────────────────────────────────────────────
let lightTimer = null;
let lightAlt = false;

function startLights() {
  lightAlt = false;
  lightTimer = setInterval(() => {
    bulbs.forEach((b, i) => {
      b.classList.toggle('on', i % 2 === (lightAlt ? 1 : 0));
      b.classList.toggle('alt', lightAlt);
    });
    lightAlt = !lightAlt;
  }, 150);
}

function stopLights() {
  clearInterval(lightTimer);
  bulbs.forEach(b => { b.classList.remove('on', 'alt'); });
}

function flashLights(cls = '') {
  let count = 0;
  const t = setInterval(() => {
    bulbs.forEach(b => {
      b.classList.toggle('on');
      if (cls) b.classList.toggle(cls);
    });
    if (++count >= 10) clearInterval(t);
  }, 120);
}

// ── Reel spinning ─────────────────────────────────────────────────────────────
function buildReelStrip(reel) {
  // display a random ticker of symbols while spinning
  reel.innerHTML = '';
  const count = 6;
  for (let i = 0; i < count; i++) {
    const span = document.createElement('span');
    span.classList.add('reel-symbol');
    span.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].emoji;
    reel.appendChild(span);
  }
}

function setReelSymbol(innerEl, symbol) {
  innerEl.innerHTML = `<span class="reel-symbol">${symbol.emoji}</span>`;
}

// ── Main spin logic ──────────────────────────────────────────────────────────
function spin() {
  if (spinning || tokens < SPIN_COST) return;

  spinning = true;
  spinBtn.disabled = true;
  banner.textContent = '';
  banner.className = 'result-banner';

  setTokens(tokens - SPIN_COST);
  startLights();

  // Pick final symbols now (but reveal later)
  const results = [pickSymbol(), pickSymbol(), pickSymbol()];

  // Start spinning animation on all reels
  reels.forEach((r, i) => {
    r.classList.add('spinning');
    buildReelStrip(inners[i]);
  });

  // Stop each reel at staggered times
  STOP_DELAYS.forEach((delay, i) => {
    setTimeout(() => {
      reels[i].classList.remove('spinning');
      setReelSymbol(inners[i], results[i]);
    }, delay);
  });

  // Evaluate after last reel stops
  setTimeout(() => {
    stopLights();
    evaluate(results);
    spinning = false;
    spinBtn.disabled = tokens < SPIN_COST;
  }, SPIN_DURATION);
}

// ── Evaluate result ──────────────────────────────────────────────────────────
function evaluate(results) {
  const [a, b, c] = results.map(r => r.emoji);

  if (a === b && b === c) {
    // Three of a kind
    const p = PAYOUTS[a];
    const won = p ? p.tokens : 20;
    const name = p ? p.name : 'TRIPLE!';
    const cls  = p ? p.cls : 'win';

    setTokens(tokens + won);
    banner.textContent = `${a}${b}${c}  ${name}  +${won} tokens!`;
    banner.className = `result-banner ${cls}`;
    addLog(`[WIN] ${a}${b}${c} — ${name} +${won} 🪙`, cls);
    flashLights('alt');

    if (p && p.cls === 'jackpot') showModal(name, won);

  } else if (a === b || b === c || a === c) {
    // Pair
    setTokens(tokens + PAIR_BONUS);
    banner.textContent = `${a}${b}${c}  Pair — partial refund  +${PAIR_BONUS} tokens`;
    banner.className = 'result-banner';
    addLog(`[PAIR] ${a}${b}${c} +${PAIR_BONUS} 🪙`);
  } else {
    // No match
    const quip = LOSE_QUIPS[Math.floor(Math.random() * LOSE_QUIPS.length)];
    banner.textContent = `${a}${b}${c}  — ${quip}`;
    banner.className = 'result-banner lose';
    addLog(`[LOST] ${a}${b}${c} — ${quip}`, 'lose');
  }

  // Game over?
  if (tokens < SPIN_COST) {
    setTimeout(() => showGameOver(), 400);
  }
}

// ── Modals ────────────────────────────────────────────────────────────────────
function showModal(name, won) {
  modalMsg.innerHTML = `
    <strong style="font-size:1.6rem">🎉 ${name} 🎉</strong><br><br>
    You just won <strong style="color:#ffd700">${won} tokens</strong>!<br><br>
    <em style="font-size:0.8rem">The model is very proud of you (it was told to be).</em>
  `;
  overlay.classList.add('active');
}

function showGameOver() {
  modalMsg.innerHTML = `
    <strong style="font-size:1.4rem">💀 OUT OF TOKENS 💀</strong><br><br>
    The model has consumed all your tokens.<br>
    This is not a bug — it is a feature.<br><br>
    <em style="font-size:0.8rem">Restarting will cost you nothing. This time.</em>
  `;
  modalBtn.textContent = 'Restart (Free Trial™)';
  overlay.classList.add('active');
}

modalBtn.addEventListener('click', () => {
  overlay.classList.remove('active');
  modalBtn.textContent = 'OK';
  if (tokens < SPIN_COST) {
    // Restart
    setTokens(100);
    logList.innerHTML = '';
    banner.textContent = '';
    banner.className = 'result-banner';
    spinBtn.disabled = false;
    addLog('[SYSTEM] Free Trial™ credits applied. Terms may change without notice.', '');
  }
});

// ── Spin button ───────────────────────────────────────────────────────────────
spinBtn.addEventListener('click', spin);

// ── Keyboard shortcut (Space) ─────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !spinning && !overlay.classList.contains('active')) {
    e.preventDefault();
    spin();
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
(function init() {
  reels.forEach((_, i) => setReelSymbol(inners[i], SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]));
  addLog('[SYSTEM] TokenSlot™ initialised. Losses are non-refundable.', '');
  addLog('[SYSTEM] Press SPACE or click SPIN to haemorrhage tokens.', '');
})();
