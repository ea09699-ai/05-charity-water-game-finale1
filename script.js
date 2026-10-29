
/* =========================================
   WINGS FOR WATER
   charity: water brand colors + game logic
   ========================================= */

// Get the game canvas and drawing tools.
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Get the HTML elements.
const scoreElement = document.getElementById("score");
const bestElement = document.getElementById("best");
const startButton = document.getElementById("startBtn");
const pauseButton = document.getElementById("pauseBtn");
const resetButton = document.getElementById("resetBtn");

const statusText = document.getElementById("statusText");
const progressFill = document.getElementById("progressFill");
const progressLabel = document.getElementById("progressLabel");
const progressTrack = document.getElementById("progressTrack");

const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

// Charity: water brand colors.
const colors = {
  yellow: "#FFC907",
  blue: "#2E9DF7",
  lightBlue: "#8BD1CB",
  green: "#4FCB53",
  orange: "#FF902A",
  red: "#F5402C",
  darkGreen: "#159A48",
  pink: "#F16061",
  navy: "#07131E",
  white: "#FFFFFF"
};

// Game settings.
const gravity = 0.30;
const flapStrength = -6.5;
const pipeWidth = 65;
const pipeGap = 165;
const pipeSpeed = 2.7;
const winScore = 10;

// Game variables.
let bird;
let pipes = [];
let waterDrops = [];
let penaltyObstacles = [];
let confetti = [];

let score = 0;
let best = loadBestScore();
let frame = 0;

let gameRunning = false;
let gameOver = false;
let gameWon = false;
let paused = false;

// Load the best score saved in this browser.
function loadBestScore() {
  try {
    return Number(
      localStorage.getItem("wingsForWaterBest")
    ) || 0;
  } catch (error) {
    return 0;
  }
}

// Save the best score.
function saveBestScore() {
  try {
    localStorage.setItem(
      "wingsForWaterBest",
      String(best)
    );
  } catch (error) {
    // The game can still run if storage is unavailable.
  }
}

// Set up the bird and clear the previous round.
function resetGame() {
  bird = {
    x: 145,
    y: canvas.height / 2,
    radius: 16,
    velocity: 0
  };

  pipes = [];
  waterDrops = [];
  penaltyObstacles = [];
  confetti = [];

  score = 0;
  frame = 0;

  gameRunning = false;
  gameOver = false;
  gameWon = false;
  paused = false;

  updateScoreDisplay();

  startButton.textContent = "START GAME";
  pauseButton.textContent = "PAUSE";
  pauseButton.disabled = true;

  if (statusText) {
    statusText.textContent =
      "Ready for takeoff? Start your game!";
  }
}

// Start or restart the game.
function startGame() {
  resetGame();

  gameRunning = true;
  pauseButton.disabled = false;
  startButton.textContent = "RESTART GAME";

  if (statusText) {
    statusText.textContent =
      "Collect yellow water drops and avoid red obstacles!";
  }

  addPipe();
}

// Make the bird flap upward.
function flap() {
  if (gameOver || gameWon || paused) {
    return;
  }

  if (!gameRunning) {
    startGame();
  }

  bird.velocity = flapStrength;
}

// Pause or resume gameplay.
function togglePause() {
  if (!gameRunning || gameOver || gameWon) {
    return;
  }

  paused = !paused;

  if (paused) {
    pauseButton.textContent = "RESUME";

    if (statusText) {
      statusText.textContent =
        "Game paused. Resume when you're ready.";
    }
  } else {
    pauseButton.textContent = "PAUSE";

    if (statusText) {
      statusText.textContent =
        "Back in action! Collect drops and avoid obstacles.";
    }
  }
}

// Create a pair of pipes with a gap between them.
function addPipe() {
  const minimumTop = 45;
  const maximumTop =
    canvas.height - pipeGap - 75;

  const topHeight =
    minimumTop +
    Math.random() * (maximumTop - minimumTop);

  pipes.push({
    x: canvas.width + 10,
    topHeight: topHeight,
    passed: false
  });
}

