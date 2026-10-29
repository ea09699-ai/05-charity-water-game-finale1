const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreDisplay = document.getElementById("score");
const goalDisplay = document.getElementById("goalScore");
const bestDisplay = document.getElementById("best");
const statusDisplay = document.getElementById("statusText");
const difficultySelect = document.getElementById("difficultySelect");
const startButton = document.getElementById("startBtn");
const pauseButton = document.getElementById("pauseBtn");
const resetButton = document.getElementById("resetBtn");
const progressBar = document.getElementById("progressFill");
const progressLabel = document.getElementById("progressLabel");
const progressTrack = document.getElementById("progressTrack");
const milestoneMessage = document.getElementById("milestoneMessage");
const difficultyDescription = document.getElementById("difficultyDescription");
const canvasWrap = document.getElementById("canvasWrap");
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

// Difficulty settings
const difficultySettings = {
  easy: {
    gravity: 0.20,
    flapStrength: -4.5,
    pipeGap: 210,
    pipeSpeed: 2.0,
    pipeSpawnRate: 110,
    winScore: 5
  },

  medium: {
    gravity: 0.30,
    flapStrength: -5.0,
    pipeGap: 175,
    pipeSpeed: 2.7,
    pipeSpawnRate: 100,
    winScore: 10
  },

  hard: {
    gravity: 0.36,
    flapStrength: -5.5,
    pipeGap: 155,
    pipeSpeed: 3.1,
    pipeSpawnRate: 95,
    winScore: 15
  }
};

let settings = difficultySettings.medium;

let score = 0;
let bestScore = Number(localStorage.getItem("wingsForWaterBest")) || 0;

let gameRunning = false;
let gameOver = false;
let gameWon = false;
let frame = 0;
let animationId = null;

let pipes = [];
let waterDrops = [];
let obstacles = [];
let particles = [];
let reachedMilestones = [];

const bird = {
  x: 110,
  y: canvas.height / 2,
  width: 30,
  height: 24,
  velocity: 0,
  rotation: 0
};

const milestones = [
  { percentage: 30, message: "🌱 Great start! Keep going!" },
  { percentage: 60, message: "💧 You're making a difference!" },
  { percentage: 80, message: "🌊 Almost there! Keep flying!" }
];

// Sound effects using the browser's Web Audio API
let audioContext = null;

function playSound(frequency = 440, duration = 0.08, type = "sine") {
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(0.08, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    // The game still works if sound is unavailable.
  }
}

// Initial display
bestDisplay.textContent = bestScore;

// Apply selected difficulty
function applyDifficulty() {
  const selectedMode = difficultySelect.value;

  settings = difficultySettings[selectedMode] || difficultySettings.medium;

  goalDisplay.textContent = settings.winScore;

  const descriptions = {
    easy: "Easy mode: low gravity, wide pipe gaps, and slower pipes.",
    medium: "Medium mode: stronger gravity, narrower gaps, and faster pipes.",
    hard: "Hard mode: strongest gravity, narrow gaps, and fastest pipes."
  };

  difficultyDescription.textContent = descriptions[selectedMode] || descriptions.medium;

  updateProgress();
}

// Update progress bar and label
function updateProgress() {
  const percentage = Math.min(
    (score / settings.winScore) * 100,
    100
  );

  progressBar.style.width = percentage + "%";
  progressLabel.textContent = `${score} / ${settings.winScore} points`;

  progressTrack.setAttribute("aria-valuemax", settings.winScore);
  progressTrack.setAttribute("aria-valuenow", score);
}

// Update score and check milestones
function updateScore() {
  scoreDisplay.textContent = score;

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("wingsForWaterBest", bestScore);
    bestDisplay.textContent = bestScore;
  }

  updateProgress();
  checkMilestones();

  if (score >= settings.winScore && gameRunning) {
    winGame();
  }
}

// Show milestone messages
function checkMilestones() {
  const percentage = (score / settings.winScore) * 100;

  milestones.forEach((milestone, index) => {
    if (
      percentage >= milestone.percentage &&
      !reachedMilestones.includes(index)
    ) {
      reachedMilestones.push(index);
      milestoneMessage.textContent = milestone.message;
      playSound(660, 0.12);
    }
  });
}

