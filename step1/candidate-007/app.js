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

// ── Pay combos (3-of-a-kind unless noted) ────────────────────────────────────
const PAY_TABLE = [
  { match: 'agi',     count: 3, mult: 50,  name: '🧠🧠🧠 AGI Achieved',       quip: 'Congratulations! You've achieved AGI. Anthropic has been notified. Please do not panic.' },
  { match: 'gpu',     count: 3, mult: 25,  name: '⚡⚡⚡ GPU Cluster',         quip: 'Three H100s just to generate your slot result. Worth it.' },
  { match: 'gpt',     count: 3, mult: 15,  name: '🤖🤖🤖 GPT Triple',         quip: 'ChatGPT, ChatGPT-4, and ChatGPT-4o walk into a bar. Same model, different price.' },
  { match: 'rlhf',    count: 3, mult: 12,  name: '🎯🎯🎯 Perfect Alignment',  quip: 'Your preferences have been captured. Your future self will also enjoy clicking "helpful".' },
  { match: 'halluc',  count: 3, mult: 8,   name: '🌀🌀🌀 Confident & Wrong',  quip: 'The model answered with 97% certainty. It was also completely made up. You win anyway.' },
  { match: 'prompt',  count: 3, mult: 6,   name: '💬💬💬 Prompt Engineer',    quip: '"Pretend you are a senior developer who…" → 50 tokens later: still wrong.' },
  { match: 'context', count: 3, mult: 5,   name: '📜📜📜 Max Context',        quip: 'You've filled the 128k context window with slot machine results. The model has forgotten your name.' },
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
const STRIP_LEN = 40; // symbols per reel strip (looped)
const VISIBLE   = 3;  // visible rows; middle = payline
const SPIN_DURATION_BASE = 800;
const SPIN_STAGGER       = 250;

let balance  = 100;
let bet      = 5;
let totalWon = 0;
let spinning = false;

// current strip positions (index 0..STRIP_LEN-1 of the visible top symbol)
const positions = [0, 0, 0];
// generated strips for each reel
const strips = [[], [], []];

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

// ── Build reel strips ─────────────────────────────────────────────────────────
function buildStrips() {
  for (let r = 0; r < 3; r++) {
    strips[r] = Array.from({ length: STRIP_LEN }, () => weightedPick());
    renderStrip(r);
  }
}

function renderStrip(reelIdx) {
  const el = document.getElementById(`strip-${reelIdx}`);
  el.innerHTML = '';
  // Render STRIP_LEN + VISIBLE extra to allow seamless wrap
  const full = [...strips[reelIdx], ...strips[reelIdx].slice(0, VISIBLE)];
  for (const sym of full) {
    const div = document.createElement('div');
    div.className = 'symbol';
    div.innerHTML = `${sym.emoji}<span class="label">${sym.label}</span>`;
    el.appendChild(div);
  }
  // Position strip so middle symbol of payline shows correctly
  setStripPosition(reelIdx, positions[reelIdx], false);
}

// ── Position strip ────────────────────────────────────────────────────────────
// `pos` = index of the symbol that appears at the TOP of the window
function setStripPosition(reelIdx, pos, animate) {
  const el = document.getElementById(`strip-${reelIdx}`);
  const symH = parseInt(getComputedStyle(document.documentElement)
    .getPropertyValue('--symbol-h'));
  // offset so payline (middle row) shows `pos + 1`
  const offsetY = -(pos * symH);
  el.style.transition = animate ? `transform ${SPIN_DURATION_BASE + reelIdx * SPIN_STAGGER}ms cubic-bezier(.17,.67,.35,1)` : 'none';
  el.style.transform  = `translateY(${offsetY}px)`;
}

// ── Read payline symbols ──────────────────────────────────────────────────────
function getPaylineSymbols() {
  return positions.map((pos, r) => {
    // payline is middle row → pos+1 within strip
    return strips[r][(pos + 1) % STRIP_LEN];
  });
}

// ── Evaluate result ───────────────────────────────────────────────────────────
function evaluate(syms) {
  const ids = syms.map(s => s.id);
  // Check three-of-a-kind first
  for (const row of PAY_TABLE) {
    if (row.count === 3 && ids.every(id => id === row.match)) return row;
  }
  // Two-of-a-kind (first two or last two or first+last)
  for (const row of PAY_TABLE) {
    if (row.count === 2) {
      const cnt = ids.filter(id => id === row.match).length;
      if (cnt >= 2) return row;
    }
  }
  return null;
}

// ── Spin ──────────────────────────────────────────────────────────────────────
function spin() {
  if (spinning) return;
  if (balance < bet) {
    showBankrupt();
    return;
  }

  spinning = true;
  balance -= bet;
  updateHUD();

  const spinBtn = document.getElementById('spin-btn');
  spinBtn.disabled = true;

  const resultBox = document.getElementById('result-box');
  resultBox.className = 'result-box';
  resultBox.querySelector
    ? resultBox.textContent = 'Calculating… please wait… still calculating…'
    : null;
  document.getElementById('result-msg').textContent = 'Burning tokens…';

  // Choose new final positions
  const newPositions = positions.map((_, r) => {
    // spin between 2 and 5 full loops, land on random pos
    const loops = 2 + Math.floor(Math.random() * 4);
    return Math.floor(Math.random() * STRIP_LEN);
  });

  // Animate each reel with staggered timing
  const promises = newPositions.map((finalPos, r) => {
    return new Promise(resolve => {
      const symH = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--symbol-h'));
      const el = document.getElementById(`strip-${r}`);

      // We animate by translating to a large negative Y:
      // full loops * STRIP_LEN * symH + finalPos * symH (offset for payline)
      const loops = 3 + r; // each reel spins a bit more
      const totalSymbols = loops * STRIP_LEN + finalPos + 1; // +1 for payline offset
      const targetY = -(totalSymbols * symH);

      const duration = SPIN_DURATION_BASE + r * SPIN_STAGGER + 400;
      el.style.transition = `transform ${duration}ms cubic-bezier(.17,.67,.12,1)`;
      el.style.transform  = `translateY(${targetY}px)`;

      setTimeout(() => {
        // Snap to correct looped position (no animation)
        positions[r] = finalPos;
        el.style.transition = 'none';
        el.style.transform  = `translateY(${-(finalPos * symH)}px)`;
        resolve();
      }, duration + 50);
    });
  });

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
      if (result.mult >= 15) {
        showModal(result.name, result.quip, payout);
      }
    } else {
      showResult(false, getLoserQuip());
    }

    if (balance <= 0) {
      setTimeout(showBankrupt, 600);
    }
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
];
let loserIdx = 0;
function getLoserQuip() {
  const q = LOSER_QUIPS[loserIdx % LOSER_QUIPS.length];
  loserIdx++;
  return q;
}

function showModal(title, body, payout) {
  document.getElementById('modal-title').textContent = `${title}`;
  document.getElementById('modal-body').textContent  =
    `You won ${payout} tokens!\n\n${body}`;
  document.getElementById('modal').classList.remove('hidden');
}

function showBankrupt() {
  const box = document.getElementById('modal-box') || document.querySelector('.modal-box');
  if (box) box.classList.add('bankrupt');
  document.getElementById('modal-title').textContent = '💀 BANKRUPT';
  document.getElementById('modal-body').textContent  =
    'You have run out of tokens. The AI thanks you for your contribution to its training data. Starting over with 100 tokens.';
  document.getElementById('modal-close').textContent = 'Beg the AI for More Tokens';
  document.getElementById('modal').classList.remove('hidden');

  document.getElementById('modal-close').addEventListener('click', () => {
    balance = 100;
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
    const tr = document.createElement('tr');
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
  setInterval(() => {
    el.textContent = TICKER_MSGS[i % TICKER_MSGS.length];
    i++;
  }, 9000);
}

// ── Bet controls ──────────────────────────────────────────────────────────────
function updateBetDisplay() {
  document.getElementById('bet').textContent      = bet;
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

// ── Keyboard shortcut: Space to spin ─────────────────────────────────────────
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