// Create a collectible yellow water drop.
function addWaterDrop() {
  waterDrops.push({
    x: canvas.width + 20,
    y: 60 + Math.random() * (canvas.height - 120),
    radius: 12
  });
}

// Create a red obstacle that costs points.
function addPenaltyObstacle() {
  penaltyObstacles.push({
    x: canvas.width + 20,
    y: 60 + Math.random() * (canvas.height - 120),
    radius: 15
  });
}

// Update the score, best score, and progress bar.
function updateScoreDisplay() {
  scoreElement.textContent = score;
  bestElement.textContent = best;

  const progress = Math.min(
    (score / winScore) * 100,
    100
  );

  if (progressLabel) {
    progressLabel.textContent =
      `${score} / ${winScore} points`;
  }

  if (progressFill) {
    progressFill.style.width = `${progress}%`;
  }

  if (progressTrack) {
    progressTrack.setAttribute(
      "aria-valuenow",
      score
    );
  }
}

// Add or subtract points.
function changeScore(amount) {
  score = Math.max(0, score + amount);

  if (score > best) {
    best = score;
    saveBestScore();
  }

  updateScoreDisplay();

  if (statusText) {
    if (amount > 0) {
      statusText.textContent =
        `+${amount} point${amount === 1 ? "" : "s"}!`;
    } else if (amount < 0) {
      statusText.textContent =
        `${amount} points! Avoid the red obstacles.`;
    }
  }

  // Win when the player reaches the target score.
  if (score >= winScore) {
    winGame();
  }
}

// Update the game while it is active.
function update() {
  if (
    !gameRunning ||
    paused ||
    gameOver ||
    gameWon
  ) {
    return;
  }

  frame++;

  // Gravity pulls the bird downward.
  bird.velocity += gravity;
  bird.y += bird.velocity;

  // Generate new objects over time.
  if (frame % 100 === 0) {
    addPipe();
  }

  if (frame % 90 === 0) {
    addWaterDrop();
  }

  if (frame % 145 === 0) {
    addPenaltyObstacle();
  }

  // Move pipes and award points for passing them.
  for (let i = pipes.length - 1; i >= 0; i--) {
    const pipe = pipes[i];

    pipe.x -= pipeSpeed;

    if (
      !pipe.passed &&
      pipe.x + pipeWidth < bird.x
    ) {
      pipe.passed = true;
      changeScore(1);

      if (gameWon) {
        return;
      }
    }

    if (pipe.x + pipeWidth < 0) {
      pipes.splice(i, 1);
    }
  }

  // Move collectible drops and award points.
  for (
    let i = waterDrops.length - 1;
    i >= 0;
    i--
  ) {
    const drop = waterDrops[i];

    drop.x -= pipeSpeed;

    if (touchingCircle(bird, drop)) {
      waterDrops.splice(i, 1);
      changeScore(1);

      if (gameWon) {
        return;
      }
    } else if (drop.x + drop.radius < 0) {
      waterDrops.splice(i, 1);
    }
  }

  // Move penalty obstacles and deduct points.
  for (
    let i = penaltyObstacles.length - 1;
    i >= 0;
    i--
  ) {
    const obstacle = penaltyObstacles[i];

    obstacle.x -= pipeSpeed;

    if (touchingCircle(bird, obstacle)) {
      penaltyObstacles.splice(i, 1);
      changeScore(-2);
    } else if (obstacle.x + obstacle.radius < 0) {
      penaltyObstacles.splice(i, 1);
    }
  }

  // Check for collisions after moving everything.
  checkCollision();
}

// Check whether two circular objects touch.
function touchingCircle(first, second) {
  const distance = Math.hypot(
    first.x - second.x,
    first.y - second.y
  );

  return distance <
    first.radius + second.radius;
}

