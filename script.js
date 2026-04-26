// ===========================================
// BETWIN PRO - Complete JavaScript
// ===========================================

// ---------- DATA STORAGE ----------
let currentSlip = []; // Matches being built
let allBets = []; // All placed bets (online, won, lost)
let currentTab = 'online';
let profitPlan = {
    stake: 1000,
    odds: 1.5,
    targetProfit: 1000000,
    daysNeeded: 0,
    finalBalance: 0,
    progressPercent: 0
};

// Load from localStorage
function loadData() {
    const savedBets = localStorage.getItem('betwin_all_bets');
    const savedPlan = localStorage.getItem('betwin_profit_plan');
    
    if (savedBets) allBets = JSON.parse(savedBets);
    if (savedPlan) profitPlan = JSON.parse(savedPlan);
}

function saveData() {
    localStorage.setItem('betwin_all_bets', JSON.stringify(allBets));
    localStorage.setItem('betwin_profit_plan', JSON.stringify(profitPlan));
}

// ---------- UTILS ----------
function formatTZS(amount) {
    return 'Tzs. ' + Number(amount).toLocaleString('en-TZ', {
        maximumFractionDigits: 0,
        minimumFractionDigits: 0
    });
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ---------- NAVIGATION ----------
function navigateToPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    const pageMap = {
        'dashboard': 'dashboard-page',
        'calculator': 'calculator-page',
        'betslip': 'betslip-page'
    };
    
    const pageId = pageMap[pageName] || 'dashboard-page';
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-page') === pageName) {
            btn.classList.add('active');
        }
    });
    
    document.getElementById('profile-dropdown').classList.remove('show');
    
    refreshAllUI();
}

// ---------- BET TAB SWITCHING ----------
function switchBetTab(tab) {
    currentTab = tab;
    
    document.querySelectorAll('#tab-online, #tab-won, #tab-lost').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById('tab-' + tab).classList.add('active');
    
    displayBets(tab);
}

