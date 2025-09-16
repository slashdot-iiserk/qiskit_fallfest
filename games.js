// Quantum Games JavaScript
let currentGame = null;
let gameInterval = null;

// Game initialization
function startGame(gameType) {
    currentGame = gameType;
    const modal = document.getElementById('game-modal');
    const gameContent = document.getElementById('game-content');
    const gameTitle = document.getElementById('game-title');

    modal.style.display = 'flex';

    switch(gameType) {
        case 'coin':
            gameTitle.textContent = 'Quantum Coin Flip';
            gameContent.innerHTML = createCoinFlipGame();
            break;
        case 'entanglement':
            gameTitle.textContent = 'Entanglement Challenge';
            gameContent.innerHTML = createEntanglementGame();
            break;
        case 'qubit':
            gameTitle.textContent = 'Qubit Visualizer';
            gameContent.innerHTML = createQubitGame();
            break;
        case 'maze':
            gameTitle.textContent = 'Quantum Maze';
            gameContent.innerHTML = createMazeGame();
            break;
        case 'memory':
            gameTitle.textContent = 'Quantum Memory';
            gameContent.innerHTML = createMemoryGame();
            break;
    }

    // Add entrance animation
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

function closeGame() {
    const modal = document.getElementById('game-modal');
    modal.classList.remove('active');

    // Clear any running intervals
    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
    }

    setTimeout(() => {
        modal.style.display = 'none';
        currentGame = null;
    }, 300);
}

// Quantum Coin Flip Game
function createCoinFlipGame() {
    return `
        <div class="coin-game">
            <div class="game-instructions">
                <h4>How to Play</h4>
                <p>In quantum mechanics, a coin can be in superposition (both heads AND tails) until measured!</p>
                <p>Click "Flip Quantum Coin" to create a superposition, then "Measure" to collapse it to a definite state.</p>
            </div>

            <div class="coin-container">
                <div id="quantum-coin" class="quantum-coin">
                    <div class="coin-face heads">
                        <span class="coin-text">H</span>
                        <span class="coin-label">Heads</span>
                    </div>
                    <div class="coin-face tails">
                        <span class="coin-text">T</span>
                        <span class="coin-label">Tails</span>
                    </div>
                    <div class="coin-superposition">
                        <span class="superposition-text">⚛️</span>
                        <span class="superposition-label">Superposition</span>
                    </div>
                </div>
            </div>

            <div class="coin-controls">
                <button id="flip-btn" class="game-btn primary" onclick="flipQuantumCoin()">
                    <i class="fas fa-magic"></i> Flip Quantum Coin
                </button>
                <button id="measure-btn" class="game-btn secondary" onclick="measureCoin()" disabled>
                    <i class="fas fa-eye"></i> Measure
                </button>
                <button class="game-btn reset" onclick="resetCoin()">
                    <i class="fas fa-redo"></i> Reset
                </button>
            </div>

            <div class="probability-display">
                <div class="prob-item">
                    <span class="prob-label">Heads Probability:</span>
                    <span id="heads-prob" class="prob-value">50%</span>
                </div>
                <div class="prob-item">
                    <span class="prob-label">Tails Probability:</span>
                    <span id="tails-prob" class="prob-value">50%</span>
                </div>
            </div>
        </div>
    `;
}

// Entanglement Challenge Game
function createEntanglementGame() {
    return `
        <div class="entanglement-game">
            <div class="game-instructions">
                <h4>Entanglement Challenge</h4>
                <p>Two particles are entangled! When you measure one, the other instantly takes the opposite state.</p>
                <p>Try to predict the outcome when measuring entangled particles.</p>
            </div>

            <div class="entanglement-container">
                <div class="particle-pair">
                    <div id="particle-a" class="entangled-particle">
                        <div class="particle-label">Particle A</div>
                        <div class="particle-state">?</div>
                    </div>
                    <div class="entanglement-link">
                        <i class="fas fa-link"></i>
                        <span>Entangled</span>
                    </div>
                    <div id="particle-b" class="entangled-particle">
                        <div class="particle-label">Particle B</div>
                        <div class="particle-state">?</div>
                    </div>
                </div>
            </div>

            <div class="entanglement-controls">
                <button class="game-btn primary" onclick="entangleParticles()">
                    <i class="fas fa-atom"></i> Create Entanglement
                </button>
                <button id="measure-a-btn" class="game-btn secondary" onclick="measureParticle('a')" disabled>
                    <i class="fas fa-microscope"></i> Measure A
                </button>
                <button id="measure-b-btn" class="game-btn secondary" onclick="measureParticle('b')" disabled>
                    <i class="fas fa-microscope"></i> Measure B
                </button>
            </div>

            <div class="entanglement-results">
                <div id="result-display" class="result-display">
                    Click "Create Entanglement" to start!
                </div>
            </div>
        </div>
    `;
}

