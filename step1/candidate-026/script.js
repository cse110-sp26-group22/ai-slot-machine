'use strict';

// ── Symbols ──────────────────────────────────────────────────────────────────
const SYMBOLS = [
  { id: 'robot',       emoji: '🤖', label: 'AI Model',      weight: 12 },
  { id: 'brain',       emoji: '🧠', label: 'Big Brain',     weight: 10 },
  { id: 'token',       emoji: '🪙', label: 'Token',         weight: 14 },
  { id: 'fire',        emoji: '🔥', label: 'GPU Fire',      weight: 11 },
  { id: 'chart',       emoji: '📉', label: 'AI Winter',     weight: 8  },
  { id: 'skull',       emoji: '💀', label: 'Deprecated',    weight: 6  },
  { id: 'lightning',   emoji: '⚡', label: 'Fast Inference',weight: 9  },
  { id: 'halluc',      emoji: '🎭', label: 'Hallucination', weight: 7  },
  { id: 'diamond',     emoji: '💎', label: 'GPT-5',         weight: 3  },
  { id: 'money',       emoji: '💰', label: 'VC Money',      weight: 5  },
];

// ── Paytable (multipliers on bet for 3-of-a-kind) ────────────────────────────
const PAYOUTS = {
  robot:      { x3: 3,  x2: 0 },
  brain:      { x3: 4,  x2: 0 },
  token:      { x3: 5,  x2: 1 },
  fire:       { x3: 4,  x2: 0 },
  chart:      { x3: 6,  x2: 0 },
  skull:      { x3: 8,  x2: 0 },
  lightning:  { x3: 5,  x2: 0 },
  halluc:     { x3: 7,  x2: 0 },
  diamond:    { x3: 20, x2: 2 },
  money:      { x3: 15, x2: 1 },
};

// ── Messages ─────────────────────────────────────────────────────────────────
const WIN_MSGS = [
  '✅ No hallucinations detected! Tokens inbound!',
  '🧠 Model actually remembered! Jackpot!',
  '⚡ Inference completed without rate-limiting!',
  '💰 VC funding approved! You win tokens!',
  '🎉 Context window not exceeded! Big win!',
  '🤖 The AI aligned… for once. You win!',
  '🪙 OpenAI forgot to charge you this round!',
  '🚀 GPT-5 shipped on time! Collect your tokens!',
];
const JACKPOT_MSGS = [
  '🏆 JACKPOT! AGI achieved! (Temporarily.)',
  '💎 MEGA WIN! The model became sentient and paid you back!',
  '🌟 JACKPOT! Even Sam Altman is impressed!',
  '🎰 ULTRA WIN! The context window is infinite today!',
];
const LOSE_MSGS = [
  '💀 Model hallucinated your tokens away…',
  '📉 Rate limit exceeded. Tokens consumed.',
  '🔥 GPU overheated. Training run cancelled.',
  '🎭 The AI confidently gave the wrong answer. Again.',
  '💸 Tokens vanished into the embedding space.',
  '🤖 Model deprecated mid-spin. Tokens lost.',
  '😅 Prompt injection detected. Tokens forfeited.',
  '⏳ Token limit exceeded. Response truncated—',
  '🧠 Out of context. Literally.',
  '📊 RLHF feedback was negative. Tokens deducted.',
];

// ── State ─────────────────────────────────────────────────────────────────────
let balance    = 1000;
let totalWon   = 0;
let totalLost  = 0;
let bet        = 25;
let spinning   = false;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const balanceEl   = document.getElementById('balance');
const totalWonEl  = document.getElementById('total-won');
const totalLostEl = document.getElementById('total-lost');
const betDisplay  = document.getElementById('bet-display');
const spinBtn     = document.getElementById('spin-btn');
const resultBanner= document.getElementById('result-banner');
const resultText  = document.getElementById('result-text');
const historyList = document.getElementById('history-list');
const brokeModal  = document.getElementById('broke-modal');
const refillBtn   = document.getElementById('refill-btn');
const reelsWindow = document.querySelector('.reels-window');

// ── Weighted random symbol picker ─────────────────────────────────────────────
function totalWeight() { return SYMBOLS.reduce((s, sym) => s + sym.weight, 0); }
function pickSymbol() {
  let r = Math.random() * totalWeight();
  for (const sym of SYMBOLS) { r -= sym.weight; if (r <= 0) return sym; }
  return SYMBOLS[SYMBOLS.length - 1];
}

