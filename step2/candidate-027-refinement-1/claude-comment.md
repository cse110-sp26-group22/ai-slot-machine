The app is already complete with:

- **[index.html](index.html)** — Full semantic markup: header with animated lights, stats bar, 3-reel machine, bet controls, paytable, inference log, and broke modal
- **[script.js](script.js)** — All game logic: weighted random symbols, reel strip animation, win detection, Web Audio API sound effects, particle effects, localStorage persistence, keyboard shortcuts
- **[style.css](style.css)** — Full dark cyberpunk theme with CSS custom properties, responsive layout, animations

Here's what's already built:

**AI-mocking theme:**
- Symbols: `🤖 SKYNET`, `🧠 GPT-∞`, `⚡ GPU MELT`, `💎 PREMIUM`, `📡 API CALL`, `🎲 HALLUCN.`, `💬 PROMPT`
- Spin button says "Run Inference"
- Loss messages mock AI: *"SAFETY FILTER triggered: winning was deemed harmful"*, *"Error 429: Too many winning attempts. Rate limited"*
- Win messages: *"SKYNET ONLINE — all tokens belong to you now"*, *"Unexpected token surplus detected. Anthropic notified"*
- Broke modal: *"Your context window is empty. The model has been deprecated. Please upgrade to Enterprise tier."*
- Spinning shows AI thinking messages: *"Hallucinating outcome..."*, *"Running RLHF reward model..."*

**Scalable design:**
- CSS custom properties (`--sym-h`, `--reel-w`, `--accent-*`) for easy theming
- `SYMBOLS` array is the single source of truth — add/remove symbols there and the paytable, reels, and odds all update automatically
- `BET_STEPS` array controls available bets
- Message arrays are trivially extensible

**Resource efficiency:**
- Pure CSS animations (GPU-composited `transform`/`opacity` only)
- Web Audio API synthesizes sounds — no audio files to download
- Particles are DOM nodes that self-remove after animation
- `will-change: transform` on the reel strip only

**UX:**
- `SPACE` to spin, `↑↓` to change bet
- localStorage persistence across sessions
- Inference log with last 20 spins
- Responsive down to mobile (360px)
