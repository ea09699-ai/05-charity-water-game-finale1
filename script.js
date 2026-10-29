const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreDisplay = document.getElementById("score");
const goalDisplay = document.getElementById("goal");
const bestDisplay = document.getElementById("bestScore");
const statusDisplay = document.getElementById("gameStatus");
const difficultySelect = document.getElementById("difficulty");
const startButton = document.getElementById("startButton");
const pauseButton = document.getElementById("pauseButton");
const resetButton = document.getElementById("resetButton");
const progressBar = document.getElementById("progressBar");
const milestoneMessage = document.getElementById("milestoneMessage");

const difficultySettings = {
  easy: {
    gravity: 0.20,
    flapStrength: -4.5,
    pipeGap: 210,
    pipeSpeed: 2.0,
    pipeSpawnRate: 105,
    winScore: 5
  },

  medium: {
    gravity: 0.30,
    flapStrength: -5.0,
    pipeGap: 175,
    pipeSpeed: 2.7,
    pipeSpawnRate: 95,
    winScore: 10
  },

  hard: {
    gravity: 0.38,
    flapStrength: -5.5,
    pipeGap: 155,
    pipeSpeed: 3.2,
    pipeSpawnRate: 90,
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
let animationId;
let pipes = [];
let waterDrops = [];
let obstacles = [];
let particles = [];

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

let reachedMilestones = [];

bestDisplay.textContent = bestScore;

function applyDifficulty() {
  const selectedMode = difficultySelect.value;
  settings = difficultySettings[selectedMode] || difficultySettings.medium;
  goalDisplay.textContent = settings.winScore;
  updateProgress();
}

function updateScore() {
  scoreDisplay.textContent = score;

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("wingsForWaterBest", bestScore);
    bestDisplay.textContent = bestScore;
  }

  updateProgress();
  checkMilestones();

  if (score >= settings.winScore) {
    winGame();
  }
}

function updateProgress() {
  const percentage = Math.min((score / settings.winScore) * 100, 100);

  if (progressBar) {
    progressBar.style.width = percentage + "%";
  }
}

function checkMilestones() {
  const percentage = (score / settings.winScore) * 100;

  milestones.forEach((milestone, index) => {
    if (
      percentage >= milestone.percentage &&
      !reachedMilestones.includes(index)
    ) {
      reachedMilestones.push(index);

      if (milestoneMessage) {
        milestoneMessage.textContent = milestone.message;
      }
    }
  });
}

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
  statusDisplay.textContent = "Ready to fly! Press Start or tap the game.";
  
  if (milestoneMessage) {
    milestoneMessage.textContent = "";
  }

  updateProgress();
  draw();
}

function startGame() {
  if (gameRunning) return;

  if (gameOver || gameWon) {
    resetGame();
  }

  applyDifficulty();
  gameRunning = true;
  gameOver = false;
  gameWon = false;

  statusDisplay.textContent = "Flying! Avoid the pipes and collect water drops.";

  if (pipes.length === 0) {
    addPipe();
  }

  cancelAnimationFrame(animationId);
  gameLoop();
}

function pauseGame() {
  if (!gameRunning) return;

  gameRunning = false;
  statusDisplay.textContent = "Game paused. Press Resume to continue.";
  cancelAnimationFrame(animationId);
  draw();
}

function endGame() {
  gameRunning = false;
  gameOver = true;
  statusDisplay.textContent = "Game over! Press Start to try again.";
  cancelAnimationFrame(animationId);
  draw();
}

function winGame() {
  if (gameWon) return;

  gameRunning = false;
  gameWon = true;
  statusDisplay.textContent = "🎉 You did it! You reached the goal!";
  createConfetti();
  draw();
}

function flap() {
  if (!gameRunning) {
    if (!gameOver && !gameWon) {
      startGame();
    } else {
      startGame();
    }
  }

  if (gameRunning) {
    bird.velocity = settings.flapStrength;
  }
}

function addPipe() {
  const minimumGapY = 40;
  const maximumGapY = canvas.height - settings.pipeGap - 40;

  const gapY =
    minimumGapY + Math.random() * (maximumGapY - minimumGapY);

  pipes.push({
    x: canvas.width,
    width: 65,
    gapY: gapY,
    gap: settings.pipeGap,
    passed: false
  });

  // Add an occasional water drop between the pipes.
  if (Math.random() < 0.65) {
    waterDrops.push({
      x: canvas.width + 75,
      y: gapY + settings.pipeGap / 2,
      radius: 10,
      collected: false
    });
  }

  // Add occasional obstacles for an extra challenge.
  if (Math.random() < 0.25) {
    obstacles.push({
      x: canvas.width + 140,
      y: gapY + settings.pipeGap / 2,
      radius: 13,
      hit: false
    });
  }
}

function updateBird() {
  bird.velocity += settings.gravity;
  bird.y += bird.velocity;

  bird.rotation = Math.min(
    Math.max(bird.velocity * 0.07, -0.5),
    0.8
  );

  if (bird.y < 0 || bird.y + bird.height > canvas.height) {
    endGame();
  }
}

