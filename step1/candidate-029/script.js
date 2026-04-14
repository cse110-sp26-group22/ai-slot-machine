'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────

const STARTING_BALANCE = 1000;

const SYMBOLS = [
  { emoji: '🤖', name: 'Robot',          weight: 5 },
  { emoji: '🧠', name: 'BigBrain',       weight: 5 },
  { emoji: '💬', name: 'Prompt',         weight: 7 },
  { emoji: '🔥', name: 'GPU',            weight: 4 },
  { emoji: '💀', name: 'Hallucination',  weight: 3 },
  { emoji: '📉', name: 'Benchmark',      weight: 4 },
  { emoji: '💾', name: 'TrainingData',   weight: 6 },
  { emoji: '⚡', name: 'Compute',        weight: 5 },
];

// Weighted pool for random draws
const POOL = SYMBOLS.flatMap(s => Array(s.weight).fill(s.emoji));

const PAYTABLE = [
  // Three-of-a-kind jackpots
  { match: ['🤖','🤖','🤖'], mult: 50, label: 'AGI Achieved™',          jackpot: true,
    msg: 'You\'ve achieved AGI! ...It\'s still just autocomplete. Collect your 50× tokens before the hype fades.' },
  { match: ['💀','💀','💀'], mult: 40, label: 'Hallucination Hat-Trick', jackpot: true,
    msg: 'Three hallucinations that agree. By consensus they are now facts. The model is very confident.' },
  { match: ['🧠','🧠','🧠'], mult: 30, label: 'Emergent Intelligence',   jackpot: true,
    msg: 'BREAKING: emergence detected. Researchers are publishing 4 papers about this as you read.' },
  { match: ['🔥','🔥','🔥'], mult: 25, label: 'Triple GPU Meltdown',     jackpot: false,
    msg: 'Three GPUs sacrificed. NVIDIA sends a thank-you card. You receive 25× tokens.' },
  { match: ['⚡','⚡','⚡'], mult: 20, label: 'Infinite Compute™',       jackpot: false,
    msg: 'Sam promised you infinite compute. This is it. Enjoy the 20× tokens and global warming.' },
  { match: ['📉','📉','📉'], mult: 15, label: 'SOTA on Every Benchmark', jackpot: false,
    msg: 'State of the art on every benchmark, including ones released after training. How convenient!' },
  { match: ['💾','💾','💾'], mult: 12, label: 'Full Internet Scrape',    jackpot: false,
    msg: 'Congratulations! You have legally scraped the entire internet. Copyright lawyers incoming.' },
  { match: ['💬','💬','💬'], mult: 10, label: 'Perfect Prompt',          jackpot: false,
    msg: 'Prompt engineering mastery achieved. Consulting firms would like to charge $500/hour for this.' },
  // Two-of-a-kind (third slot = null = any)
  { match: ['🤖','🤖', null], mult: 4, label: 'Robot Pair',        jackpot: false,
    msg: 'Two robots agree. That\'s peer review in the AI industry.' },
  { match: ['🧠','🧠', null], mult: 3, label: 'Double Brain',      jackpot: false,
    msg: 'Two brains. Still no common sense between them.' },
  { match: ['💀','💀', null], mult: 5, label: 'Double Hallucination', jackpot: false,
    msg: 'Two hallucinations. That\'s basically a citation now.' },
  { match: ['🔥','🔥', null], mult: 2, label: 'Two GPUs Burning',  jackpot: false,
    msg: 'Two GPUs on fire. Power bill increases. NVIDIA stock up.' },
];

const LOSS_MSGS = [
  'Loss. The model is confidently generating an explanation for why you should have won.',
  'Context window exceeded — your luck was silently truncated.',
  'No match. The AI\'s reasoning: "This outcome was optimal for the user." It wasn\'t.',
  'According to our proprietary benchmark, you performed at 0% on the Winning task.',
  'Tokens burned. The waste heat is training a new model on your suffering.',
  'No pattern detected. Have you tried rephrasing your luck?',
  'INFERENCE FAILED: skill issue (confidence: 99.7%).',
  'Loss. The model is now hallucinating a reality where you won.',
  'Not a match. The AI would like to re-RLHF your expectations.',
  'Your tokens have been quietly redistributed to Series B investors.',
  'Alignment failure: your reward function was misspecified.',
  'The model regrets to inform you: this loss was actually a feature.',
  'No win. A 32,000-word paper explaining this result will be on arXiv tomorrow.',
  'Loss detected. The AI is very sorry and also not sorry.',
];

