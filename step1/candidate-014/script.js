const SYMBOLS = [
    { icon: '🤖', name: 'Model', weight: 10 },
    { icon: '🔥', name: 'GPU', weight: 5 },
    { icon: '☁️', name: 'Hallucination', weight: 2 },
    { icon: '💰', name: 'VC Funding', weight: 1 },
    { icon: '📉', name: 'Alignment', weight: 8 }
];

const SPIN_COST = 10;
const REEL_DELAY = 500; // ms between reel stops

let credits = 1000;
let totalTokens = 0;

const creditsEl = document.getElementById('credits');
const tokensEl = document.getElementById('tokens');
const spinBtn = document.getElementById('spin-btn');
const logOutput = document.getElementById('log-output');
const reels = [
    document.getElementById('reel1'),
    document.getElementById('reel2'),
    document.getElementById('reel3')
];

const messages = [
    "Optimizing transformer layers...",
    "Crawling copyrighted datasets...",
    "Finetuning on synthetic noise...",
    "Running RLHF for brand safety...",
    "Hallucinating a profitable business model...",
    "Scaling cluster to 100k GPUs...",
    "Attempting to solve the alignment problem...",
    "Burning through seed funding...",
    "Converting electricity into buzzwords...",
    "Consulting with prompt engineers..."
];

function addLog(msg, type = 'info') {
    const div = document.createElement('div');
    div.textContent = `[${type.toUpperCase()}] ${msg}`;
    if (type === 'error') div.className = 'error';
    logOutput.prepend(div);
    if (logOutput.children.length > 20) logOutput.lastElementChild.remove();
}

function getRandomSymbol() {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function calculateWinnings(results) {
    const icons = results.map(r => r.icon);
    
    // Check for 3 of a kind
    if (icons[0] === icons[1] && icons[1] === icons[2]) {
        const symbol = results[0];
        // Rarity-based payout
        const payout = (11 - symbol.weight) * 100;
        return { tokens: payout, type: 'JACKPOT' };
    }
    
    // Check for 2 of a kind
    if (icons[0] === icons[1] || icons[1] === icons[2] || icons[0] === icons[2]) {
        return { tokens: 20, type: 'PARTIAL_CONVERGENCE' };
    }

    return { tokens: 0, type: 'LOSS' };
}

async function spin() {
    if (credits < SPIN_COST) {
        addLog("Insufficient compute credits. Pivot to a new startup.", "error");
        return;
    }

    credits -= SPIN_COST;
    updateUI();
    spinBtn.disabled = true;

    addLog(messages[Math.floor(Math.random() * messages.length)]);

    // Start spinning
    reels.forEach(reel => reel.classList.add('spinning'));

    const results = [];
    
    // Stop reels one by one
    for (let i = 0; i < reels.length; i++) {
        await new Promise(resolve => setTimeout(resolve, REEL_DELAY + (i * 200)));
        const symbol = getRandomSymbol();
        results.push(symbol);
        reels[i].classList.remove('spinning');
        reels[i].textContent = symbol.icon;
    }

    const win = calculateWinnings(results);
    
    if (win.tokens > 0) {
        totalTokens += win.tokens;
        addLog(`${win.type}! Generated ${win.tokens} synthetic tokens.`, 'info');
        // Visual feedback for win
        reels.forEach(r => r.style.borderColor = 'var(--accent-color)');
        setTimeout(() => reels.forEach(r => r.style.borderColor = '#333'), 1000);
    } else {
        addLog("Zero convergence. Tokens burned.", 'error');
    }

    // Occasional "Hallucination" event
    if (Math.random() > 0.9) {
        const fakeWin = Math.floor(Math.random() * 1000);
        addLog(`HALLUCINATION: Model thinks it won ${fakeWin} tokens. Data is corrupted.`, 'error');
    }

    updateUI();
    spinBtn.disabled = false;
}

function updateUI() {
    creditsEl.textContent = credits;
    tokensEl.textContent = totalTokens;
}

spinBtn.addEventListener('click', spin);

// Initial state
updateUI();
addLog("System initialized. Parameters: 175B.");
