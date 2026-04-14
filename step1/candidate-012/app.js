const symbols = ['🤖', '🚀', '💎', '📈', '📉', '💡', '🏢'];
const weights = [0.25, 0.15, 0.05, 0.1, 0.3, 0.1, 0.05]; // Weighted probabilities
const spinCost = 100;
let tokens = 1000;

const reels = [
    document.getElementById('reel-1'),
    document.getElementById('reel-2'),
    document.getElementById('reel-3')
];
const spinBtn = document.getElementById('spin-btn');
const tokenDisplay = document.getElementById('token-balance');
const statusMsg = document.getElementById('status-message');

const satiricalMessages = [
    "Pivoting to Web4...",
    "Synergizing with the Cloud...",
    "Leveraging Big Data...",
    "Hallucinating Profit...",
    "Optimizing Burn Rate...",
    "Scaling to Infinity...",
    "Updating Privacy Policy...",
    "Raising Series B...",
    "Disrupting the industry...",
    "Adding more layers to the LLM...",
    "Waiting for GPU allocation..."
];

function getRandomSymbol() {
    const random = Math.random();
    let cumulativeWeight = 0;
    for (let i = 0; i < symbols.length; i++) {
        cumulativeWeight += weights[i];
        if (random < cumulativeWeight) {
            return symbols[i];
        }
    }
    return symbols[0];
}

function updateUI() {
    tokenDisplay.textContent = tokens;
    if (tokens < spinCost) {
        spinBtn.disabled = true;
        statusMsg.textContent = "BANKRUPTCY: Requesting Emergency Bailout...";
        statusMsg.style.color = "var(--danger-color)";
    }
}

async function spin() {
    if (tokens < spinCost) return;

    // Deduct cost
    tokens -= spinCost;
    updateUI();
    
    spinBtn.disabled = true;
    statusMsg.textContent = satiricalMessages[Math.floor(Math.random() * satiricalMessages.length)];
    statusMsg.style.color = "var(--secondary-color)";

    // Start spinning animation
    reels.forEach(reel => reel.classList.add('spinning'));

    const results = [];
    
    // Stop reels one by one
    for (let i = 0; i < reels.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 800 + i * 400));
        const symbol = getRandomSymbol();
        results.push(symbol);
        reels[i].classList.remove('spinning');
        reels[i].querySelector('.reel-content').textContent = symbol;
    }

    calculateResult(results);
    spinBtn.disabled = false;
    if (tokens >= spinCost) updateUI();
}

function calculateResult(results) {
    const [s1, s2, s3] = results;
    let winAmount = 0;

    if (s1 === s2 && s2 === s3) {
        // 3 of a kind
        switch (s1) {
            case '💎': winAmount = spinCost * 10; statusMsg.textContent = "SERIES A SECURED! ROI: 1000%"; break;
            case '🚀': winAmount = spinCost * 5; statusMsg.textContent = "VIRAL GROWTH! ROI: 500%"; break;
            case '🤖': winAmount = spinCost * 2; statusMsg.textContent = "LLM HALLUCINATION! ROI: 200%"; break;
            case '📈': winAmount = spinCost * 3; statusMsg.textContent = "HYPE OVERDRIVE! ROI: 300%"; break;
            case '📉': winAmount = 0; statusMsg.textContent = "TOTAL DESTRUCTION. ROI: 0%"; break;
            default: winAmount = spinCost * 1.5; statusMsg.textContent = "MODERATE SUCCESS. ROI: 150%";
        }
    } else if (s1 === s2 || s2 === s3 || s1 === s3) {
        // 2 of a kind
        winAmount = Math.floor(spinCost * 0.5);
        statusMsg.textContent = "PIVOTING: Retaining 50% Capital.";
    } else {
        statusMsg.textContent = "BURN RATE EXCEEDED. No Revenue.";
    }

    if (winAmount > 0) {
        tokens += winAmount;
        statusMsg.style.color = "var(--primary-color)";
        document.querySelector('.container').classList.add('win-flash');
        setTimeout(() => {
            document.querySelector('.container').classList.remove('win-flash');
        }, 1500);
    } else {
        statusMsg.style.color = "var(--danger-color)";
    }
    
    updateUI();
}

spinBtn.addEventListener('click', spin);
updateUI();