const SPIN_MSGS = [
  'Running inference... burning tokens...',
  'Sampling from the distribution of bad luck...',
  'Consulting the stochastic parrot...',
  'Forwarding through 96 transformer layers...',
  'Computing cross-attention on your wallet...',
  'Asking a fine-tuned model what you deserve...',
  'Training on your previous losses for better performance...',
  'Generating a confident wrong answer...',
  'Tokenizing your hopes and dreams...',
];

const MODEL_NAMES = [
  'GPT-∞ Turbo Ultra Pro Max',
  'Llama-420B-Instinct-Supreme',
  'Claude Infinity Preview (preview)',
  'Gemini Ultra Mega Atomic',
  'DeepSeek-R3-D3-Unchained',
  'Mistral Supernova Explosion',
  'Grok-5 Sarcasm Edition',
  'Phi-∞ Tiny But Sentient',
  'o99-Thinking-For-Minutes',
];

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  balance:    STARTING_BALANCE,
  burned:     0,
  spins:      0,
  bestWin:    0,
  bet:        10,
  spinning:   false,
  soundOn:    true,
};

// Restore persisted stats (balance intentionally resets on reload — no free money)
(function restoreStats() {
  try {
    const saved = JSON.parse(localStorage.getItem('tokenburn_stats') || '{}');
    if (typeof saved.bestWin === 'number') state.bestWin = saved.bestWin;
    if (typeof saved.spins   === 'number') state.spins   = saved.spins;
    if (typeof saved.soundOn === 'boolean') state.soundOn = saved.soundOn;
  } catch (_) { /* ignore */ }
})();

function saveStats() {
  try {
    localStorage.setItem('tokenburn_stats', JSON.stringify({
      bestWin: state.bestWin,
      spins:   state.spins,
      soundOn: state.soundOn,
    }));
  } catch (_) { /* ignore — storage may be blocked */ }
}

// ── Audio (Web Audio API — no external files) ────────────────────────────────

let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
  }
  return audioCtx;
}

function playTone(freq, type, duration, volume = 0.18, delay = 0) {
  if (!state.soundOn) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.05);
  } catch (_) {}
}

function sfxClick() { playTone(440, 'square', 0.07, 0.12); }
function sfxSpin()  { playTone(220, 'sawtooth', 0.15, 0.09); }
function sfxLand(i) { playTone(330 + i * 80, 'triangle', 0.12, 0.14, i * 0.05); }
function sfxWin()   {
  [523, 659, 784, 1047].forEach((f, i) => playTone(f, 'sine', 0.25, 0.16, i * 0.1));
}
function sfxJackpot() {
  [523, 659, 784, 1047, 1319].forEach((f, i) => playTone(f, 'sine', 0.45, 0.2, i * 0.08));
}
function sfxLose()  { playTone(150, 'sawtooth', 0.3, 0.14); }

// ── DOM references ────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);
const el = {
  balance:     $('stat-balance'),
  burned:      $('stat-burned'),
  spins:       $('stat-spins'),
  bestWin:     $('stat-best'),
  ctxFill:     $('ctx-fill'),
  ctxText:     $('ctx-text'),
  ctxEmoji:    $('ctx-emoji'),
  statusMsg:   $('status-msg'),
  btnSpin:     $('btn-spin'),
  btnRefill:   $('btn-refill'),
  betChips:    $('bet-chips'),
  betDisplay:  $('bet-display'),
  soundBtn:    $('sound-btn'),
  soundIcon:   $('sound-icon'),
  modelChip:   $('model-chip'),
  paytableGrid:$('paytable-grid'),
  logList:     $('log-list'),
  btnClearLog: $('btn-clear-log'),
  jackpotModal:$('jackpot-modal'),
  jpEmoji:     $('jp-emoji'),
  jpTitle:     $('jp-title'),
  jpBody:      $('jp-body'),
  jpOk:        $('jp-ok'),
  brokeModal:  $('broke-modal'),
  brokeOk:     $('broke-ok'),
  brokeCancel: $('broke-cancel'),
};

// ── Initialisation ────────────────────────────────────────────────────────────