// Qubit Visualizer Game
function createQubitGame() {
    return `
        <div class="qubit-game">
            <div class="game-instructions">
                <h4>Qubit Visualizer</h4>
                <p>A qubit can exist in any superposition of |0⟩ and |1⟩ states, represented on the Bloch sphere.</p>
                <p>Use the controls to rotate the qubit and see how it affects the quantum state.</p>
            </div>

            <div class="qubit-visualizer">
                <div class="bloch-sphere">
                    <div id="qubit-state" class="qubit-point"></div>
                    <div class="sphere-labels">
                        <span class="state-0">|0⟩</span>
                        <span class="state-1">|1⟩</span>
                        <span class="state-plus">|+⟩</span>
                        <span class="state-minus">|-⟩</span>
                    </div>
                </div>

                <div class="qubit-controls">
                    <div class="control-group">
                        <label>θ (Polar Angle):</label>
                        <input type="range" id="theta-slider" min="0" max="180" value="0" oninput="updateQubit()">
                        <span id="theta-value">0°</span>
                    </div>
                    <div class="control-group">
                        <label>φ (Azimuthal Angle):</label>
                        <input type="range" id="phi-slider" min="0" max="360" value="0" oninput="updateQubit()">
                        <span id="phi-value">0°</span>
                    </div>
                </div>
            </div>

            <div class="qubit-state-display">
                <div class="state-vector">
                    <h4>State Vector:</h4>
                    <div id="state-vector-display">|ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩</div>
                </div>
                <div class="probabilities">
                    <div class="prob-item">
                        <span>P(|0⟩) = </span><span id="prob-0">1.00</span>
                    </div>
                    <div class="prob-item">
                        <span>P(|1⟩) = </span><span id="prob-1">0.00</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Quantum Maze Game
function createMazeGame() {
    return `
        <div class="maze-game">
            <div class="game-instructions">
                <h4>Quantum Maze</h4>
                <p>Use quantum tunneling to navigate through the maze! You can pass through walls probabilistically.</p>
                <p>Reach the goal (🏁) without getting stuck. The closer you are to a wall, the higher the tunneling probability!</p>
            </div>

            <div class="maze-container">
                <div id="maze-grid" class="maze-grid">
                    <!-- Maze will be generated here -->
                </div>
            </div>

            <div class="maze-controls">
                <div class="control-buttons">
                    <button class="game-btn primary" onclick="generateMaze()">
                        <i class="fas fa-dungeon"></i> New Maze
                    </button>
                    <button class="game-btn secondary" onclick="resetPlayer()">
                        <i class="fas fa-undo"></i> Reset
                    </button>
                </div>
                <div class="maze-stats">
                    <span id="moves-count">Moves: 0</span>
                    <span id="tunnels-used">Tunnels: 0</span>
                </div>
            </div>

            <div class="maze-legend">
                <div class="legend-item">
                    <span class="legend-symbol">🧑</span>
                    <span>You (Player)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-symbol">🏁</span>
                    <span>Goal</span>
                </div>
                <div class="legend-item">
                    <span class="legend-symbol">⬜</span>
                    <span>Wall</span>
                </div>
                <div class="legend-item">
                    <span class="legend-symbol">⚛️</span>
                    <span>Tunneling Zone</span>
                </div>
            </div>
        </div>
    `;
}

// Quantum Memory Game
function createMemoryGame() {
    return `
        <div class="memory-game">
            <div class="game-instructions">
                <h4>Quantum Memory Challenge</h4>
                <p>Remember the quantum states shown, then match them when they collapse to definite states!</p>
                <p>Each card shows a superposition until clicked, then it collapses to |0⟩ or |1⟩.</p>
            </div>

            <div class="memory-container">
                <div id="memory-grid" class="memory-grid">
                    <!-- Memory cards will be generated here -->
                </div>
            </div>

            <div class="memory-controls">
                <button class="game-btn primary" onclick="startMemoryGame()">
                    <i class="fas fa-play"></i> Start Game
                </button>
                <button class="game-btn secondary" onclick="resetMemoryGame()">
                    <i class="fas fa-redo"></i> Reset
                </button>
            </div>

            <div class="memory-stats">
                <div class="stat-item">
                    <span class="stat-label">Moves:</span>
                    <span id="memory-moves" class="stat-value">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Matches:</span>
                    <span id="memory-matches" class="stat-value">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Time:</span>
                    <span id="memory-time" class="stat-value">0s</span>
                </div>
            </div>
        </div>
    `;
}

// Game Functions
function flipQuantumCoin() {
    const coin = document.getElementById('quantum-coin');
    const measureBtn = document.getElementById('measure-btn');
    const flipBtn = document.getElementById('flip-btn');

    coin.classList.add('flipping');
    flipBtn.disabled = true;

    setTimeout(() => {
        coin.classList.remove('flipping');
        coin.classList.add('superposition');
        measureBtn.disabled = false;
        flipBtn.disabled = true;
    }, 1000);
}

function measureCoin() {
    const coin = document.getElementById('quantum-coin');
    const result = Math.random() < 0.5 ? 'heads' : 'tails';

    coin.classList.remove('superposition');
    coin.classList.add(result);

    document.getElementById('heads-prob').textContent = result === 'heads' ? '100%' : '0%';
    document.getElementById('tails-prob').textContent = result === 'tails' ? '100%' : '0%';

    document.getElementById('measure-btn').disabled = true;
}

function resetCoin() {
    const coin = document.getElementById('quantum-coin');
    coin.className = 'quantum-coin';

    document.getElementById('heads-prob').textContent = '50%';
    document.getElementById('tails-prob').textContent = '50%';

    document.getElementById('flip-btn').disabled = false;
    document.getElementById('measure-btn').disabled = true;
}

// Entanglement Game Functions
let entangled = false;
let particleAState = null;
let particleBState = null;

function entangleParticles() {
    entangled = true;
    particleAState = particleBState = null;

    document.getElementById('particle-a').className = 'entangled-particle';
    document.getElementById('particle-b').className = 'entangled-particle';
    document.getElementById('particle-a').querySelector('.particle-state').textContent = '?';
    document.getElementById('particle-b').querySelector('.particle-state').textContent = '?';

    document.getElementById('measure-a-btn').disabled = false;
    document.getElementById('measure-b-btn').disabled = false;
    document.getElementById('result-display').textContent = 'Particles are now entangled! Choose which one to measure first.';
}

function measureParticle(particle) {
    if (!entangled) return;

    const result = Math.random() < 0.5 ? '↑' : '↓';

    if (particle === 'a') {
        particleAState = result;
        particleBState = result === '↑' ? '↓' : '↑';
    } else {
        particleBState = result;
        particleAState = result === '↑' ? '↓' : '↑';
    }

    document.getElementById('particle-a').querySelector('.particle-state').textContent = particleAState;
    document.getElementById('particle-b').querySelector('.particle-state').textContent = particleBState;

    document.getElementById('particle-a').classList.add(particleAState === '↑' ? 'spin-up' : 'spin-down');
    document.getElementById('particle-b').classList.add(particleBState === '↑' ? 'spin-up' : 'spin-down');

    document.getElementById('measure-a-btn').disabled = true;
    document.getElementById('measure-b-btn').disabled = true;

    document.getElementById('result-display').textContent =
        `Particle A: ${particleAState}, Particle B: ${particleBState} - Perfect correlation!`;
}

// Qubit Visualizer Functions
function updateQubit() {
    const theta = document.getElementById('theta-slider').value;
    const phi = document.getElementById('phi-slider').value;

    document.getElementById('theta-value').textContent = theta + '°';
    document.getElementById('phi-value').textContent = phi + '°';

    // Calculate probabilities
    const thetaRad = (theta * Math.PI) / 180;
    const prob0 = Math.cos(thetaRad / 2) ** 2;
    const prob1 = Math.sin(thetaRad / 2) ** 2;

    document.getElementById('prob-0').textContent = prob0.toFixed(2);
    document.getElementById('prob-1').textContent = prob1.toFixed(2);

    // Update qubit position on Bloch sphere (simplified visualization)
    const qubitPoint = document.getElementById('qubit-state');
    const x = Math.sin(thetaRad) * Math.cos(phi * Math.PI / 180) * 40;
    const y = Math.sin(thetaRad) * Math.sin(phi * Math.PI / 180) * 40;
    const z = Math.cos(thetaRad) * 40;

    qubitPoint.style.transform = `translate(${x}px, ${-y}px)`;
}

// Maze Game Functions
function generateMaze() {
    const mazeGrid = document.getElementById('maze-grid');
    const size = 10;

    mazeGrid.innerHTML = '';

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const cell = document.createElement('div');
            cell.className = 'maze-cell';

            if (i === 0 && j === 0) {
                cell.classList.add('player');
                cell.innerHTML = '🧑';
            } else if (i === size - 1 && j === size - 1) {
                cell.classList.add('goal');
                cell.innerHTML = '🏁';
            } else if (Math.random() < 0.3) {
                cell.classList.add('wall');
                cell.innerHTML = '⬜';
            } else {
                cell.innerHTML = '⬛';
            }

            mazeGrid.appendChild(cell);
        }
    }
}

function resetPlayer() {
    const cells = document.querySelectorAll('.maze-cell');
    cells.forEach(cell => {
        if (cell.classList.contains('player')) {
            cell.classList.remove('player');
            cell.innerHTML = '⬛';
        }
    });

    const startCell = document.querySelector('.maze-grid').children[0];
    startCell.classList.add('player');
    startCell.innerHTML = '🧑';
}

// Memory Game Functions
function startMemoryGame() {
    const memoryGrid = document.getElementById('memory-grid');
    const cards = [];

    // Create pairs of quantum states
    const states = ['|0⟩', '|1⟩', '|+⟩', '|-⟩', '|i⟩', '|-i⟩'];
    const gameStates = [...states, ...states]; // Duplicate for pairs

    // Shuffle array
    for (let i = gameStates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gameStates[i], gameStates[j]] = [gameStates[j], gameStates[i]];
    }

    memoryGrid.innerHTML = '';

    gameStates.forEach((state, index) => {
        const card = document.createElement('div');
        card.className = 'memory-card';
        card.dataset.state = state;
        card.dataset.index = index;
        card.innerHTML = '⚛️';
        card.onclick = () => flipMemoryCard(card);
        memoryGrid.appendChild(card);
    });
}

function resetMemoryGame() {
    document.getElementById('memory-moves').textContent = '0';
    document.getElementById('memory-matches').textContent = '0';
    document.getElementById('memory-time').textContent = '0s';
    startMemoryGame();
}

function flipMemoryCard(card) {
    if (card.classList.contains('flipped') || card.classList.contains('matched')) return;

    card.classList.add('flipped');
    card.innerHTML = card.dataset.state;

    const flippedCards = document.querySelectorAll('.memory-card.flipped:not(.matched)');

    if (flippedCards.length === 2) {
        setTimeout(() => {
            if (flippedCards[0].dataset.state === flippedCards[1].dataset.state) {
                flippedCards.forEach(card => {
                    card.classList.add('matched');
                    card.classList.remove('flipped');
                });
            } else {
                flippedCards.forEach(card => {
                    card.classList.remove('flipped');
                    card.innerHTML = '⚛️';
                });
            }
        }, 1000);
    }
}

// Initialize games on page load
document.addEventListener('DOMContentLoaded', function() {
    // Add keyboard support for closing modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.getElementById('game-modal').style.display === 'flex') {
            closeGame();
        }
    });
});</content>
<parameter name="filePath">/home/shuvam/codes/qiskit_fallfest/games.js