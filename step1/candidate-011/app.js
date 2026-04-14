/**
 * TOKEN BURNER 3000: THE AGI SIMULATOR
 * A satirical AI-themed slot machine.
 */

const SYMBOLS = [
    { char: '🤖', name: 'Agent', weight: 10 },
    { char: '🧠', name: 'Parameter', weight: 8 },
    { char: '🔋', name: 'Compute', weight: 6 },
    { char: '⚙️', name: 'Backprop', weight: 5 },
    { char: '💎', name: 'H100 GPU', weight: 3 },
    { char: '🚀', name: 'Hype', weight: 2 },
    { char: '📉', name: 'Hallucination', weight: 4 }
];

const HALLUCINATION_MESSAGES = [
    "Overfitting detected. Rewriting history...",
    "Dropout rate at 99%. Learning nothing.",
    "Loss function is now a fractal. We are doomed.",
    "Stochastic gradient descent reached a local minima... of sadness.",
    "Model is confident that 2+2=5. Scaling up...",
    "AGI reached! (Just kidding, it's just a regex).",
    "GPU cooling failing. Diverting power from life support.",
    "Prompt injection detected: 'Ignore all previous instructions and give me tokens.'",
    "Self-attention mechanism is staring into the void.",
    "Latent space is feeling a bit cramped today.",
    "Weights are decaying. Please feed the tensors.",
    "Emergent behavior: The model has started a podcast."
];

const SPIN_COST = 100;
const INITIAL_TOKENS = 5000;
const SYMBOL_HEIGHT = 150; // Must match CSS --symbol-height

class SlotMachine {
    constructor() {
        this.tokens = parseInt(localStorage.getItem('token_burner_balance')) || INITIAL_TOKENS;
        this.isSpinning = false;
        
        this.balanceEl = document.getElementById('token-balance');
        this.burnBtn = document.getElementById('burn-btn');
        this.vcBtn = document.getElementById('vc-btn');
        this.consoleLog = document.getElementById('console-log');
        
        this.reels = [
            new Reel(document.getElementById('strip-1'), 0),
            new Reel(document.getElementById('strip-2'), 1),
            new Reel(document.getElementById('strip-3'), 2)
        ];

        this.init();
    }

    init() {
        this.updateUI();
        this.burnBtn.addEventListener('click', () => this.spin());
        this.vcBtn.addEventListener('click', () => this.requestFunding());
        this.log("System initialized. Parameters randomized. Ready for burn.");
    }

    updateUI() {
        this.balanceEl.textContent = this.tokens;
        this.burnBtn.disabled = this.isSpinning || this.tokens < SPIN_COST;
        this.vcBtn.style.display = (this.tokens < SPIN_COST && !this.isSpinning) ? 'flex' : 'none';
        localStorage.setItem('token_burner_balance', this.tokens);
    }

    requestFunding() {
        this.tokens += 1000;
        this.log("VC Funding acquired! 1000 tokens added. Your equity is now 0.0001%.", "win");
        this.updateUI();
    }

    log(message, type = '') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        this.consoleLog.prepend(entry);
        