function init() {
  buildParticleBackground();
  buildPaytable();
  buildReels();
  attachEventListeners();
  rotateModeNames();
  renderUI();
  syncSoundUI();
}

// ── Background: circuit-rain canvas ──────────────────────────────────────────

function buildParticleBackground() {
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');
  const COLS   = 24;
  const chars  = '01アイウエオカキクケコサシスセソタチツテトナニヌネノ'.split('');
  let drops    = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const colW = Math.floor(canvas.width / COLS);
    drops = Array.from({ length: COLS }, (_, i) => ({
      x: i * colW + colW / 2,
      y: Math.random() * -canvas.height,
      speed: Math.random() * 1.2 + 0.5,
      char: chars[Math.floor(Math.random() * chars.length)],
      timer: 0,
    }));
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '14px monospace';
    drops.forEach(d => {
      ctx.fillStyle = d.y < canvas.height * 0.3 ? '#00e5ff' : '#7c3aed';
      ctx.fillText(d.char, d.x, d.y);
      d.y += d.speed;
      d.timer++;
      if (d.timer % 8 === 0) d.char = chars[Math.floor(Math.random() * chars.length)];
      if (d.y > canvas.height + 20) {
        d.y = Math.random() * -200;
        d.speed = Math.random() * 1.2 + 0.5;
      }
    });
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize);
  resize();
  tick();
}

// ── Build paytable rows ───────────────────────────────────────────────────────

function buildPaytable() {
  PAYTABLE.forEach(entry => {
    const row = document.createElement('div');
    row.className = 'pt-row';
    const syms = entry.match.map(s => s ?? '❓').join(' ');
    row.innerHTML = `
      <span class="pt-symbols">${syms}</span>
      <span class="pt-label">${entry.label}</span>
      <span class="pt-mult">${entry.mult}×</span>
    `;
    el.paytableGrid.appendChild(row);
  });
}

// ── Build reel strips with extra symbols for animation ───────────────────────

function buildReels() {
  for (let i = 0; i < 3; i++) {
    const strip = $(`strip-${i}`);
    strip.innerHTML = '';
    // Populate with random symbols; we'll set the final one during spin
    for (let j = 0; j < 12; j++) {
      const div = document.createElement('div');
      div.className = 'reel-symbol';
      div.textContent = POOL[Math.floor(Math.random() * POOL.length)];
      strip.appendChild(div);
    }
  }
}

// ── Bet buttons ───────────────────────────────────────────────────────────────

function setupBetButtons() {
  el.betChips.querySelectorAll('.chip').forEach((chip, idx) => {
    chip.addEventListener('click', () => {
      if (state.spinning) return;
      sfxClick();
      el.betChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.bet = parseInt(chip.dataset.bet, 10);
      el.betDisplay.textContent = state.bet;
    });
    // Keyboard shortcut: keys 1–5
    chip.dataset.keyIndex = idx + 1;
  });
}

// ── Event listeners ───────────────────────────────────────────────────────────

function attachEventListeners() {
  setupBetButtons();
  el.btnSpin.addEventListener('click', handleSpin);
  el.btnRefill.addEventListener('click', () => showBrokeModal());
  el.btnClearLog.addEventListener('click', () => { el.logList.innerHTML = ''; });
  el.jpOk.addEventListener('click', () => closeModal(el.jackpotModal));
  el.brokeOk.addEventListener('click', () => { closeModal(el.brokeModal); doRefill(); });
  el.brokeCancel.addEventListener('click', () => closeModal(el.brokeModal));
  el.soundBtn.addEventListener('click', toggleSound);

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'BUTTON') return; // let buttons handle their own Enter
    if (e.code === 'Space' && !e.repeat) { e.preventDefault(); handleSpin(); }
    if (e.key === 'm' || e.key === 'M') toggleSound();
    const idx = parseInt(e.key, 10);
    if (idx >= 1 && idx <= 5) {
      const chips = el.betChips.querySelectorAll('.chip');
      if (chips[idx - 1]) chips[idx - 1].click();
    }
  });
}

// ── Sound toggle ──────────────────────────────────────────────────────────────

function toggleSound() {
  state.soundOn = !state.soundOn;
  syncSoundUI();
  saveStats();
}

function syncSoundUI() {
  el.soundIcon.textContent = state.soundOn ? '🔊' : '🔇';
  el.soundBtn.title = state.soundOn ? 'Mute (M)' : 'Unmute (M)';
}

