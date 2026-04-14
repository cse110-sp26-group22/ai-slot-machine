'use strict';

// ── Symbols ────────────────────────────────────────────────────────────────
const SYMBOLS = [
  { id: 'robot',    emoji: '🤖', label: 'GPT-∞',    weight: 5  },
  { id: 'brain',    emoji: '🧠', label: 'BigBrain',  weight: 6  },
  { id: 'fire',     emoji: '🔥', label: 'GPU🔥',     weight: 7  },
  { id: 'token',    emoji: '🪙', label: 'Token',     weight: 8  },
  { id: 'bug',      emoji: '🐛', label: 'Hallucin',  weight: 9  },
  { id: 'chart',    emoji: '📈', label: 'Benchmark', weight: 8  },
  { id: 'zap',      emoji: '⚡', label: 'Inference', weight: 7  },
  { id: 'diamond',  emoji: '💎', label: 'AGI',       weight: 2  },  // rare jackpot
];

// Build weighted pool for random picks
const POOL = [];
for (const sym of SYMBOLS) {
  for (let i = 0; i < sym.weight; i++) POOL.push(sym);
}

// ── Paytable (3-reel, center line) ─────────────────────────────────────────
// Each entry: [id, id, id] (null = any), multiplier, flavour text
const PAYTABLE = [
  { combo: ['diamond', 'diamond', 'diamond'], mult: 50,  cls: 'jackpot', msg: '🎉 AGI ACHIEVED! (collect your Nobel Prize)' },
  { combo: ['robot',   'robot',   'robot'  ], mult: 20,  cls: 'jackpot', msg: '🤖 Three chatbots in a trench coat — JACKPOT!' },
  { combo: ['brain',   'brain',   'brain'  ], mult: 15,  cls: 'win',     msg: '🧠 Emergent reasoning — or just vibes?' },
  { combo: ['fire',    'fire',    'fire'   ], mult: 12,  cls: 'win',     msg: '🔥 Your data center bill just arrived.' },
  { combo: ['token',   'token',   'token'  ], mult: 10,  cls: 'win',     msg: '🪙 Token economy goes brrr!' },
  { combo: ['zap',     'zap',     'zap'    ], mult: 8,   cls: 'win',     msg: '⚡ Peak inference throughput achieved!' },
  { combo: ['chart',   'chart',   'chart'  ], mult: 6,   cls: 'win',     msg: '📈 Benchmark score up. Real-world score: unclear.' },
  { combo: ['bug',     'bug',     'bug'    ], mult: 4,   cls: 'win',     msg: '🐛 Triple hallucination — confidently wrong!' },
  // two-of-a-kind (any position)
  { combo: ['diamond', 'diamond', null     ], mult: 5,   cls: 'win',     msg: '💎 Two diamonds. Still chasing AGI.' },
  { combo: [null,      'diamond', 'diamond'], mult: 5,   cls: 'win',     msg: '💎 Two diamonds. Still chasing AGI.' },
  { combo: ['diamond', null,      'diamond'], mult: 5,   cls: 'win',     msg: '💎 Two diamonds. Still chasing AGI.' },
  { combo: ['robot',   'robot',   null     ], mult: 3,   cls: 'win',     msg: '🤖 Two robots. One is definitely a demo.' },
  { combo: [null,      'robot',   'robot'  ], mult: 3,   cls: 'win',     msg: '🤖 Two robots. One is definitely a demo.' },
  { combo: ['robot',   null,      'robot'  ], mult: 3,   cls: 'win',     msg: '🤖 Two robots. One is definitely a demo.' },
];

const LOSE_MSGS = [
  'Model collapse. Try again.',
  'Insufficient context. Please hallucinate harder.',
  'Error 404: Tokens not found.',
  'Your prompt was not well-aligned.',
  'RLHF would not approve of this spin.',
  'Output tokens burned. No refunds.',
  'The vibes were off. Spinning again costs extra.',
  'Stochastic parrot says: no.',
  'Attention is all you need. Money helps too.',
  'Fine-tuning required. And a Series C.',
  'Your inference budget has been revised downward.',
  'Context window exceeded — your luck was truncated.',
];

// ── State ──────────────────────────────────────────────────────────────────
const STARTING_BALANCE = 100;
let balance  = STARTING_BALANCE;
let bet      = 10;
let netWin   = 0;
let spinning = false;

// ── DOM refs ────────────────────────────────────────────────────────────────
const $balance     = document.getElementById('balance');
const $bet         = document.getElementById('bet');
const $netWin      = document.getElementById('net-win');
const $message     = document.getElementById('message');
const $spinBtn     = document.getElementById('spin-btn');
const $costDisplay = document.getElementById('cost-display');
const $resetBtn    = document.getElementById('reset-btn');
const $betUp       = document.getElementById('bet-up');
const $betDown     = document.getElementById('bet-down');
const $machine     = document.querySelector('.machine');

const reelInners = [
  document.getElementById('reel-inner-0'),
  document.getElementById('reel-inner-1'),
  document.getElementById('reel-inner-2'),
];

// ── Utilities ───────────────────────────────────────────────────────────────
function pick() { return POOL[Math.floor(Math.random() * POOL.length)]; }