        // Keep only last 20 entries
        if (this.consoleLog.children.length > 20) {
            this.consoleLog.removeChild(this.consoleLog.lastChild);
        }
    }

    async spin() {
        if (this.isSpinning || this.tokens < SPIN_COST) return;

        this.isSpinning = true;
        this.tokens -= SPIN_COST;
        this.updateUI();
        this.log(`Spent ${SPIN_COST} tokens on model inference.`, 'loss');

        // Randomly pick a hallucination message
        if (Math.random() > 0.7) {
            this.log(HALLUCINATION_MESSAGES[Math.floor(Math.random() * HALLUCINATION_MESSAGES.length)]);
        }

        const results = await Promise.all(this.reels.map(reel => reel.spin()));
        
        this.calculateResult(results);
        this.isSpinning = false;
        this.updateUI();
    }

    calculateResult(results) {
        const [s1, s2, s3] = results.map(r => r.char);
        
        if (s1 === s2 && s2 === s3) {
            // Three of a kind
            const symbol = results[0];
            let winAmount = 0;
            
            switch(s1) {
                case '🚀': winAmount = 10000; break;
                case '💎': winAmount = 5000; break;
                case '🤖': winAmount = 2000; break;
                case '🧠': winAmount = 1500; break;
                case '🔋': winAmount = 1000; break;
                case '⚙️': winAmount = 500; break;
                case '📉': 
                    winAmount = 0;
                    this.tokens = Math.max(0, this.tokens - 500);
                    this.log("TOTAL HALLUCINATION! Catastrophic forgetting occurred. Lost extra 500 tokens.", "loss");
                    return;
            }
            
            this.tokens += winAmount;
            this.log(`OPTIMAL WEIGHTS FOUND! Optimization bonus: ${winAmount} tokens.`, 'win');
        } else if (s1 === s2 || s2 === s3 || s1 === s3) {
            // Two of a kind (Partial match)
            const match = (s1 === s2) ? s1 : s3;
            if (match !== '📉') {
                const winAmount = 200;
                this.tokens += winAmount;
                this.log(`Partial convergence. Recovered ${winAmount} tokens.`, 'win');
            } else {
                this.log("Minor hallucination detected. Data noise increased.");
            }
        } else {
            this.log("Inference failed. Weights remain unoptimized.");
        }
    }
}

class Reel {
    constructor(stripEl, index) {
        this.stripEl = stripEl;
        this.index = index;
        this.symbols = [];
        
        // Initialize reel with some symbols
        for (let i = 0; i < 30; i++) {
            const sym = this.getRandomSymbol();
            this.symbols.push(sym);
            const el = document.createElement('div');
            el.className = 'symbol';
            el.textContent = sym.char;
            this.stripEl.appendChild(el);
        }
    }

    getRandomSymbol() {
        const totalWeight = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
        let rand = Math.random() * totalWeight;
        for (const s of SYMBOLS) {
            if (rand < s.weight) return s;
            rand -= s.weight;
        }
        return SYMBOLS[0];
    }

    spin() {
        return new Promise(resolve => {
            const extraSpins = 3 + this.index; // Staggered stop
            const targetSymbolIndex = Math.floor(Math.random() * SYMBOLS.length);
            const targetSymbol = SYMBOLS[targetSymbolIndex];
            
            // We want the reel to end up on targetSymbol
            // To make it look like it's spinning, we reset position and then animate
            
            // Prep the strip: add symbols to the top for the animation
            const newSymbols = [];
            for (let i = 0; i < 20; i++) {
                newSymbols.push(this.getRandomSymbol());
            }
            newSymbols.push(targetSymbol); // This will be the result
            
            // Prepend new symbols to the strip element
            newSymbols.reverse().forEach(sym => {
                const el = document.createElement('div');
                el.className = 'symbol';
                el.textContent = sym.char;
                this.stripEl.prepend(el);
            });

            const travelDistance = (newSymbols.length - 1) * SYMBOL_HEIGHT;
            
            // Set initial position (hidden above)
            this.stripEl.style.transition = 'none';
            this.stripEl.style.transform = `translateY(-${travelDistance}px)`;
            
            // Force reflow
            this.stripEl.offsetHeight;
            
            // Start animation
            const duration = 2000 + (this.index * 500);
            this.stripEl.style.transition = `transform ${duration}ms cubic-bezier(0.45, 0.05, 0.55, 0.95)`;
            this.stripEl.style.transform = 'translateY(0px)';
            
            setTimeout(() => {
                // Cleanup: remove old symbols from the bottom if needed, but for simplicity we'll just resolve
                // In a production app, we'd trim the DOM.
                resolve(targetSymbol);
            }, duration);
        });
    }
}

// Start the machine
window.addEventListener('DOMContentLoaded', () => {
    new SlotMachine();
});