// ── Model name rotation ───────────────────────────────────────────────────────

function rotateModeNames() {
  setInterval(() => {
    el.modelChip.textContent = MODEL_NAMES[Math.floor(Math.random() * MODEL_NAMES.length)];
  }, 7000);
}

// ── Spin handler ──────────────────────────────────────────────────────────────

function handleSpin() {
  if (state.spinning) return;
  if (state.balance < state.bet) { showBrokeModal(); return; }
  // Unlock audio context on first user gesture
  getAudioCtx()?.resume();

  state.spinning = true;
  state.balance -= state.bet;
  state.burned  += state.bet;
  state.spins++;
  setControls(true);

  const spinMsg = SPIN_MSGS[Math.floor(Math.random() * SPIN_MSGS.length)];
  setStatus(spinMsg, 'spin');
  addLog(`Spin #${state.spins} — cost ${state.bet} tokens. ${spinMsg}`, '');
  sfxSpin();
  renderStats();

  // Decide results before animation
  const results = [pickSymbol(), pickSymbol(), pickSymbol()];

  animateReels(results, () => {
    const outcome = evaluateOutcome(results);
    finalize(results, outcome);
  });
}

function pickSymbol() {
  return POOL[Math.floor(Math.random() * POOL.length)];
}

// ── Reel animation ────────────────────────────────────────────────────────────

function animateReels(results, onDone) {
  const DURATIONS = [700, 1050, 1380]; // ms each reel spins before settling
  const reelCols  = [0, 1, 2].map(i => $(`reel-${i}`));
  const strips    = [0, 1, 2].map(i => $(`strip-${i}`));

  // Start spinning
  reelCols.forEach(col => {
    col.classList.remove('winner', 'land');
    col.style.setProperty('--spin-speed', '0.1s');
    col.classList.add('spinning');
  });

  let settled = 0;

  reelCols.forEach((col, i) => {
    setTimeout(() => {
      // Set final symbol
      strips[i].innerHTML = '';
      const sym = document.createElement('div');
      sym.className = 'reel-symbol';
      sym.textContent = results[i];
      strips[i].appendChild(sym);

      col.classList.remove('spinning');
      col.classList.add('land');
      sfxLand(i);

      settled++;
      if (settled === 3) setTimeout(onDone, 250);
    }, DURATIONS[i]);
  });
}

// ── Outcome evaluation ────────────────────────────────────────────────────────

function evaluateOutcome(results) {
  const [a, b, c] = results;

  for (const entry of PAYTABLE) {
    const [s0, s1, s2] = entry.match;
    if (s2 !== null) {
      // Exact three-of-a-kind
      if (a === s0 && b === s1 && c === s2) return entry;
    } else {
      // Two-of-a-kind anywhere in the three positions
      if (
        (a === s0 && b === s1) ||
        (a === s0 && c === s1) ||
        (b === s0 && c === s1)
      ) return entry;
    }
  }
  return null;
}

// ── Finalize spin ─────────────────────────────────────────────────────────────

function finalize(results, outcome) {
  state.spinning = false;
  setControls(false);

  if (outcome) {
    const prize = state.bet * outcome.mult;
    state.balance += prize;
    if (prize > state.bestWin) state.bestWin = prize;
    saveStats();
    renderStats();

    highlightWinners(results, outcome);

    if (outcome.jackpot) {
      sfxJackpot();
      showJackpotModal(outcome, prize);
    } else {
      sfxWin();
      setStatus(`WIN! +${prize} tokens — ${outcome.label}`, 'win');
      addLog(`WIN +${prize} tokens (${outcome.mult}×): ${outcome.msg}`, 'log-win');
    }
  } else {
    sfxLose();
    const msg = LOSS_MSGS[Math.floor(Math.random() * LOSS_MSGS.length)];
    setStatus(msg, 'lose');
    addLog(`LOSS −${state.bet} tokens. ${msg}`, 'log-lose');
    saveStats();
    renderStats();

    if (state.balance < getMinBet()) {
      setTimeout(showBrokeModal, 700);
    }
  }
}