// Reset game state
function resetGame() {
  score = 0;
  frame = 0;

  pipes = [];
  waterDrops = [];
  obstacles = [];
  particles = [];
  reachedMilestones = [];

  bird.y = canvas.height / 2;
  bird.velocity = 0;
  bird.rotation = 0;

  gameRunning = false;
  gameOver = false;
  gameWon = false;

  scoreDisplay.textContent = "0";
  statusDisplay.textContent = "Ready for takeoff? Start your game!";
  milestoneMessage.textContent = "";

  pauseButton.textContent = "PAUSE";
  pauseButton.disabled = true;

  updateProgress();
  draw();
}

// Start or resume the game
function startGame() {
  if (gameRunning) return;

  if (gameOver || gameWon) {
    resetGame();
  }

  applyDifficulty();

  gameRunning = true;
  gameOver = false;
  gameWon = false;

  statusDisplay.textContent = "Flying! Avoid pipes and collect water drops.";

  pauseButton.disabled = false;
  pauseButton.textContent = "PAUSE";

  if (pipes.length === 0) {
    addPipe();
  }

  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(gameLoop);
}

// Pause or resume
function pauseGame() {
  if (gameRunning) {
    gameRunning = false;

    statusDisplay.textContent = "Game paused. Press Resume to continue.";
    pauseButton.textContent = "RESUME";

    cancelAnimationFrame(animationId);
    draw();
  } else if (!gameOver && !gameWon && score >= 0 && pauseButton.textContent === "RESUME") {
    startGame();
  }
}

// End the game
function endGame() {
  if (gameOver || gameWon) return;

  gameRunning = false;
  gameOver = true;

  statusDisplay.textContent = "Game over! Press Start Game to try again.";

  pauseButton.disabled = true;
  playSound(150, 0.25, "sawtooth");

  cancelAnimationFrame(animationId);
  draw();
}

// Win the game
function winGame() {
  if (gameWon) return;

  gameRunning = false;
  gameWon = true;

  statusDisplay.textContent = "🎉 You did it! You reached your goal!";

  pauseButton.disabled = true;

  createConfetti();
  playSound(880, 0.25);

  cancelAnimationFrame(animationId);
  draw();
}

// Make the bird flap
function flap() {
  if (gameOver || gameWon) return;

  if (!gameRunning) {
    startGame();
  }

  if (gameRunning) {
    bird.velocity = settings.flapStrength;
    playSound(480, 0.05);
  }
}

// Create a pipe pair and possible collectibles
function addPipe() {
  const minimumGapY = 35;
  const maximumGapY = canvas.height - settings.pipeGap - 35;

  const gapY =
    minimumGapY + Math.random() * (maximumGapY - minimumGapY);

  pipes.push({
    x: canvas.width,
    width: 65,
    gapY,
    gap: settings.pipeGap,
    passed: false
  });

  if (Math.random() < 0.65) {
    waterDrops.push({
      x: canvas.width + 85,
      y: gapY + settings.pipeGap / 2,
      radius: 10,
      collected: false
    });
  }

  if (Math.random() < 0.20) {
    obstacles.push({
      x: canvas.width + 150,
      y: gapY + settings.pipeGap / 2,
      radius: 13,
      hit: false
    });
  }
}

// Update bird movement
function updateBird() {
  bird.velocity += settings.gravity;
  bird.y += bird.velocity;

  bird.rotation = Math.min(
    Math.max(bird.velocity * 0.07, -0.5),
    0.8
  );

  if (
    bird.y < 0 ||
    bird.y + bird.height > canvas.height - 12
  ) {
    endGame();
  }
}

// Update pipes and detect collisions
function updatePipes() {
  for (const pipe of pipes) {
    pipe.x -= settings.pipeSpeed;

    const birdRight = bird.x + bird.width;
    const birdBottom = bird.y + bird.height;

    const horizontalCollision =
      birdRight > pipe.x &&
      bird.x < pipe.x + pipe.width;

    const outsideGap =
      bird.y < pipe.gapY ||
      birdBottom > pipe.gapY + pipe.gap;

    if (horizontalCollision && outsideGap) {
      endGame();
      return;
    }

    if (!pipe.passed && pipe.x + pipe.width < bird.x) {
      pipe.passed = true;
      score++;
      updateScore();

      if (gameWon) return;
    }
  }

  pipes = pipes.filter(pipe => pipe.x + pipe.width > 0);
}