// Check whether the bird hits a pipe or boundary.
function checkCollision() {
  if (
    bird.y - bird.radius <= 0 ||
    bird.y + bird.radius >= canvas.height
  ) {
    endGame();
    return;
  }

  for (const pipe of pipes) {
    const overlapsHorizontally =
      bird.x + bird.radius > pipe.x &&
      bird.x - bird.radius < pipe.x + pipeWidth;

    if (!overlapsHorizontally) {
      continue;
    }

    const insideGap =
      bird.y - bird.radius > pipe.topHeight &&
      bird.y + bird.radius <
        pipe.topHeight + pipeGap;

    if (!insideGap) {
      endGame();
      return;
    }
  }
}

// End the round after a collision.
function endGame() {
  gameRunning = false;
  gameOver = true;
  paused = false;

  startButton.textContent = "PLAY AGAIN";
  pauseButton.textContent = "PAUSE";
  pauseButton.disabled = true;

  if (statusText) {
    statusText.textContent =
      `Game over! You scored ${score}. Try to beat your best!`;
  }
}

// Celebrate reaching the winning score.
function winGame() {
  gameRunning = false;
  gameWon = true;
  gameOver = false;
  paused = false;

  startButton.textContent = "PLAY AGAIN";
  pauseButton.textContent = "PAUSE";
  pauseButton.disabled = true;

  if (statusText) {
    statusText.textContent =
      "Congratulations! You reached 10 points! 🎉";
  }

  createConfetti();
}

// Create confetti using the charity: water palette.
function createConfetti() {
  confetti = [];

  const confettiColors = [
    colors.yellow,
    colors.blue,
    colors.lightBlue,
    colors.green,
    colors.orange,
    colors.red,
    colors.darkGreen,
    colors.pink
  ];

  for (let i = 0; i < 120; i++) {
    confetti.push({
      x: Math.random() * canvas.width,
      y: -Math.random() * canvas.height,
      size: 4 + Math.random() * 5,
      speed: 1.5 + Math.random() * 3.5,
      drift: (Math.random() - 0.5) * 2,
      color: confettiColors[
        Math.floor(Math.random() * confettiColors.length)
      ]
    });
  }
}

