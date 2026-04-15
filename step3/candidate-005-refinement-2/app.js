'use strict';

/* ═══════════════════════════════════════════════════════════════════════
   AI TOKEN SLOTS — app.js
   Architecture:
     AudioEngine  → procedural SFX via Web Audio API (no audio files)
     Confetti     → canvas particle burst
     Reel         → single reel DOM controller
     SlotMachine  → orchestrates reels, state, UI
   To add a symbol: push one object to SYMBOLS. Nothing else changes.
   To change bet limits / timing: edit CONFIG. Nothing else changes.
   ═══════════════════════════════════════════════════════════════════════ */

// ──────────────────────────────────────────────────────────────────────
// SYMBOLS — add/remove freely; weights are relative frequencies
// mult: win multiplier on the bet.  0 = skull (penalty symbol).
// ──────────────────────────────────────────────────────────────────────
const SYMBOLS = [
  { id: 'bot',    emoji: '🤖', name: 'Bot',            weight: 7, mult: 2,  color: '#4ade80' },
  { id: 'brain',  emoji: '🧠', name: 'Brain',          weight: 5, mult: 3,  color: '#60a5fa' },
  { id: 'laptop', emoji: '💻', name: 'Laptop',         weight: 4, mult: 4,  color: '#a78bfa' },
  { id: 'parrot', emoji: '🦜', name: 'Parrot',         weight: 3, mult: 6,  color: '#f472b6' },
  { id: 'gpu',    emoji: '⚡', name: 'GPU',            weight: 2, mult: 12, color: '#fbbf24' },
  { id: 'skull',  emoji: '💀', name: 'Hallucination',  weight: 2, mult: 0,  color: '#ef4444' },
  { id: 'prompt', emoji: '🎯', name: 'Perfect Prompt', weight: 1, mult: 30, color: '#ff7b45' },
];

// ──────────────────────────────────────────────────────────────────────
// CONFIG — tune behaviour without touching logic
// ──────────────────────────────────────────────────────────────────────
const CONFIG = {
  startBalance:  1000,
  minBet:        10,
  maxBet:        200,
  betStep:       10,
  reelCount:     3,
  skullPenalty:  1.5,   // extra multiplier on bet when skull lands
  reelStopGap:   850,   // ms between successive reel stops (stagger)
  spinInterval:  68,    // ms between symbol flips during spin
};

// ──────────────────────────────────────────────────────────────────────
// MESSAGES — extend arrays freely
// ──────────────────────────────────────────────────────────────────────
const MESSAGES = {
  idle: [
    'Insert tokens to begin training…',
    'Awaiting your prompts…',
    'Context window: open.',
    'Ready to hallucinate results.',
  ],
  spin: [
    'Sampling from the distribution…',
    'Applying temperature: ∞…',
    'Hallucinating your fortune…',
    'Running inference on your wallet…',
    'Tokenizing hopes and dreams…',
    'Consulting the training data…',
    'Gradient descending toward loss…',
    'Attention heads pointing at your funds…',
    'Softmax: all outcomes equally unlikely…',
    'Embedding your desperation…',
    'Calling the API… rate limit in 3… 2…',
  ],
  win: [
    'Token reward: positive! Model approves.',
    'Improbably correct output detected!',
    'The gradient descended correctly this time.',
    'Attention heads aligned in your favor!',
    'Low perplexity! You beat the model!',
    'This counts as alignment. Probably.',
    'RLHF gave you a thumbs up.',
  ],
  jackpot: [
    '🎯 AGI ACHIEVED — just kidding, but close!',
    '🎯 PERFECT PROMPT! The model is impressed!',
    '🎯 JACKPOT! Inference cost: still more than this.',
    '🎯 MAXIMUM REWARD SIGNAL! RLHF APPROVED!',
    '🎯 The weights smiled upon you!',
  ],
  skull: [
    '💀 Hallucination detected! Extra tokens burned.',
    '💀 Model confidently wrong. Penalty applied.',
    '💀 Ghost in the machine. Tokens evaporated.',
    '💀 Confabulation event! Token loss: significant.',
    '💀 It made something up. You paid the price.',
  ],
  lose: [
    'Token loss registered. Skill issue.',
    'Negative reward signal. Try harder.',
    'This response cost more than you won.',
    'Fine-tuned for losing. Very impressive.',
    'Model output: L. Context: tragic.',
    'Overfitting to a losing strategy.',
    'Your loss function is working perfectly.',
    'Error 402: Payment Required (by the machine).',
    'The model predicted this outcome with 99% confidence.',
  ],
  broke: [
    'Insufficient tokens. Context window: empty.',
    'Out of tokens. Have you tried prompt engineering?',
    'Wallet: bankrupt. Model: indifferent.',
  ],
  reset: [
    'Reloading training data… 1000 tokens restored.',
    'Context cleared. New run initiated.',
    'Fine-tuning complete. Balance reset.',
  ],
};