function updateUI() {
  $balance.textContent = balance;
  $bet.textContent = bet;
  $costDisplay.textContent = bet;

  const nw = netWin;
  $netWin.textContent = (nw >= 0 ? '+' : '') + nw;
  $netWin.className = 'value ' + (nw > 0 ? 'positive' : nw < 0 ? 'negative' : '');

  $spinBtn.disabled = spinning || balance < bet;
  $betDown.disabled = spinning || bet <= 5;
  $betUp.disabled   = spinning || bet >= 100 || bet >= balance;
}

function renderPaytable() {
  const $rows = document.getElementById('paytable-rows');
  $rows.innerHTML = '';
  for (const p of PAYTABLE) {
    const symbols = p.combo.map(id => {
      if (id === null) return '❓';
      return SYMBOLS.find(s => s.id === id).emoji;
    }).join(' ');
    const row = document.createElement('div');
    row.className = 'pay-row';
    row.innerHTML = `
      <span class="pay-symbols">${symbols}</span>
      <span class="pay-desc">${p.msg.replace(/^[^\s]+\s/, '').slice(0, 38)}…</span>
      <span class="pay-mult">×${p.mult}</span>
    `;
    $rows.appendChild(row);
  }
}

// ── Reel rendering ──────────────────────────────────────────────────────────
const VISIBLE = 1;     // cells visible in the window
const STRIP   = 20;    // cells per strip for illusion of spinning

function makeCell(sym) {
  const div = document.createElement('div');
  div.className = 'reel-cell';
  div.innerHTML = `<span>${sym.emoji}</span><span class="sym-label">${sym.label}</span>`;
  return div;
}

function buildStrip(inner, finalSym) {
  inner.innerHTML = '';
  // Fill strip with random symbols, ending with the final result
  const cells = [];
  for (let i = 0; i < STRIP - 1; i++) cells.push(pick());
  cells.push(finalSym);
  for (const sym of cells) inner.appendChild(makeCell(sym));
  // Reset to top instantly
  inner.style.transition = 'none';
  inner.style.transform  = 'translateY(0)';
}

function animateReel(inner, delay) {
  return new Promise(resolve => {
    const cellH = 100; // px, matches --cell-h
    const totalCells = inner.children.length;
    const targetY = -cellH * (totalCells - 1); // scroll to last cell

    // small delay so reels stop sequentially
    setTimeout(() => {
      inner.classList.add('spinning');
      inner.style.transition = `transform ${0.55 + delay * 0.15}s cubic-bezier(0.17, 0.67, 0.35, 1)`;
      inner.style.transform  = `translateY(${targetY}px)`;
      inner.addEventListener('transitionend', () => {
        inner.classList.remove('spinning');
        resolve();
      }, { once: true });
    }, delay);
  });
}

// ── Evaluate result ─────────────────────────────────────────────────────────
function evaluate(results) {
  const ids = results.map(s => s.id);
  for (const p of PAYTABLE) {
    const match = p.combo.every((req, i) => req === null || req === ids[i]);
    if (match) return p;
  }
  return null;
}

// ── Spin ────────────────────────────────────────────────────────────────────
async function spin() {
  if (spinning || balance < bet) return;
  spinning = true;
  updateUI();

  // Deduct bet
  balance -= bet;
  netWin  -= bet;
  updateUI();

  // Pick outcomes
  const results = [pick(), pick(), pick()];

  // Build and animate reels
  for (let i = 0; i < 3; i++) buildStrip(reelInners[i], results[i]);

  // Tiny rAF to let DOM settle before starting transitions
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  const animations = reelInners.map((inner, i) => animateReel(inner, i * 200));
  await Promise.all(animations);

  // Evaluate
  const hit = evaluate(results);
  if (hit) {
    const winAmt = bet * hit.mult;
    balance += winAmt;
    netWin  += winAmt;
    $message.textContent = hit.msg + ` (+${winAmt} tokens)`;
    $message.className   = hit.cls;
    $machine.classList.add(hit.cls);
    setTimeout(() => $machine.classList.remove(hit.cls), 2200);
  } else {
    const msg = LOSE_MSGS[Math.floor(Math.random() * LOSE_MSGS.length)];
    $message.textContent = msg;
    $message.className   = 'lose';
  }

  spinning = false;
  updateUI();

  if (balance < 5) {
    $message.textContent = '💀 Bankrupt. Your startup pivoted to blockchain.';
    $message.className = 'lose';
  }
}

// ── Event listeners ─────────────────────────────────────────────────────────
$spinBtn.addEventListener('click', spin);

document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    spin();
  }
});

$betUp.addEventListener('click', () => {
  const steps = [5, 10, 25, 50, 100];
  const idx = steps.indexOf(bet);
  if (idx < steps.length - 1) bet = steps[idx + 1];
  updateUI();
});
$betDown.addEventListener('click', () => {
  const steps = [5, 10, 25, 50, 100];
  const idx = steps.indexOf(bet);
  if (idx > 0) bet = steps[idx - 1];
  updateUI();
});

$resetBtn.addEventListener('click', () => {
  balance = STARTING_BALANCE;
  netWin  = 0;
  spinning = false;
  $message.textContent = 'Series B secured. Back to losing tokens.';
  $message.className   = '';
  updateUI();
});

// ── Init ────────────────────────────────────────────────────────────────────
renderPaytable();
updateUI();