function highlightWinners(results, outcome) {
  const [s0, s1, s2] = outcome.match;
  for (let i = 0; i < 3; i++) {
    const col = $(`reel-${i}`);
    if (s2 !== null) {
      // Three-of-a-kind: all reels win
      col.classList.add('winner');
    } else {
      // Two-of-a-kind: highlight the matching positions
      const [a, b, c] = results;
      if (
        (i === 0 && ((a === s0 && b === s1) || (a === s0 && c === s1))) ||
        (i === 1 && ((a === s0 && b === s1) || (b === s0 && c === s1))) ||
        (i === 2 && ((a === s0 && c === s1) || (b === s0 && c === s1)))
      ) col.classList.add('winner');
    }
  }
  setTimeout(() => {
    document.querySelectorAll('.reel-col').forEach(c => c.classList.remove('winner'));
  }, 3000);
}

// ── UI rendering ──────────────────────────────────────────────────────────────

function renderUI() { renderStats(); }

function renderStats() {
  animatePop(el.balance, state.balance.toLocaleString());
  animatePop(el.burned,  state.burned.toLocaleString());
  animatePop(el.spins,   state.spins.toLocaleString());
  animatePop(el.bestWin, state.bestWin.toLocaleString());
  renderContextMeter();

  const minBet = getMinBet();
  el.btnSpin.disabled = state.balance < minBet;
}

function animatePop(element, text) {
  element.textContent = text;
  element.classList.remove('pop');
  void element.offsetWidth; // force reflow
  element.classList.add('pop');
  setTimeout(() => element.classList.remove('pop'), 200);
}

function renderContextMeter() {
  const pct  = Math.max(0, state.balance / STARTING_BALANCE);
  const fill = el.ctxFill;
  fill.style.width = `${(pct * 100).toFixed(1)}%`;
  fill.classList.remove('warn', 'crit');
  el.ctxText.textContent = `${state.balance.toLocaleString()} / ${STARTING_BALANCE.toLocaleString()} tokens`;

  if (pct <= 0.15) {
    fill.classList.add('crit');
    el.ctxEmoji.textContent = '🔴';
  } else if (pct <= 0.35) {
    fill.classList.add('warn');
    el.ctxEmoji.textContent = '🟡';
  } else {
    el.ctxEmoji.textContent = '🟢';
  }
}

function setStatus(msg, type) {
  el.statusMsg.textContent = msg;
  el.statusMsg.className   = 'status-msg' + (type ? ` ${type}` : '');
}

function addLog(text, cls) {
  const div = document.createElement('div');
  div.className = `log-item ${cls}`;
  const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  div.textContent = `[${ts}] ${text}`;
  el.logList.prepend(div);
  // Cap at 60 entries
  while (el.logList.children.length > 60) el.logList.removeChild(el.logList.lastChild);
}

function setControls(disabled) {
  el.btnSpin.disabled = disabled;
  el.betChips.querySelectorAll('.chip').forEach(c => (c.disabled = disabled));
}

function getMinBet() {
  return Math.min(...Array.from(
    el.betChips.querySelectorAll('.chip[data-bet]'),
    c => parseInt(c.dataset.bet, 10)
  ));
}

// ── Modals ────────────────────────────────────────────────────────────────────

function showJackpotModal(outcome, prize) {
  const emojiMap = { '🤖🤖🤖': '🤯', '💀💀💀': '👻', '🧠🧠🧠': '🌌' };
  el.jpEmoji.textContent = emojiMap[outcome.match.join('')] || '🎊';
  el.jpTitle.textContent = `JACKPOT! +${prize.toLocaleString()} tokens`;
  el.jpBody.textContent  = outcome.msg;
  openModal(el.jackpotModal);
  addLog(`JACKPOT +${prize} tokens: ${outcome.msg}`, 'log-win');
  setStatus(`JACKPOT! +${prize.toLocaleString()} tokens — ${outcome.label}`, 'win');
}

function showBrokeModal() { openModal(el.brokeModal); }

function openModal(backdrop) {
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
}

function closeModal(backdrop) {
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
}

// ── Refill ────────────────────────────────────────────────────────────────────

function doRefill() {
  state.balance = STARTING_BALANCE;
  state.burned  = 0;
  renderStats();
  setStatus('Series A secured. +1,000 tokens. Burn rate: aggressive.', 'spin');
  addLog('VC funding round complete. Balance restored to 1,000 tokens. Investors notified.', 'log-info');
}

// ── Boot ──────────────────────────────────────────────────────────────────────

init();