// ══════════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════════

/** Build a flat weighted pool once; O(1) picks at runtime. */
function buildPool(symbols) {
  const pool = [];
  for (const sym of symbols) {
    for (let i = 0; i < sym.weight; i++) pool.push(sym);
  }
  return pool;
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pick(messages) {
  return randomFrom(messages);
}

// ══════════════════════════════════════════════════════════════════════
// AUDIO ENGINE — procedural SFX, no audio files required
// ══════════════════════════════════════════════════════════════════════

class AudioEngine {
  constructor() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      this.ctx = null;
    }
  }

  /** Resume context after user gesture (browser autoplay policy). */
  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  _tone(freq, type, gain, startTime, dur) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g   = this.ctx.createGain();
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    g.gain.setValueAtTime(gain, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
    osc.start(startTime);
    osc.stop(startTime + dur);
  }

  spinClick() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone(220, 'square', 0.08, t,        0.04);
    this._tone(330, 'square', 0.06, t + 0.04, 0.04);
  }

  /** Start a continuous mechanical spin sound (runs until stopSpin is called). */
  startSpin() {
    if (!this.ctx) return;
    this._spinOsc  = this.ctx.createOscillator();
    this._spinGain = this.ctx.createGain();
    const filter   = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, this.ctx.currentTime);
    filter.Q.setValueAtTime(0.8, this.ctx.currentTime);
    this._spinOsc.connect(filter);
    filter.connect(this._spinGain);
    this._spinGain.connect(this.ctx.destination);
    this._spinOsc.type = 'sawtooth';
    this._spinOsc.frequency.setValueAtTime(60,  this.ctx.currentTime);
    this._spinOsc.frequency.linearRampToValueAtTime(130, this.ctx.currentTime + 2.5);
    this._spinGain.gain.setValueAtTime(0.055, this.ctx.currentTime);
    this._spinOsc.start();
  }

  stopSpin() {
    if (!this._spinOsc || !this.ctx) return;
    try {
      this._spinGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      this._spinOsc.stop(this.ctx.currentTime + 0.13);
    } catch (_) { /* already stopped */ }
    this._spinOsc  = null;
    this._spinGain = null;
  }

  reelStop() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone(480, 'sine', 0.16, t,        0.09);
    this._tone(340, 'sine', 0.11, t + 0.06, 0.12);
    // Extra punchy thud
    this._tone(100, 'triangle', 0.10, t, 0.08);
  }

  win() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => {
      this._tone(f, 'sine', 0.18, t + i * 0.1, 0.18);
    });
  }

  jackpot() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Rising fanfare
    [261, 329, 392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => {
      this._tone(f, 'sine', 0.2, t + i * 0.065, 0.22);
    });
    // Chord climax
    [523, 659, 784, 1047].forEach((f) => {
      this._tone(f, 'triangle', 0.14, t + 0.72, 0.55);
    });
    // Sparkle tones
    [2093, 2637].forEach((f, i) => {
      this._tone(f, 'sine', 0.08, t + 0.85 + i * 0.1, 0.2);
    });
  }

  lose() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone(200, 'sawtooth', 0.12, t,        0.18);
    this._tone(140, 'sawtooth', 0.08, t + 0.14, 0.28);
  }

  coinDrop() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [880, 1100, 1320, 1760].forEach((f, i) => {
      this._tone(f, 'triangle', 0.12, t + i * 0.07, 0.14);
    });
    this._tone(660, 'sine', 0.1, t + 0.32, 0.25);
  }
}

// ══════════════════════════════════════════════════════════════════════
// CONFETTI — lightweight canvas particle system
// ══════════════════════════════════════════════════════════════════════