// ── Build reel tracks ─────────────────────────────────────────────────────────
const VISIBLE_ROWS = 1;   // only centre row matters for logic
const EXTRA_ROWS   = 12;  // extra symbols for scroll illusion

function buildReelTrack(trackEl) {
  const count = EXTRA_ROWS + VISIBLE_ROWS + EXTRA_ROWS;
  trackEl.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const div = document.createElement('div');
    div.className = 'reel-symbol';
    div.textContent = pickSymbol().emoji;
    trackEl.appendChild(div);
  }
}

const tracks = [
  document.getElementById('track-0'),
  document.getElementById('track-1'),
  document.getElementById('track-2'),
];

tracks.forEach(t => buildReelTrack(t));

// ── Spin animation ────────────────────────────────────────────────────────────
const SYMBOL_H = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--reel-h')) || 110;

function spinReel(trackEl, finalSymbol, delay) {
  return new Promise(resolve => {
    const symbols = trackEl.children;
    const total   = symbols.length;

    // Randomise all but the last visible symbol (centre = EXTRA_ROWS index)
    for (let i = 0; i < total; i++) {
      if (i !== EXTRA_ROWS) symbols[i].textContent = pickSymbol().emoji;
    }
    symbols[EXTRA_ROWS].textContent = finalSymbol.emoji;

    // Start position: show first symbol
    trackEl.style.transition = 'none';
    trackEl.style.top = '0px';

    // Scroll to centre symbol after delay
    setTimeout(() => {
      const targetTop = -(EXTRA_ROWS * SYMBOL_H);
      const duration  = 600 + Math.random() * 300;
      trackEl.style.transition = `top ${duration}ms cubic-bezier(0.17, 0.67, 0.35, 1.0)`;
      trackEl.style.top = `${targetTop}px`;
      setTimeout(resolve, duration + 50);
    }, delay);
  });
}

// ── Evaluate spin result ──────────────────────────────────────────────────────
function evaluate(results) {
  const ids = results.map(s => s.id);
  // Three of a kind
  if (ids[0] === ids[1] && ids[1] === ids[2]) {
    const payout = PAYOUTS[ids[0]];
    return { type: 'jackpot', multiplier: payout.x3 };
  }
  // Two of a kind (any pair)
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      if (ids[i] === ids[j]) {
        const payout = PAYOUTS[ids[i]];
        if (payout.x2 > 0) return { type: 'win', multiplier: payout.x2 };
      }
    }
  }
  return { type: 'lose', multiplier: 0 };
}

// ── Update UI numbers ─────────────────────────────────────────────────────────
function popEl(el) {
  el.classList.remove('pop');
  void el.offsetWidth; // reflow
  el.classList.add('pop');
  setTimeout(() => el.classList.remove('pop'), 200);
}

function updateBalance() {
  balanceEl.textContent  = balance.toLocaleString();
  totalWonEl.textContent = totalWon.toLocaleString();
  totalLostEl.textContent= totalLost.toLocaleString();
  popEl(balanceEl);
}

// ── History log ───────────────────────────────────────────────────────────────
function addHistory(symbols, outcome, amount) {
  const placeholder = historyList.querySelector('.placeholder');
  if (placeholder) placeholder.remove();

  const li   = document.createElement('li');
  const emojis = symbols.map(s => s.emoji).join(' ');
  const sign   = outcome === 'lose' ? '−' : '+';
  const cls    = outcome === 'lose' ? 'lose-log' : 'win-log';
  li.className = `history-item ${cls}`;
  li.textContent = `${emojis}  ${sign}${Math.abs(amount)} tkn`;
  historyList.insertBefore(li, historyList.firstChild);

  // Keep at most 30 entries
  while (historyList.children.length > 30) historyList.lastChild.remove();
}