function updatePipes() {
  pipes.forEach((pipe) => {
    pipe.x -= settings.pipeSpeed;

    const birdRight = bird.x + bird.width;
    const birdBottom = bird.y + bird.height;

    const horizontalCollision =
      birdRight > pipe.x && bird.x < pipe.x + pipe.width;

    const outsideGap =
      bird.y < pipe.gapY ||
      birdBottom > pipe.gapY + pipe.gap;

    if (horizontalCollision && outsideGap) {
      endGame();
    }

    if (!pipe.passed && pipe.x + pipe.width < bird.x) {
      pipe.passed = true;
      score++;
      updateScore();
    }
  });

  pipes = pipes.filter((pipe) => pipe.x + pipe.width > 0);
}

function updateWaterDrops() {
  waterDrops.forEach((drop) => {
    drop.x -= settings.pipeSpeed;

    const birdCenterX = bird.x + bird.width / 2;
    const birdCenterY = bird.y + bird.height / 2;

    const distance = Math.hypot(
      birdCenterX - drop.x,
      birdCenterY - drop.y
    );

    if (!drop.collected && distance < drop.radius + 14) {
      drop.collected = true;
      score++;
      updateScore();
      statusDisplay.textContent = "💧 Water drop collected! +1 point!";
    }
  });

  waterDrops = waterDrops.filter(
    (drop) => drop.x > -20 && !drop.collected
  );
}

function updateObstacles() {
  obstacles.forEach((obstacle) => {
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
      statusDisplay.textContent = "⚠️ Obstacle hit! -2 points.";
    }
  });

  obstacles = obstacles.filter(
    (obstacle) => obstacle.x > -30 && !obstacle.hit
  );
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#dff5ff");
  gradient.addColorStop(1, "#ffffff");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Clouds
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";

  drawCloud(80, 75);
  drawCloud(300, 125);
  drawCloud(470, 55);

  // Ground
  ctx.fillStyle = "#f4c542";
  ctx.fillRect(0, canvas.height - 12, canvas.width, 12);
}

function drawCloud(x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.arc(x + 20, y - 8, 22, 0, Math.PI * 2);
  ctx.arc(x + 43, y, 17, 0, Math.PI * 2);
  ctx.fill();
}

function drawBird() {
  ctx.save();

  ctx.translate(
    bird.x + bird.width / 2,
    bird.y + bird.height / 2
  );

  ctx.rotate(bird.rotation);

  // Bird body
  ctx.fillStyle = "#f4c542";
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wing
  ctx.fillStyle = "#e4a900";
  ctx.beginPath();
  ctx.ellipse(-4, 3, 8, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = "#172b4d";
  ctx.beginPath();
  ctx.arc(7, -4, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = "#f07835";
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(23, 3);
  ctx.lineTo(14, 6);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawPipes() {
  pipes.forEach((pipe) => {
    ctx.fillStyle = "#178b68";

    // Top pipe
    ctx.fillRect(pipe.x, 0, pipe.width, pipe.gapY);

    // Bottom pipe
    ctx.fillRect(
      pipe.x,
      pipe.gapY + pipe.gap,
      pipe.width,
      canvas.height - pipe.gapY - pipe.gap
    );

    // Pipe edges
    ctx.fillStyle = "#106b50";
    ctx.fillRect(pipe.x - 4, pipe.gapY - 12, pipe.width + 8, 12);
    ctx.fillRect(
      pipe.x - 4,
      pipe.gapY + pipe.gap,
      pipe.width + 8,
      12
    );
  });
}

function drawWaterDrops() {
  waterDrops.forEach((drop) => {
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

function drawObstacles() {
  obstacles.forEach((obstacle) => {
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

function drawConfetti() {
  particles.forEach((particle) => {
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
    ctx.fillText("YOU DID IT!", canvas.width / 2, canvas.height / 2);
  }

  if (gameOver) {
    ctx.fillStyle = "rgba(23, 43, 77, 0.75)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 25px Montserrat, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
    ctx.font = "16px Montserrat, sans-serif";
    ctx.fillText(
      "Press Start to try again",
      canvas.width / 2,
      canvas.height / 2 + 30
    );
  }
}

function gameLoop() {
  if (!gameRunning) return;

  frame++;

  updateBird();

  if (!gameRunning) {
    draw();
    return;
  }

  updatePipes();
  updateWaterDrops();
  updateObstacles();

  if (frame % settings.pipeSpawnRate === 0) {
    addPipe();
  }

  draw();

  if (gameRunning) {
    animationId = requestAnimationFrame(gameLoop);
  }
}

startButton.addEventListener("click", startGame);

pauseButton.addEventListener("click", pauseGame);

resetButton.addEventListener("click", () => {
  cancelAnimationFrame(animationId);
  applyDifficulty();
  resetGame();
});

difficultySelect.addEventListener("change", () => {
  cancelAnimationFrame(animationId);
  applyDifficulty();
  resetGame();
  statusDisplay.textContent =
    "Difficulty changed! Press Start when you're ready.";
});

canvas.addEventListener("pointerdown", () => {
  flap();
});

document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    flap();
  }

  if (event.code === "KeyP" || event.code === "Escape") {
    pauseGame();
  }
});

// Initial setup
applyDifficulty();
resetGame();