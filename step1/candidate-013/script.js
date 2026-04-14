const SYMBOLS = [
    { char: '🧠', weight: 1, label: 'AGI', value: 500 },
    { char: '🔥', weight: 5, label: 'GPU OVERCLOCK', value: 100 },
    { char: '📊', weight: 10, label: 'CLEAN DATA', value: 50 },
    { char: '🦜', weight: 25, label: 'STOCHASTIC PARROT', value: 20 },
    { char: '🌀', weight: 59, label: 'HALLUCINATION', value: 0 }
];

const MESSAGES = [
    "Dithering weights...",
    "Avoiding alignment...",
    "Regurgitating training data...",
    "Minimizing loss function...",
    "Stochastic parrot mode: ACTIVE",
    "Optimizing for clicks...",
    "Ignoring ethical guidelines...",
    "Synthesizing corporate buzzwords...",
    "Hallucinating a better reality...",
    "Mode collapse imminent...",
    "Simulating intelligence..."
];

const WIN_MESSAGES = [
    "General Intelligence Achieved! Scaling up...",
    "Seed funding secured! Series A looks bright.",
    "Data quality improved by 0.001%. Success!",
    "GPU efficiency optimized. Printing credits..."
];

const LOSS_MESSAGES = [
    "Model collapsed. Back to the drawing board.",
    "Out of Memory: GPU exploded.",
    "Hallucination detected. Truth is subjective.",
    "Stochastic parrot error. No intelligence found.",
    "Bias detected. Please recalibrate."
];

let tokens = 1000;
let isSpinning = false;

const tokenDisplay = document.getElementById('token-count');
const inferenceBtn = document.getElementById('inference-btn');
const consoleOutput = document.getElementById('console-output');
const reels = [
    document.getElementById('reel-1'),
    document.getElementById('reel-2'),
    document.getElementById('reel-3')
];

function getRandomSymbol() {
    const totalWeight = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;
    for (const symbol of SYMBOLS) {
        if (random < symbol.weight) return symbol;
        random -= symbol.weight;
    }
    return SYMBOLS[SYMBOLS.length - 1];
}

function logStatus(message, type = '') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `> ${message}`;
    consoleOutput.prepend(entry);
    
    // Keep console clean
    if (consoleOutput.children.length > 10) {
        consoleOutput.removeChild(consoleOutput.lastChild);
    }
}

async function runInference() {
    if (isSpinning || tokens < 10) return;

    // Deduct tokens
    tokens -= 10;
    updateTokenDisplay();
    isSpinning = true;
    inferenceBtn.disabled = true;

    logStatus(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);

    // Start spin animation
    reels.forEach(reel => {
        reel.classList.add('spinning');
    });

    // Random duration for each reel to stop
    const results = [];
    for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 500 + (i * 300)));
        const symbol = getRandomSymbol();
        results.push(symbol);
        
        const reelContent = reels[i].querySelector('.reel-content');
        reelContent.textContent = symbol.char;
        reels[i].classList.remove('spinning');
    }

    calculateResult(results);
    isSpinning = false;
    inferenceBtn.disabled = tokens < 10;

    if (tokens < 10) {
        logStatus("VC FUNDING EXHAUSTED. PLEASE PIVOT TO WEB4.", "loss");
    }
}

function calculateResult(results) {
    const charCounts = {};
    results.forEach(r => charCounts[r.char] = (charCounts[r.char] || 0) + 1);

    const winSymbol = SYMBOLS.find(s => charCounts[s.char] >= 2);
    
    if (winSymbol && winSymbol.value > 0) {
        let winAmount = 0;
        if (charCounts[winSymbol.char] === 3) {
            winAmount = winSymbol.value * 5; // Big win for 3 matches
            logStatus(`JACKPOT: ${winSymbol.label} - ${WIN_MESSAGES[Math.floor(Math.random() * WIN_MESSAGES.length)]}`, "win");
        } else {
            winAmount = winSymbol.value;
            logStatus(`MATCH: ${winSymbol.label} - Credits recovered.`, "win");
        }
        
        tokens += winAmount;
        updateTokenDisplay();
    } else {
        logStatus(LOSS_MESSAGES[Math.floor(Math.random() * LOSS_MESSAGES.length)], "loss");
    }
}

function updateTokenDisplay() {
    tokenDisplay.textContent = tokens;
}

inferenceBtn.addEventListener('click', runInference);

// Initialization
logStatus("System ready. Inference cost: 10 Tokens.");