// Draw the game's background.
function drawBackground() {
  const gradient = ctx.createLinearGradient(
    0, 0, 0, canvas.height
  );

  gradient.addColorStop(0, "#071A32");
  gradient.addColorStop(0.6, "#145B82");
  gradient.addColorStop(1, colors.navy);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Stars.
  ctx.fillStyle = colors.lightBlue;

  for (let i = 0; i < 50; i++) {
    const x = (i * 173) % canvas.width;
    const y = (i * 83) % 210;

    ctx.globalAlpha = 0.45 + (i % 5) * 0.1;
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.globalAlpha = 1;

  // Futuristic city skyline.
  ctx.fillStyle = "#0A2838";

  for (let x = 0; x < canvas.width; x += 60) {
    const height = 35 + ((x * 17) % 90);

    ctx.fillRect(
      x,
      canvas.height - height,
      45,
      height
    );
  }

  // Blue building lights.
  ctx.fillStyle = colors.blue;

  for (let x = 10; x < canvas.width; x += 60) {
    for (
      let y = canvas.height - 60;
      y > canvas.height - 120;
      y -= 20
    ) {
      ctx.fillRect(x, y, 4, 6);
    }
  }

  // Occasional yellow building lights.
  ctx.fillStyle = colors.yellow;

  for (let x = 30; x < canvas.width; x += 120) {
    ctx.fillRect(x, canvas.height - 90, 4, 6);
  }
}

// Draw the futuristic bird.
function drawBird() {
  ctx.save();
  ctx.translate(bird.x, bird.y);

  const angle = Math.min(
    Math.max(bird.velocity * 0.05, -0.35),
    0.6
  );

  ctx.rotate(angle);

  // Blue glow.
  ctx.shadowBlur = 15;
  ctx.shadowColor = colors.blue;

  // Body.
  ctx.fillStyle = colors.white;

  ctx.beginPath();
  ctx.arc(
    0, 0,
    bird.radius,
    0, Math.PI * 2
  );
  ctx.fill();

  // Blue wing.
  ctx.fillStyle = colors.blue;

  ctx.beginPath();
  ctx.moveTo(-6, 3);
  ctx.lineTo(-24, 12);
  ctx.lineTo(-8, 16);
  ctx.closePath();
  ctx.fill();

  // Eye.
  ctx.shadowBlur = 0;
  ctx.fillStyle = colors.navy;

  ctx.beginPath();
  ctx.arc(7, -5, 4, 0, Math.PI * 2);
  ctx.fill();

  // Yellow beak.
  ctx.fillStyle = colors.yellow;

  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(26, 5);
  ctx.lineTo(14, 9);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// Draw a pair of pipes.
function drawPipe(pipe) {
  const bottomY = pipe.topHeight + pipeGap;

  drawPipeBody(
    pipe.x,
    0,
    pipeWidth,
    pipe.topHeight,
    true
  );

  drawPipeBody(
    pipe.x,
    bottomY,
    pipeWidth,
    canvas.height - bottomY,
    false
  );
}

// Draw a single pipe using blue and light blue.
function drawPipeBody(x, y, width, height, topPipe) {
  const gradient = ctx.createLinearGradient(
    x, 0, x + width, 0
  );

  gradient.addColorStop(0, colors.blue);
  gradient.addColorStop(0.5, colors.lightBlue);
  gradient.addColorStop(1, "#1765A8");

  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);

  // Blue accent stripe.
  ctx.fillStyle = colors.blue;
  ctx.fillRect(x + 7, y, 5, height);

  // Light blue pipe cap.
  ctx.fillStyle = colors.lightBlue;

  const capHeight = 15;
  const capY = topPipe ? height - capHeight : y;

  ctx.fillRect(
    x - 5,
    capY,
    width + 10,
    capHeight
  );

  // Yellow edge highlight.
  ctx.fillStyle = colors.yellow;

  if (topPipe) {
    ctx.fillRect(
      x - 5,
      capY,
      width + 10,
      3
    );
  } else {
    ctx.fillRect(
      x - 5,
      capY + capHeight - 3,
      width + 10,
      3
    );
  }
}

// Draw a yellow water drop collectible.
function drawWaterDrop(drop) {
  ctx.save();
  ctx.translate(drop.x, drop.y);

  ctx.shadowBlur = 14;
  ctx.shadowColor = colors.yellow;
  ctx.fillStyle = colors.yellow;

  ctx.beginPath();
  ctx.moveTo(0, -drop.radius);

  ctx.bezierCurveTo(
    drop.radius * 0.55,
    -drop.radius * 0.2,
    drop.radius,
    drop.radius * 0.35,
    drop.radius,
    drop.radius * 0.6
  );

  ctx.arc(
    0,
    drop.radius * 0.35,
    drop.radius * 0.8,
    0,
    Math.PI,
    false
  );

  ctx.bezierCurveTo(
    -drop.radius,
    drop.radius * 0.35,
    -drop.radius * 0.55,
    -drop.radius * 0.2,
    0,
    -drop.radius
  );

  ctx.fill();

  // Small highlight inside the drop.
  ctx.shadowBlur = 0;
  ctx.fillStyle = colors.white;
  ctx.globalAlpha = 0.7;

  ctx.beginPath();
  ctx.arc(-3, 3, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.restore();
}

// Draw a red penalty obstacle.
function drawPenaltyObstacle(obstacle) {
  ctx.save();

  ctx.shadowBlur = 12;
  ctx.shadowColor = colors.red;
  ctx.fillStyle = colors.red;

  ctx.beginPath();
  ctx.arc(
    obstacle.x,
    obstacle.y,
    obstacle.radius,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // White minus sign shows the score penalty.
  ctx.shadowBlur = 0;
  ctx.fillStyle = colors.white;
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    "−",
    obstacle.x,
    obstacle.y
  );

  ctx.restore();
}

// Draw start, pause, game-over, and win messages.
function drawMessage() {
  if (gameRunning && !paused) {
    return;
  }

  ctx.fillStyle = "rgba(7, 19, 30, 0.78)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let title = "READY TO FLY?";
  let subtitle = "Press SPACE, click, or tap to start";
  let titleColor = colors.yellow;

  if (paused) {
    title = "PAUSED";
    subtitle = "Press P or select Resume to continue";
    titleColor = colors.lightBlue;
  } else if (gameOver) {
    title = "GAME OVER";
    subtitle = `Final score: ${score} — Try again!`;
    titleColor = colors.red;
  } else if (gameWon) {
    title = "YOU DID IT!";
    subtitle = "10 points! Keep learning about clean water.";
    titleColor = colors.yellow;
  }

  ctx.fillStyle = titleColor;
  ctx.font = "bold 36px Arial";

  ctx.fillText(
    title,
    canvas.width / 2,
    canvas.height / 2 - 20
  );

  ctx.fillStyle = colors.white;
  ctx.font = "16px Arial";

  ctx.fillText(
    subtitle,
    canvas.width / 2,
    canvas.height / 2 + 22
  );
}

// Draw and animate the confetti celebration.
function drawConfetti() {
  for (const piece of confetti) {
    ctx.fillStyle = piece.color;

    ctx.fillRect(
      piece.x,
      piece.y,
      piece.size,
      piece.size * 1.5
    );

    piece.x += piece.drift;
    piece.y += piece.speed;

    if (piece.y > canvas.height) {
      piece.y = -piece.size;
      piece.x = Math.random() * canvas.width;
    }

    if (piece.x < 0) {
      piece.x = canvas.width;
    } else if (piece.x > canvas.width) {
      piece.x = 0;
    }
  }
}

// Draw the complete game scene.
function draw() {
  drawBackground();

  for (const pipe of pipes) {
    drawPipe(pipe);
  }

  for (const drop of waterDrops) {
    drawWaterDrop(drop);
  }

  for (const obstacle of penaltyObstacles) {
    drawPenaltyObstacle(obstacle);
  }

  if (bird) {
    drawBird();
  }

  drawMessage();

  if (gameWon) {
    drawConfetti();
  }
}

// Keep one animation loop running.
function gameLoop() {
  update();
  draw();

  requestAnimationFrame(gameLoop);
}

// Start and restart button.
startButton.addEventListener("click", startGame);

// Pause and resume button.
pauseButton.addEventListener("click", togglePause);

// Reset button clears the current round.
resetButton.addEventListener("click", function () {
  resetGame();

  if (statusText) {
    statusText.textContent =
      "Game reset! Start a new round whenever you're ready.";
  }
});

// Mouse and touchscreen controls.
canvas.addEventListener("pointerdown", function (event) {
  event.preventDefault();

  // Allow a tap to restart after a round ends.
  if (gameOver || gameWon) {
    startGame();
    flap();
    return;
  }

  flap();
});

// Keyboard controls.
document.addEventListener("keydown", function (event) {
  // Ignore game shortcuts while typing.
  if (
    event.target instanceof HTMLElement &&
    (
      event.target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(
        event.target.tagName
      )
    )
  ) {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();

    if (gameOver || gameWon) {
      startGame();
    }

    flap();
  }

  if (
    event.key.toLowerCase() === "p" ||
    event.key === "Escape"
  ) {
    togglePause();
  }
});

// Mobile navigation menu.
if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", function () {
    const isOpen = mainNav.classList.toggle("open");

    menuToggle.setAttribute(
      "aria-expanded",
      String(isOpen)
    );

    menuToggle.setAttribute(
      "aria-label",
      isOpen
        ? "Close navigation menu"
        : "Open navigation menu"
    );

    menuToggle.textContent = isOpen ? "✕" : "☰";
  });

  // Close the menu when a link is selected.
  mainNav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      mainNav.classList.remove("open");

      menuToggle.setAttribute(
        "aria-expanded",
        "false"
      );

      menuToggle.setAttribute(
        "aria-label",
        "Open navigation menu"
      );

      menuToggle.textContent = "☰";
    });
  });
}

// Initialize the game.
bestElement.textContent = best;

resetGame();
requestAnimationFrame(gameLoop);
