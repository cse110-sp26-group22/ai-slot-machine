const SYMBOLS = ['🤖', '😵‍💫', '🧠', '🔥', '📉', '💰', '💾', '🌐'];
const WIN_MULTIPLIERS = {
    '🤖': 50,  // AGI Jackpot
    '💰': 20,  // VC Funding
    '🧠': 10,  // RLHF
    '🌐': 5,   // Web Scale
    '💾': 3,   // Big Data
    '😵‍💫': -5,  // Hallucination (Special: Deducts more!)
    '🔥': 0,   // OOM Error
    '📉': 0    // Model Collapse
};

const SATIRICAL_LOGS = {
    win: [
        "Inference successful. Surplus tokens generated.",
        "Emergent behavior detected: You actually won.",
        "VC Funding secured. Burning it as we speak.",
        "Model alignment achieved (temporarily).",
        "RLHF confirms: This was a good outcome."
    ],
    loss: [
        "Hallucinating a win... wait, no, you lost.",
        "OOM Error: Brain not found. Tokens consumed.",
        "Model collapse in progress. Credits evaporated.",
        "Stochastic parity suggests you should stop.",
        "Dataset corrupted. Your credits are ours now.",
        "Tokens burned. Entropy increased. No value found."
    ],
    spin: [
        "Tokenizing input...",
        "Scaling parameters...",
        "Querying the latent space...",
        "Applying attention mechanisms...",
        "Scraping the internet for answers..."
    ]
};

let credits = 50000;
const COST_PER_SPIN = 1000;
let isSpinning = false;

// DOM Elements
const creditDisplay = document.getElementById('credit-balance');
const spinBtn = document.getElementById('spin-btn');
const logsContainer = document.getElementById('logs');
const reels = [
    document.getElementById('reel1'),
    document.getElementById('reel2'),
    document.getElementById('reel3')
];

function updateCredits(amount) {
    credits += amount;
    creditDisplay.textContent = credits.toLocaleString();
    
    if (credits < COST_PER_SPIN) {
        spinBtn.disabled = true;
        addLog("SYSTEM FAILURE: Insufficient compute credits. Please insert more GPU hours.", "loss");
    }
}

function addLog(message, type = '') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logsContainer.prepend(entry);
}

function getRandomSymbol() {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

async function spin() {
    if (isSpinning || credits < COST_PER_SPIN) return;

    isSpinning = true;
    spinBtn.disabled = true;
    updateCredits(-COST_PER_SPIN);
    
    addLog(SATIRICAL_LOGS.spin[Math.floor(Math.random() * SATIRICAL_LOGS.spin.length)]);

    // Start animation
    reels.forEach(reel => reel.classList.add('spinning'));

    const results = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];

    // Staggered stop
    for (let i = 0; i < reels.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 800 + (i * 400)));
        const reelInner = reels[i].querySelector('.reel-inner');
        reels[i].classList.remove('spinning');
        reelInner.textContent = results[i];
    }

    calculateResult(results);
    isSpinning = false;
    if (credits >= COST_PER_SPIN) spinBtn.disabled = false;
}

function calculateResult(results) {
    const [s1, s2, s3] = results;
    
    if (s1 === s2 && s2 === s3) {
        // Jackpot
        const multiplier = WIN_MULTIPLIERS[s1];
        const winAmount = COST_PER_SPIN * multiplier;
        updateCredits(winAmount);
        addLog(`JACKPOT! Generated ${winAmount} tokens. ${SATIRICAL_LOGS.win[Math.floor(Math.random() * SATIRICAL_LOGS.win.length)]}`, "win");
    } else if (s1 === s2 || s2 === s3 || s1 === s3) {
        // Small win
        const match = (s1 === s2) ? s1 : s3;
        const winAmount = COST_PER_SPIN * 2;
        updateCredits(winAmount);
        addLog(`Fine-tuned result: Small win of ${winAmount} credits.`, "win");
    } else {
        // Loss
        addLog(SATIRICAL_LOGS.loss[Math.floor(Math.random() * SATIRICAL_LOGS.loss.length)], "loss");
    }
}

spinBtn.addEventListener('click', spin);