class Confetti {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.parts  = [];
    this.running = false;
    this._onResize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', this._onResize);
    this._onResize();
  }

  burst(count = 120) {
    const colors = ['#00ff88','#f59e0b','#60a5fa','#f472b6','#a78bfa','#fbbf24','#ff7b45'];
    for (let i = 0; i < count; i++) {
      this.parts.push({
        x:    Math.random() * this.canvas.width,
        y:    -10,
        vx:   (Math.random() - 0.5) * 7,
        vy:   Math.random() * 4 + 2,
        w:    Math.random() * 10 + 4,
        h:    Math.random() * 5 + 3,
        color:colors[Math.floor(Math.random() * colors.length)],
        rot:  Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.22,
        life: 1,
      });
    }
    if (!this.running) this._loop();
  }

  _loop() {
    this.running = true;
    const { ctx, canvas, parts } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.parts = parts.filter(p => p.life > 0.02);
    for (const p of this.parts) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.13;
      p.rot += p.rotV; p.life -= 0.011;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (this.parts.length) {
      requestAnimationFrame(() => this._loop());
    } else {
      this.running = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════
// REEL — controls a single reel DOM element
// ══════════════════════════════════════════════════════════════════════

class Reel {
  /**
   * @param {HTMLElement} el    - the .reel element
   * @param {object[]}    pool  - weighted symbol pool
   * @param {AudioEngine} audio
   */
  constructor(el, pool, audio) {
    this.el    = el;
    this.pool  = pool;
    this.audio = audio;
    this.cells = Array.from(el.querySelectorAll('.cell'));
    this._interval = null;
    // Seed with random symbols
    this.cells.forEach(c => this._paint(c, randomFrom(pool)));
  }

  /** Fill a cell's innerHTML from a symbol object. */
  _paint(cell, sym) {
    cell.dataset.id = sym.id;
    cell.style.setProperty('--sym-color', sym.color);
    cell.innerHTML =
      `<span class="cell-emoji">${sym.emoji}</span>` +
      `<span class="cell-name">${sym.name}</span>`;
  }

  /**
   * Start spinning, stop after `delay` ms, land on `finalSym`.
   * @returns {Promise<object>} resolves with the final symbol.
   */
  spin(delay, finalSym) {
    return new Promise(resolve => {
      this.el.classList.add('is-spinning');
      this.audio.spinClick();

      // Rapid symbol shuffle on all 3 cells
      this._interval = setInterval(() => {
        this.cells.forEach(c => this._paint(c, randomFrom(this.pool)));
      }, CONFIG.spinInterval);

      setTimeout(() => {
        this._stop(finalSym);
        resolve(finalSym);
      }, delay);
    });
  }

  _stop(finalSym) {
    clearInterval(this._interval);
    this._interval = null;

    // Center cell = result; neighbors = random decor
    this._paint(this.cells[0], randomFrom(this.pool)); // top
    this._paint(this.cells[1], finalSym);              // mid (payline)
    this._paint(this.cells[2], randomFrom(this.pool)); // bot

    this.el.classList.remove('is-spinning');
    this.el.classList.add('is-stopping');
    this.audio.reelStop();
    setTimeout(() => this.el.classList.remove('is-stopping'), 420);
  }
}

// ══════════════════════════════════════════════════════════════════════
// SLOT MACHINE — orchestrator
// ══════════════════════════════════════════════════════════════════════

class SlotMachine {
  constructor() {
    this.pool     = buildPool(SYMBOLS);
    this.audio    = new AudioEngine();
    this.confetti = new Confetti(document.getElementById('confetti-canvas'));

    // Mutable state — single source of truth
    this.state = {
      balance:  CONFIG.startBalance,
      bet:      CONFIG.minBet,
      spinning: false,
      bankrupt: false,
      stats:    { spins: 0, wins: 0, bestWin: 0, burned: 0 },
    };

    // Cache DOM refs once
    this.$ = {
      balance:    document.getElementById('balance'),
      betVal:     document.getElementById('bet-value'),
      spinCost:   document.getElementById('spin-cost'),
      message:    document.getElementById('message'),
      msgBox:     document.getElementById('message-box'),
      spinBtn:    document.getElementById('spin-btn'),
      spinLbl:    document.querySelector('.spin-label'),
      betDown:    document.getElementById('bet-down'),
      betUp:      document.getElementById('bet-up'),
      maxBet:     document.getElementById('max-bet-btn'),
      reelsEl:    document.getElementById('reels'),
      reelsArea:  document.querySelector('.reels-area'),
      appEl:      document.querySelector('.app'),
      spins:      document.getElementById('stat-spins'),
      wins:       document.getElementById('stat-wins'),
      best:       document.getElementById('stat-best'),
      burned:     document.getElementById('stat-burned'),
      winPopup:   document.getElementById('win-popup'),
      screenFlash:document.getElementById('screen-flash'),
    };

    // Build Reel instances from DOM
    this.reels = Array.from({ length: CONFIG.reelCount }, (_, i) =>
      new Reel(document.getElementById(`reel-${i}`), this.pool, this.audio)
    );

    this._buildPaytable();
    this._bindEvents();
    this._render();
    this._msg(pick(MESSAGES.idle));
  }

  // ── EVENTS ──────────────────────────────────────────────────────────

  _bindEvents() {
    const { spinBtn, betDown, betUp, maxBet } = this.$;

    spinBtn.addEventListener('click', () => this._handleSpin());
    betDown.addEventListener('click', () => this._changeBet(-CONFIG.betStep));
    betUp.addEventListener('click',   () => this._changeBet(+CONFIG.betStep));
    maxBet.addEventListener('click',  () => {
      this.state.bet = this._maxAllowedBet();
      this._render();
    });

    // Spacebar shortcut
    document.addEventListener('keydown', e => {
      if (e.code === 'Space' && !e.repeat) { e.preventDefault(); this._handleSpin(); }
    });
  }

  _handleSpin() {
    if (this.state.bankrupt) { this._reset(); return; }
    this.spin();
  }

  _changeBet(delta) {
    const s = this.state;
    s.bet = Math.max(CONFIG.minBet,
            Math.min(this._maxAllowedBet(), s.bet + delta));
    this._render();
  }

  _maxAllowedBet() {
    return Math.min(CONFIG.maxBet, this.state.balance);
  }

  // ── SPIN CYCLE ───────────────────────────────────────────────────────

  async spin() {
    const s = this.state;
    if (s.spinning || s.balance < s.bet) return;

    await this.audio.resume(); // unblock browser audio

    s.spinning = true;
    s.balance -= s.bet;
    s.stats.spins++;
    s.stats.burned += s.bet;

    // Clear any previous payline highlight
    this._clearPaylineClass();

    this._msg(pick(MESSAGES.spin), 'spinning');
    this._render();

    this.audio.startSpin();

    // Pre-select final symbols before reels start (fair — result is fixed)
    const results = Array.from({ length: CONFIG.reelCount }, () => randomFrom(this.pool));

    // Stagger reel stops
    await Promise.all(
      this.reels.map((reel, i) =>
        reel.spin(CONFIG.reelStopGap * (i + 1), results[i])
      )
    );

    this.audio.stopSpin();
    this._evaluate(results);
    s.spinning = false;
    this._render();
  }

  // ── RESULT EVALUATION ────────────────────────────────────────────────

  _evaluate(results) {
    const s = this.state;

    // 1. Skull anywhere → hallucination penalty
    if (results.some(sym => sym.mult === 0)) {
      const penalty = Math.round(s.bet * CONFIG.skullPenalty);
      s.balance = Math.max(0, s.balance - penalty);
      s.stats.burned += penalty;
      this._msg(pick(MESSAGES.skull), 'msg-danger');
      this.audio.lose();
      this._flashReels('result-danger');
      this._flashBalance('lose');
      this._flashScreen('red');
      return;
    }

    // 2. Three of a kind → win
    if (results.every(sym => sym.id === results[0].id)) {
      const sym    = results[0];
      const payout = s.bet * sym.mult;
      s.balance   += payout;
      s.stats.wins++;
      s.stats.bestWin = Math.max(s.stats.bestWin, payout);

      if (sym.mult >= 12) {
        this._msg(pick(MESSAGES.jackpot), 'msg-jackpot');
        this.audio.jackpot();
        this.confetti.burst(280);
        this._flashReels('result-jackpot');
        this._flashBalance('win');
        this._flashScreen('gold');
        this._shake();
        this._setPaylineClass('payline-jackpot');
        this._showWinPopup(`🎰 +${payout.toLocaleString()} TKN`, '#f59e0b');
      } else {
        this._msg(`${pick(MESSAGES.win)} +${payout} TKN`, 'msg-win');
        this.audio.win();
        this._flashReels('result-win');
        this._flashBalance('win');
        this._setPaylineClass('payline-hit');
        this._showWinPopup(`+${payout.toLocaleString()} TKN`, '#00ff88');
        if (sym.mult >= 6) this.confetti.burst(100);
      }
      return;
    }

    // 3. Loss
    this._msg(pick(MESSAGES.lose));
    this.audio.lose();
    this._flashReels('result-lose');
    this._flashBalance('lose');
  }

  // ── RESET ────────────────────────────────────────────────────────────

  _reset() {
    const s = this.state;
    s.balance  = CONFIG.startBalance;
    s.bet      = CONFIG.minBet;
    s.bankrupt = false;
    this._msg(pick(MESSAGES.reset), 'msg-win');
    this.$.appEl.classList.remove('bankrupt');
    this.$.spinBtn.classList.remove('btn-reset');
    this.$.spinLbl.textContent = 'SPIN';
    this._clearPaylineClass();
    this.audio.coinDrop();
    this._flashBalance('win');
    this._render();
  }

  // ── HELPERS ──────────────────────────────────────────────────────────

  _msg(text, cssClass = '') {
    this.$.message.textContent = text;
    this.$.msgBox.className = 'message-box' + (cssClass ? ` ${cssClass}` : '');
  }

  _flashReels(cls) {
    const el = this.$.reelsEl;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 1400);
  }

  _flashBalance(type) {
    const el = this.$.balance;
    el.classList.remove('flash-win', 'flash-lose');
    // Force reflow so removing + re-adding restarts animation
    void el.offsetWidth;
    el.classList.add(type === 'win' ? 'flash-win' : 'flash-lose');
  }

  _flashScreen(type) {
    const el = this.$.screenFlash;
    el.classList.remove('screen-flash-gold', 'screen-flash-red');
    void el.offsetWidth;
    el.classList.add(type === 'gold' ? 'screen-flash-gold' : 'screen-flash-red');
  }

  _shake() {
    const app = this.$.appEl;
    app.classList.remove('jackpot-shake');
    void app.offsetWidth;
    app.classList.add('jackpot-shake');
    setTimeout(() => app.classList.remove('jackpot-shake'), 700);
  }

  _showWinPopup(text, color = '#f59e0b') {
    const popup = this.$.winPopup;
    popup.textContent = text;
    popup.style.color = color;
    popup.classList.remove('show');
    void popup.offsetWidth;
    popup.classList.add('show');
  }

  _setPaylineClass(cls) {
    const area = this.$.reelsArea;
    area.classList.remove('payline-hit', 'payline-jackpot');
    area.classList.add(cls);
    setTimeout(() => area.classList.remove(cls), 1800);
  }

  _clearPaylineClass() {
    this.$.reelsArea.classList.remove('payline-hit', 'payline-jackpot');
  }

  // ── PAYTABLE ─────────────────────────────────────────────────────────

  _buildPaytable() {
    const grid = document.getElementById('paytable-grid');
    grid.innerHTML = '';
    for (const sym of SYMBOLS) {
      const row = document.createElement('div');
      row.className = 'paytable-row';
      row.style.setProperty('--sym-color', sym.color);
      const detail = sym.mult === 0
        ? 'SKULL ×1.5 BET BURNED'
        : `× ${sym.mult} BET`;
      row.innerHTML =
        `<span class="pt-emoji">${sym.emoji}${sym.emoji}${sym.emoji}</span>` +
        `<span class="pt-detail">${detail}</span>`;
      grid.appendChild(row);
    }
  }

  // ── RENDER ───────────────────────────────────────────────────────────

  _render() {
    const s      = this.state;
    const $      = this.$;
    const maxBet = this._maxAllowedBet();

    // Auto-clamp: if bet now exceeds what player can afford, pull it down
    if (s.bet > maxBet) s.bet = Math.max(CONFIG.minBet, maxBet);

    // Balance + bet display
    $.balance.textContent  = s.balance.toLocaleString();
    $.betVal.textContent   = s.bet;
    $.spinCost.textContent = `−${s.bet} TKN`;

    // Stats
    $.spins.textContent  = s.stats.spins;
    $.wins.textContent   = s.stats.wins;
    $.best.textContent   = s.stats.bestWin.toLocaleString();
    $.burned.textContent = s.stats.burned.toLocaleString();

    // Control states
    const canSpin = !s.spinning && !s.bankrupt && s.balance >= s.bet;
    $.betDown.disabled = s.spinning || s.bet <= CONFIG.minBet;
    $.betUp.disabled   = s.spinning || s.bet >= maxBet;
    $.maxBet.disabled  = s.spinning || s.bet >= maxBet;
    $.spinBtn.disabled = !canSpin && !s.bankrupt;

    // Idle pulse only when ready to spin
    if (canSpin) {
      $.spinBtn.classList.add('idle-pulse');
    } else {
      $.spinBtn.classList.remove('idle-pulse');
    }

    // Bankrupt detection (can't afford even min bet)
    if (s.balance < CONFIG.minBet && !s.spinning && !s.bankrupt) {
      s.bankrupt = true;
      $.appEl.classList.add('bankrupt');
      $.spinBtn.classList.add('btn-reset');
      $.spinBtn.classList.remove('idle-pulse');
      $.spinLbl.textContent  = 'RESET';
      $.spinCost.textContent = '+1000 TKN';
      $.spinBtn.disabled     = false;
      this._msg(pick(MESSAGES.broke), 'msg-danger');
    }
  }
}

// ══════════════════════════════════════════════════════════════════════
// BOOT
// ══════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  new SlotMachine();
});