function displayBets(status) {
    const betsContainer = document.getElementById('bets-list');
    const betsEmpty = document.getElementById('bets-empty');
    
    const filteredBets = allBets.filter(bet => bet.status === status);
    
    if (filteredBets.length === 0) {
        betsContainer.style.display = 'none';
        betsEmpty.style.display = 'block';
        return;
    }
    
    betsContainer.style.display = 'block';
    betsEmpty.style.display = 'none';
    
    betsContainer.innerHTML = filteredBets.map(bet => {
        const matchDetails = bet.matches.map(m => 
            `<div style="font-size: 0.85rem; margin: 3px 0;">
                <strong>${m.match}</strong> · ${m.league}<br>
                <span style="color: #3498db;">${m.option}</span> · Odds: ${m.odds}
            </div>`
        ).join('');
        
        const statusBadge = {
            'online': '<span style="background: #3498db; color: white; padding: 3px 12px; border-radius: 15px; font-size: 0.8rem;">📝 Online</span>',
            'won': '<span style="background: #28a745; color: white; padding: 3px 12px; border-radius: 15px; font-size: 0.8rem;">🏆 Won</span>',
            'lost': '<span style="background: #dc3545; color: white; padding: 3px 12px; border-radius: 15px; font-size: 0.8rem;">❌ Lost</span>'
        }[bet.status];
        
        return `
            <div class="transaction-item" style="flex-direction: column; align-items: flex-start; gap: 10px;">
                <div style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #666; font-size: 0.85rem;">${new Date(bet.date).toLocaleString()}</span>
                    ${statusBadge}
                </div>
                <div style="width: 100%;">
                    ${matchDetails}
                </div>
                <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid #eee;">
                    <div>
                        <span style="color: #666;">Total Odds: <strong>${bet.totalOdds.toFixed(2)}</strong></span><br>
                        <span style="color: #666;">Stake: <strong>${formatTZS(bet.stake)}</strong></span>
                    </div>
                    <div style="text-align: right;">
                        <span style="color: #28a745; font-weight: 700; font-size: 1.1rem;">Potential: ${formatTZS(bet.potentialWin)}</span>
                        ${bet.status === 'online' ? `
                            <div style="margin-top: 5px; display: flex; gap: 5px;">
                                <button class="success" style="padding: 5px 12px; font-size: 0.8rem;" onclick="updateBetStatus('${bet.id}', 'won')">🏆 Won</button>
                                <button class="danger" style="padding: 5px 12px; font-size: 0.8rem;" onclick="updateBetStatus('${bet.id}', 'lost')">❌ Lost</button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateBetStatus(betId, newStatus) {
    const bet = allBets.find(b => b.id === betId);
    if (bet) {
        bet.status = newStatus;
        if (newStatus === 'won') {
            bet.wonAmount = bet.potentialWin;
        }
        saveData();
        refreshAllUI();
        showMessage('Bet marked as ' + newStatus.toUpperCase() + '!');
    }
}

// ---------- BETSLIP BUILDER ----------
function addMatchToSlip() {
    const match = document.getElementById('match-name').value.trim();
    const league = document.getElementById('match-league').value.trim();
    const option = document.getElementById('bet-option').value;
    const odds = parseFloat(document.getElementById('match-odds').value);
    
    if (!match) return showMessage('Please enter match teams', false);
    if (!league) return showMessage('Please enter league name', false);
    if (!odds || odds <= 1.0) return showMessage('Please enter valid odds (> 1.0)', false);
    
    currentSlip.push({
        id: generateId(),
        match: match,
        league: league,
        option: option,
        odds: odds
    });
    
    // Clear inputs
    document.getElementById('match-name').value = '';
    document.getElementById('match-league').value = '';
    document.getElementById('match-odds').value = '1.50';
    
    updateSlipUI();
}

function updateSlipUI() {
    const slipContainer = document.getElementById('current-slip-matches');
    const slipEmpty = document.getElementById('slip-empty');
    const matchCount = document.getElementById('match-count');
    const totalOddsDisplay = document.getElementById('total-odds-display');
    const potentialWin = document.getElementById('potential-win');
    const stake = parseFloat(document.getElementById('slip-stake').value) || 1000;
    
    matchCount.textContent = currentSlip.length + ' Match' + (currentSlip.length !== 1 ? 'es' : '');
    
    if (currentSlip.length === 0) {
        slipEmpty.style.display = 'block';
        slipContainer.innerHTML = '';
        totalOddsDisplay.textContent = '0.00';
        potentialWin.textContent = formatTZS(0);
        return;
    }
    
    slipEmpty.style.display = 'none';
    
    slipContainer.innerHTML = currentSlip.map((m, i) => `
        <div style="background: #f8fbff; padding: 12px; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid #3498db; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong>${m.match}</strong><br>
                <span style="font-size: 0.85rem; color: #666;">${m.league}</span><br>
                <span style="font-size: 0.85rem; color: #3498db;">${m.option}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-weight: 700; color: #28a745;">${m.odds.toFixed(2)}</span>
                <button class="danger" style="padding: 5px 10px; font-size: 0.75rem;" onclick="removeMatchFromSlip('${m.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    // Calculate total odds
    const totalOdds = currentSlip.reduce((product, m) => product * m.odds, 1);
    totalOddsDisplay.textContent = totalOdds.toFixed(2);
    potentialWin.textContent = formatTZS(stake * totalOdds);
}

function removeMatchFromSlip(matchId) {
    currentSlip = currentSlip.filter(m => m.id !== matchId);
    updateSlipUI();
}

function clearCurrentSlip() {
    currentSlip = [];
    updateSlipUI();
}

function placeBet() {
    if (currentSlip.length === 0) return showMessage('Add at least one match to your slip', false);
    
    const stake = parseFloat(document.getElementById('slip-stake').value) || 1000;
    if (stake < 100) return showMessage('Minimum stake is 100 TZS', false);
    
    const totalOdds = currentSlip.reduce((product, m) => product * m.odds, 1);
    
    const bet = {
        id: generateId(),
        matches: [...currentSlip],
        totalOdds: totalOdds,
        stake: stake,
        potentialWin: stake * totalOdds,
        date: new Date().toISOString(),
        status: 'online'
    };
    
    allBets.push(bet);
    currentSlip = [];
    
    saveData();
    updateSlipUI();
    refreshAllUI();
    navigateToPage('dashboard');
    showMessage('Bet placed successfully! Potential win: ' + formatTZS(bet.potentialWin));
}

// ---------- PROFIT CALCULATOR ----------
function calculateProfitPath() {
    const stake = parseFloat(document.getElementById('stake-input').value) || 1000;
    const odds = parseFloat(document.getElementById('odds-input').value) || 1.5;
    const targetProfit = parseFloat(document.getElementById('target-input').value) || 1000000;
    
    if (odds <= 1.0) return showMessage('Odds must be greater than 1.0', false);
    
    let balance = stake;
    let days = 0;
    const maxDays = 10000;
    
    while ((balance - stake) < targetProfit && days < maxDays) {
        balance *= odds;
        days++;
    }
    
    profitPlan = {
        stake: stake,
        odds: odds,
        targetProfit: targetProfit,
        daysNeeded: days >= maxDays ? Infinity : days,
        finalBalance: balance,
        progressPercent: days >= maxDays ? 0 : ((balance - stake) / targetProfit) * 100
    };
    
    const resultDiv = document.getElementById('calc-result');
    resultDiv.style.display = 'block';
    
    if (profitPlan.daysNeeded === Infinity) {
        document.getElementById('calc-days').textContent = 'Too Many Days';
        document.getElementById('calc-balance').textContent = 'Target unreachable';
        document.getElementById('calc-progress').style.width = '0%';
        document.getElementById('calc-profit-text').textContent = 'Adjust parameters';
        document.getElementById('calc-percent').textContent = 'N/A';
    } else {
        document.getElementById('calc-days').textContent = profitPlan.daysNeeded + ' Days';
        document.getElementById('calc-balance').textContent = 'Final: ' + formatTZS(profitPlan.finalBalance);
        document.getElementById('calc-progress').style.width = Math.min(100, profitPlan.progressPercent) + '%';
        document.getElementById('calc-profit-text').textContent = 'Profit: ' + formatTZS(profitPlan.finalBalance - stake);
        document.getElementById('calc-percent').textContent = profitPlan.progressPercent.toFixed(1) + '% of target';
    }
    
    saveData();
}

// ---------- DASHBOARD STATS ----------
function updateDashboardStats() {
    const online = allBets.filter(b => b.status === 'online').length;
    const won = allBets.filter(b => b.status === 'won').length;
    const lost = allBets.filter(b => b.status === 'lost').length;
    
    const totalProfit = allBets
        .filter(b => b.status === 'won')
        .reduce((sum, b) => sum + (b.wonAmount || b.potentialWin) - b.stake, 0);
    
    document.getElementById('stat-online').textContent = online;
    document.getElementById('stat-won').textContent = won;
    document.getElementById('stat-lost').textContent = lost;
    document.getElementById('stat-total-profit').textContent = formatTZS(totalProfit);
}

// ---------- UI REFRESH ----------
function refreshAllUI() {
    updateDashboardStats();
    displayBets(currentTab);
    updateSlipUI();
}

// ---------- MODAL ----------
function showMessage(msg, isSuccess = true) {
    document.getElementById('success-message').textContent = msg;
    document.getElementById('success-modal').style.display = 'flex';
}

function closeSuccessModal() {
    document.getElementById('success-modal').style.display = 'none';
}

// ---------- RESET ----------
function resetAllData() {
    if (confirm('Reset ALL data? This cannot be undone.')) {
        allBets = [];
        currentSlip = [];
        profitPlan = {
            stake: 1000,
            odds: 1.5,
            targetProfit: 1000000,
            daysNeeded: 0,
            finalBalance: 0,
            progressPercent: 0
        };
        localStorage.clear();
        saveData();
        refreshAllUI();
        document.getElementById('calc-result').style.display = 'none';
        showMessage('All data cleared!');
    }
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    
    // Set form values
    document.getElementById('stake-input').value = profitPlan.stake;
    document.getElementById('odds-input').value = profitPlan.odds;
    document.getElementById('target-input').value = profitPlan.targetProfit;
    
    // Profile toggle
    document.getElementById('profile-toggle').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('profile-dropdown').classList.toggle('show');
    });
    
    document.addEventListener('click', (e) => {
        const dd = document.getElementById('profile-dropdown');
        const btn = document.getElementById('profile-toggle');
        if (!btn.contains(e.target) && !dd.contains(e.target)) {
            dd.classList.remove('show');
        }
    });
    
    // Nav buttons
    document.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', function() {
            navigateToPage(this.getAttribute('data-page'));
        });
    });
    
    // Stake input live update
    document.getElementById('slip-stake').addEventListener('input', updateSlipUI);
    
    // Modal close
    document.getElementById('success-modal').addEventListener('click', function(e) {
        if (e.target === this) closeSuccessModal();
    });
    
    refreshAllUI();
});