// Update collectible water drops
function updateWaterDrops() {
  for (const drop of waterDrops) {
    drop.x -= settings.pipeSpeed;

    const birdCenterX = bird.x + bird.width / 2;
    const birdCenterY = bird.y + bird.height / 2;

    const distance = Math.hypot(
      birdCenterX - drop.x,
      birdCenterY - drop.y
    );

    if (!drop.collected && distance < drop.radius + 12) {
      drop.collected = true;
      score++;

      updateScore();
      playSound(720, 0.12);

      statusDisplay.textContent = "💧 Water drop collected! +1 point!";

      if (gameWon) return;
    }
  }

  waterDrops = waterDrops.filter(
    drop => drop.x > -20 && !drop.collected
  );
}

// Update red obstacles
function updateObstacles() {
  for (const obstacle of obstacles) {
    obstacle.x -= settings.pipeSpeed;

    const birdCenterX = bird.x + bird.width / 2;
    const birdCenterY = bird.y + bird.height / 2;

    const distance = Math.hypot(
      birdCenterX - obstacle.x,
      birdCenterY - obstacle.y
    );

    if (!obstacle.hit && distance < obstacle.radius + 12) {
      obstacle.hit = true;

      score = Math.max(0, score - 2);

      updateScore();
      playSound(180, 0.15, "square");

      statusDisplay.textContent = "⚠️ Obstacle hit! -2 points.";
    }
  }

  obstacles = obstacles.filter(
    obstacle => obstacle.x > -30 && !obstacle.hit
  );
}

// Draw the background
function drawBackground() {
  const gradient = ctx.createLinearGradient(
    0,
    0,
    0,
    canvas.height
  );

  gradient.addColorStop(0, "#dff5ff");
  gradient.addColorStop(1, "#ffffff");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";

  drawCloud(80, 75);
  drawCloud(300, 125);
  drawCloud(520, 65);
  drawCloud(700, 150);

  ctx.fillStyle = "#f4c542";
  ctx.fillRect(0, canvas.height - 12, canvas.width, 12);
}

// Draw a cloud
function drawCloud(x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.arc(x + 20, y - 8, 22, 0, Math.PI * 2);
  ctx.arc(x + 43, y, 17, 0, Math.PI * 2);
  ctx.fill();
}