// ── Main spin handler ─────────────────────────────────────────────────────────
async function doSpin() {
  if (spinning || balance < bet) return;
  spinning = true;
  spinBtn.disabled = true;

  // Deduct bet
  balance   -= bet;
  totalLost += bet;
  updateBalance();

  // Pick final symbols
  const results = [pickSymbol(), pickSymbol(), pickSymbol()];

  // Clear banner
  resultBanner.className = 'result-banner';
  resultText.textContent = '🔄 Running inference…';

  // Spin reels with staggered delays
  await Promise.all(
    tracks.map((t, i) => spinReel(t, results[i], i * 200))
  );

  // Evaluate
  const { type, multiplier } = evaluate(results);
  const winnings = bet * multiplier;

  if (type === 'jackpot') {
    balance   += winnings;
    totalWon  += winnings;
    totalLost -= bet; // remove bet from lost since it was a win
    updateBalance();
    resultBanner.className = 'result-banner jackpot';
    resultText.textContent = `${random(JACKPOT_MSGS)} (+${winnings} tkn)`;
    reelsWindow.className  = 'reels-window jackpot-flash';
    addHistory(results, 'win', winnings - bet);
  } else if (type === 'win') {
    balance   += winnings;
    totalWon  += winnings;
    const net = winnings - bet;
    if (net > 0) totalLost -= bet;
    updateBalance();
    resultBanner.className = 'result-banner win';
    resultText.textContent = `${random(WIN_MSGS)} (+${winnings} tkn)`;
    reelsWindow.className  = 'reels-window win-flash';
    addHistory(results, 'win', net);
  } else {
    resultBanner.className = 'result-banner lose';
    resultText.textContent = random(LOSE_MSGS);
    reelsWindow.className  = 'reels-window';
    addHistory(results, 'lose', -bet);
  }

  setTimeout(() => { reelsWindow.className = 'reels-window'; }, 2000);

  spinning = false;
  spinBtn.disabled = false;

  if (balance <= 0) showBrokeModal();
}

function random(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Bet buttons ───────────────────────────────────────────────────────────────
document.querySelectorAll('.bet-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (spinning) return;
    document.querySelectorAll('.bet-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (btn.dataset.bet === 'max') {
      bet = Math.min(balance, 100);
    } else {
      bet = parseInt(btn.dataset.bet, 10);
    }
    betDisplay.textContent = bet;
  });
});

spinBtn.addEventListener('click', doSpin);

// Keyboard shortcut: Space bar spins
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !spinning) { e.preventDefault(); doSpin(); }
});

// ── Broke modal ───────────────────────────────────────────────────────────────
function showBrokeModal() {
  brokeModal.classList.add('show');
}

refillBtn.addEventListener('click', () => {
  balance    = 1000;
  totalWon   = 0;
  totalLost  = 0;
  updateBalance();
  brokeModal.classList.remove('show');
  resultBanner.className = 'result-banner';
  resultText.textContent = 'Tokens refilled. The hallucinations continue.';
  tracks.forEach(t => buildReelTrack(t));
});

// ── Build paytable ────────────────────────────────────────────────────────────
function buildPaytable() {
  const grid = document.getElementById('paytable-grid');
  grid.innerHTML = '';

  const rows = [];
  for (const sym of SYMBOLS) {
    const p = PAYOUTS[sym.id];
    if (p.x3) rows.push({ sym, mult: p.x3, count: 3 });
    if (p.x2) rows.push({ sym, mult: p.x2, count: 2 });
  }
  rows.sort((a, b) => b.mult - a.mult);

  rows.forEach(({ sym, mult, count }) => {
    const row = document.createElement('div');
    row.className = 'pt-row';
    const emojis = Array(count).fill(sym.emoji).join('');
    row.innerHTML = `
      <span class="pt-symbols">${emojis}</span>
      <div style="display:flex;flex-direction:column;gap:1px">
        <span class="pt-label">${sym.label}</span>
      </div>
      <span class="pt-payout">×${mult}</span>
    `;
    grid.appendChild(row);
  });
}

buildPaytable();

// ── Decorative light strip ────────────────────────────────────────────────────
function buildLights() {
  const strip = document.getElementById('lights');
  strip.innerHTML = '';
  const colors = ['#7c3aed','#06b6d4','#f59e0b','#10b981','#ef4444'];
  for (let i = 0; i < 40; i++) {
    const dot = document.createElement('span');
    dot.style.cssText = `
      display:inline-block;
      flex:1;
      height:100%;
      background:${colors[i % colors.length]};
      opacity:${0.4 + 0.6 * Math.random()};
      animation: blink ${0.6 + Math.random() * 1.4}s ${Math.random() * 1.2}s ease-in-out infinite alternate;
    `;
    strip.appendChild(dot);
  }
}

// Add blink keyframe dynamically
const style = document.createElement('style');
style.textContent = `
  @keyframes blink {
    from { opacity: 0.2; }
    to   { opacity: 1.0; }
  }
`;
document.head.appendChild(style);

buildLights();