// Draw the bird
function drawBird() {
  ctx.save();

  ctx.translate(
    bird.x + bird.width / 2,
    bird.y + bird.height / 2
  );

  ctx.rotate(bird.rotation);

  ctx.fillStyle = "#f4c542";
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#e4a900";
  ctx.beginPath();
  ctx.ellipse(-4, 3, 8, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#172b4d";
  ctx.beginPath();
  ctx.arc(7, -4, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f07835";
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(23, 3);
  ctx.lineTo(14, 6);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// Draw pipes
function drawPipes() {
  pipes.forEach(pipe => {
    ctx.fillStyle = "#178b68";

    ctx.fillRect(
      pipe.x,
      0,
      pipe.width,
      pipe.gapY
    );

    ctx.fillRect(
      pipe.x,
      pipe.gapY + pipe.gap,
      pipe.width,
      canvas.height - pipe.gapY - pipe.gap
    );

    ctx.fillStyle = "#106b50";

    ctx.fillRect(
      pipe.x - 4,
      pipe.gapY - 12,
      pipe.width + 8,
      12
    );

    ctx.fillRect(
      pipe.x - 4,
      pipe.gapY + pipe.gap,
      pipe.width + 8,
      12
    );
  });
}

// Draw water drops
function drawWaterDrops() {
  waterDrops.forEach(drop => {
    ctx.fillStyle = "#20a9e0";

    ctx.beginPath();
    ctx.moveTo(drop.x, drop.y - drop.radius);

    ctx.quadraticCurveTo(
      drop.x + drop.radius + 2,
      drop.y + 2,
      drop.x,
      drop.y + drop.radius
    );

    ctx.quadraticCurveTo(
      drop.x - drop.radius - 2,
      drop.y + 2,
      drop.x,
      drop.y - drop.radius
    );

    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(drop.x - 3, drop.y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Draw red obstacles
function drawObstacles() {
  obstacles.forEach(obstacle => {
    ctx.fillStyle = "#e74c3c";

    ctx.beginPath();
    ctx.arc(
      obstacle.x,
      obstacle.y,
      obstacle.radius,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.strokeStyle = "#a93226";
    ctx.lineWidth = 3;
    ctx.stroke();
  });
}

// Create confetti for winning
function createConfetti() {
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -Math.random() * canvas.height,
      size: 4 + Math.random() * 5,
      speed: 1 + Math.random() * 3
    });
  }
}

// Draw confetti
function drawConfetti() {
  particles.forEach(particle => {
    ctx.fillStyle = "#f4c542";

    ctx.fillRect(
      particle.x,
      particle.y,
      particle.size,
      particle.size
    );

    particle.y += particle.speed;

    if (particle.y > canvas.height) {
      particle.y = -10;
      particle.x = Math.random() * canvas.width;
    }
  });
}

// Draw everything
function draw() {
  drawBackground();
  drawPipes();
  drawWaterDrops();
  drawObstacles();
  drawBird();

  if (gameWon) {
    drawConfetti();

    ctx.fillStyle = "#172b4d";
    ctx.font = "bold 28px Montserrat, sans-serif";
    ctx.textAlign = "center";

    ctx.fillText(
      "YOU DID IT!",
      canvas.width / 2,
      canvas.height / 2
    );
  }

  if (gameOver) {
    ctx.fillStyle = "rgba(23, 43, 77, 0.75)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 25px Montserrat, sans-serif";
    ctx.textAlign = "center";

    ctx.fillText(
      "GAME OVER",
      canvas.width / 2,
      canvas.height / 2
    );

    ctx.font = "16px Montserrat, sans-serif";

    ctx.fillText(
      "Press Start Game to try again",
      canvas.width / 2,
      canvas.height / 2 + 30
    );
  }
}

// Main game loop
function gameLoop() {
  if (!gameRunning) return;

  frame++;

  updateBird();

  if (!gameRunning) {
    draw();
    return;
  }

  updatePipes();

  if (!gameRunning) {
    draw();
    return;
  }

  updateWaterDrops();

  if (!gameRunning) {
    draw();
    return;
  }

  updateObstacles();

  if (!gameRunning) {
    draw();
    return;
  }

  if (frame % settings.pipeSpawnRate === 0) {
    addPipe();
  }

  draw();

  if (gameRunning) {
    animationId = requestAnimationFrame(gameLoop);
  }
}

// Start button
startButton.addEventListener("click", () => {
  startGame();
});

// Pause/resume button
pauseButton.addEventListener("click", () => {
  pauseGame();
});

// Reset button
resetButton.addEventListener("click", () => {
  cancelAnimationFrame(animationId);

  applyDifficulty();
  resetGame();
});

// Difficulty selector
difficultySelect.addEventListener("change", () => {
  cancelAnimationFrame(animationId);

  applyDifficulty();
  resetGame();

  statusDisplay.textContent =
    "Difficulty changed! Press Start Game when you're ready.";
});

// Clicking or tapping the game flaps the bird
canvas.addEventListener("pointerdown", event => {
  event.preventDefault();
  flap();
});

// Keyboard controls
document.addEventListener("keydown", event => {
  if (event.code === "Space") {
    event.preventDefault();

    // Avoid repeated flaps if Space is held down.
    if (!event.repeat) {
      flap();
    }
  }

  if (event.code === "KeyP" || event.code === "Escape") {
    pauseGame();
  }
});

// Mobile navigation
if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("is-open");

    menuToggle.setAttribute("aria-expanded", String(isOpen));

    menuToggle.setAttribute(
      "aria-label",
      isOpen ? "Close navigation menu" : "Open navigation menu"
    );
  });

  mainNav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation menu");
    });
  });
}

// Initialize the game
applyDifficulty();
resetGame();