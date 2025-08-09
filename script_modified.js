(() => {
  "use strict";

  // Canvas setup
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  // DOM elements
  const scoreEl = document.getElementById("score");
  const progressFillEl = document.getElementById("progressFill");
  const overlayEl = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");

  // Responsive canvas scaling helper
  function getScale() {
    // Base design size 800x400; scale drawing for crispness
    const scaleX = canvas.clientWidth / canvas.width;
    const scaleY = canvas.clientHeight / canvas.height;
    return { scaleX, scaleY };
  }

  // Game constants
  const GRAVITY = 0.7;
  const JUMP_VELOCITY = -12.5;
  const GROUND_Y = 340; // ground baseline in canvas coords
  const GROUND_HEIGHT = 4;
  const PLAYER_WIDTH = 36;
  const PLAYER_HEIGHT = 48;
  const PLAYER_X = 120; // fixed x position
  const OBSTACLE_MIN_GAP = 450; // min distance between spawns
  const OBSTACLE_MAX_GAP = 900; // max distance
  const BASE_SPEED = 6; // world speed in px/frame
  const GOAL_SCORE = 500; // finish line
  const GOAL_PREVIEW_SCORE = 400;
if (GOAL_PREVIEW_SCORE >= GOAL_SCORE) {
    GOAL_PREVIEW_SCORE = Math.max(0, GOAL_SCORE - 100);
} // start showing bank building earlier

  // Audio removed

  // Game state
  let isRunning = false;
  let isGameOver = false;
  let speedMultiplier = 1;
  let animTime = 0; // retained but not used in simple sprite
  // Confetti celebration state
  let confettiParticles = [];
  let confettiEndAt = 0;

  const player = {
    x: PLAYER_X,
    y: GROUND_Y - PLAYER_HEIGHT,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    vy: 0,
    isOnGround: true,
  };

  const obstacles = [];

  let score = 0;
let scoreFloat = 0; // float accumulator for smooth scoring
  // No high score in finite-run mode

  let lastSpawnX = 0;
  let worldX = 0; // accumulates speed to decide spawns by distance

  // Utility: random integer inclusive
  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function resetGame() {
    isRunning = true;
    isGameOver = false;
    player.x = PLAYER_X;
    player.y = GROUND_Y - PLAYER_HEIGHT;
    player.vy = 0;
    player.isOnGround = true;
    obstacles.length = 0;
    score = 0;
    speedMultiplier = 1;
    worldX = 0;
    lastSpawnX = 0;
    overlayEl.style.display = "none";
  }

  function gameOver() {
    isGameOver = true;
    isRunning = false;
    overlayEl.querySelector(".title").textContent = "Tanuja missed Bangladesh Bank today 😭";
    overlayEl.querySelector(".subtitle").textContent = "Tap Play again to help her tomorrow";
    const btn = overlayEl.querySelector("#startBtn");
    if (btn) btn.textContent = "Play again";
    overlayEl.style.display = "flex";
    // no sound
  }

  function winGame() {
    isGameOver = true;
    isRunning = false;
    // celebratory effect, then show overlay with message and Play again button
    triggerConfetti(1500);
    setTimeout(() => {
      overlayEl.querySelector(".title").textContent = "Congratulations! 🎉🥳";
      overlayEl.querySelector(".subtitle").textContent = "Tanuja successfully reached Bangladesh Bank 🤩";
      const btn = overlayEl.querySelector("#startBtn");
      if (btn) btn.textContent = "Play again";
      overlayEl.style.display = "flex";
    }, 1200);
  }

  // Input handling
  function tryJump() {
    if (!isRunning) return;
    if (player.isOnGround) {
      player.vy = JUMP_VELOCITY;
      player.isOnGround = false;
      // no sound
    }
  }

  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (key === " " || key === "arrowup") {
      e.preventDefault();
      tryJump();
    }
  }, { passive: false });

  // Mobile/touch
  ["pointerdown", "touchstart"].forEach((evt) => {
    canvas.addEventListener(evt, () => tryJump(), { passive: true });
  });

  // Start button
  startBtn.addEventListener("click", () => {
    resetGame();
  });

  // Sound controls removed

  // Obstacle spawning
  const ObstacleKind = {
    Rickshaw: "rickshaw",
    Barrier: "barrier",
    Dog: "dog",
  };

  function spawnObstacle() {
    const kinds = [ObstacleKind.Rickshaw, ObstacleKind.Barrier, ObstacleKind.Dog];
    const kind = kinds[randomInt(0, kinds.length - 1)];

    // set size per kind
    let width = 36, height = 30, y = GROUND_Y - height;
    if (kind === ObstacleKind.Rickshaw) { width = 52; height = 32; }
    if (kind === ObstacleKind.Barrier) { width = 28; height = 28; }
    if (kind === ObstacleKind.Dog) { width = 40; height = 26; }
    y = GROUND_Y - height;

    const obstacle = {
      kind,
      x: canvas.width + 20,
      y,
      width,
      height,
      passed: false,
    };
    obstacles.push(obstacle);
  }

  function maybeSpawnObstacles(distanceAdvanced) {
    worldX += distanceAdvanced;
    // reduce/stop spawns as we near goal
    const STOP_SPAWN_BUFFER = Math.max(120, Math.floor(GOAL_SCORE * 0.15));
    if (score >= GOAL_SCORE - STOP_SPAWN_BUFFER) {
        return;
    }
    const minGap = score > GOAL_PREVIEW_SCORE ? OBSTACLE_MIN_GAP * 0.9 : OBSTACLE_MIN_GAP;
    const maxGap = score > GOAL_PREVIEW_SCORE ? OBSTACLE_MAX_GAP * 0.9 : OBSTACLE_MAX_GAP;
    if (worldX - lastSpawnX >= randomInt(minGap, maxGap)) {
      spawnObstacle();
      lastSpawnX = worldX;
    }
  }

  function rectsOverlap(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  function update(deltaMs) {
    if (!isRunning) return;

    // increase difficulty over time
    speedMultiplier += 0.0005 * (deltaMs / 16.67);
    speedMultiplier = Math.min(speedMultiplier, 3.0); // cap speed
    const worldSpeed = BASE_SPEED * speedMultiplier;
    animTime += deltaMs;

    // Player physics
    player.vy += GRAVITY;
    player.y += player.vy;
    if (player.y + player.height >= GROUND_Y) {
      player.y = GROUND_Y - player.height;
      player.vy = 0;
      player.isOnGround = true;
    }

    // Obstacles move left
    for (let i = obstacles.length - 1; i >= 0; i -= 1) {
      const ob = obstacles[i];
      ob.x -= worldSpeed;
      if (ob.x + ob.width < 0) {
        obstacles.splice(i, 1);
        continue;
      }
      // Collision
      if (rectsOverlap(player, ob)) {
        gameOver();
        return;
      }
      // Score for passing
      if (!ob.passed && ob.x + ob.width < player.x) {
        ob.passed = true;
            scoreFloat += 10;
            score = Math.floor(scoreFloat);
      }
    }

    // Spawn logic based on distance moved this frame
    maybeSpawnObstacles(worldSpeed);

    // Time-based score
    scoreFloat += (deltaMs / 16.67);
    score = Math.floor(scoreFloat);
    scoreEl.textContent = String(score);

    // Progress bar update
    const progress = Math.max(0, Math.min(1, score / GOAL_SCORE));
    if (progressFillEl) {
      progressFillEl.style.width = `${(progress * 100).toFixed(1)}%`;
    }

    // Win condition
    if (score >= GOAL_SCORE) {
      winGame();
      return;
    }
  }

  function drawBackground() {
    // Sky already via canvas background in CSS; draw ground line
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--ground") || "#94a3b8";
    ctx.lineWidth = GROUND_HEIGHT;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + GROUND_HEIGHT / 2);
    ctx.lineTo(canvas.width, GROUND_Y + GROUND_HEIGHT / 2);
    ctx.stroke();

    // Draw Bangladesh Bank building as goal preview
    drawBangladeshBank();
  }

  function drawPlayer() {
    // Revert to the earlier simple placeholder sprite with clear girly cues
    const radius = 8;
    const px = player.x, py = player.y, pw = player.width, ph = player.height;
    // body
    ctx.fillStyle = getCssVar("--tanuja", "#ec4899");
    roundRect(ctx, px, py, pw, ph, radius, true, false);
    // hair/ponytail
    ctx.beginPath();
    ctx.fillStyle = "#2e2a2a";
    ctx.arc(px + pw - 6, py + 10, 6, 0, Math.PI * 2);
    ctx.fill();
    // head/face
    ctx.fillStyle = "#fde68a";
    ctx.fillRect(px + 8, py + 8, 12, 12);
    // simple dress hint line
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillRect(px + 6, py + ph - 14, pw - 12, 2);
  }

  function drawObstacles() {
    for (const ob of obstacles) {
      if (ob.kind === ObstacleKind.Rickshaw) {
        ctx.fillStyle = getCssVar("--rickshaw", "#22c55e");
        ctx.fillRect(ob.x, ob.y, ob.width, ob.height);
        // wheels
        ctx.fillStyle = "#111827";
        ctx.beginPath();
        ctx.arc(ob.x + 8, ob.y + ob.height, 6, 0, Math.PI * 2);
        ctx.arc(ob.x + ob.width - 8, ob.y + ob.height, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (ob.kind === ObstacleKind.Barrier) {
        ctx.fillStyle = getCssVar("--barrier", "#f97316");
        ctx.fillRect(ob.x, ob.y, ob.width, ob.height);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(ob.x + 4, ob.y + 8, ob.width - 8, 6);
      } else {
        // dog
        ctx.fillStyle = getCssVar("--dog", "#8b5cf6");
        ctx.fillRect(ob.x, ob.y + 8, ob.width, ob.height - 8);
        // head
        ctx.fillRect(ob.x + ob.width - 12, ob.y, 12, 12);
      }
    }
  }

  function triggerConfetti(durationMs) {
    confettiParticles = [];
    const duration = durationMs || 1200;
    confettiEndAt = performance.now() + duration;
    const colors = ["#f97316", "#22c55e", "#0ea5e9", "#a855f7", "#eab308", "#ef4444"];
    for (let i = 0; i < 140; i += 1) {
      confettiParticles.push({
        x: canvas.width * 0.6 + (Math.random() - 0.5) * 100,
        y: 60 + Math.random() * 60,
        vx: (Math.random() - 0.5) * 5,
        vy: Math.random() * -4 - 2,
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.25,
      });
    }
  }

  function drawConfetti() {
    if (!confettiParticles.length) return;
    const now = performance.now();
    // update and draw on top of scene
    for (const p of confettiParticles) {
      p.vy += 0.15; // gravity
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
    // cull when time ends or offscreen
    if (now > confettiEndAt) {
      confettiParticles = [];
    }
  }

  function drawBangladeshBank() {
    // Reveal and approach as score nears goal
    const t = Math.max(0, Math.min(1, (score - GOAL_PREVIEW_SCORE) / (GOAL_SCORE - GOAL_PREVIEW_SCORE)));
    if (t <= 0) return;

    const buildingW = 180;
    const buildingH = 140;
    // interpolate x from offscreen right to a fixed near-right position
    const startX = canvas.width + 220;
    const endX = Math.min(canvas.width - buildingW - 40, 520);
    const x = startX + (endX - startX) * t;
    const y = GROUND_Y - buildingH - 2;

    // base building
    ctx.fillStyle = getCssVar("--bank-building", "#94a3b8");
    roundRect(ctx, x, y, buildingW, buildingH, 10, true, false);

    // windows grid
    ctx.fillStyle = "#e2e8f0";
    const cols = 4, rows = 3;
    const pad = 16, gapX = 16, gapY = 16;
    const winW = (buildingW - pad * 2 - gapX * (cols - 1)) / cols;
    const winH = (buildingH - pad * 2 - gapY * (rows - 1)) / rows;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        ctx.fillRect(x + pad + c * (winW + gapX), y + pad + r * (winH + gapY), winW, winH);
      }
    }

    // sign
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 14px system-ui, -apple-system, Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText("Bangladesh Bank", x + buildingW / 2, y - 8);
  }

  function getCssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    let r = radius;
    if (typeof r === "number") {
      r = { tl: r, tr: r, br: r, bl: r };
    }
    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + width - r.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r.tr);
    ctx.lineTo(x + width, y + height - r.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
    ctx.lineTo(x + r.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r.bl);
    ctx.lineTo(x, y + r.tl);
    ctx.quadraticCurveTo(x, y, x + r.tl, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // Animation loop (delta-based)
  let lastTime = 0;
  function loop(ts) {
    const delta = lastTime ? ts - lastTime : 16.67;
    lastTime = ts;
    clear();
    drawBackground();
    update(delta);
    drawPlayer();
    drawObstacles();
    drawConfetti();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Keyboard: press Enter to restart after game over
  window.addEventListener("keydown", (e) => {
    if (isGameOver && (e.key === "Enter")) {
      resetGame();
    }
  });

  // Pause overlay initially visible; start on button
})();

// Simple confetti burst using canvas overlay
function startConfetti(durationMs) {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const particles = [];
  const colors = ["#f97316", "#22c55e", "#0ea5e9", "#a855f7", "#eab308", "#ef4444"]; 
  const now = performance.now();
  const endAt = now + (durationMs || 1200);

  for (let i = 0; i < 120; i += 1) {
    particles.push({
      x: canvas.width * 0.6 + (Math.random() - 0.5) * 60,
      y: 40 + Math.random() * 40,
      vx: (Math.random() - 0.5) * 5,
      vy: Math.random() * -4 - 2,
      size: 3 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
    });
  }

  function step() {
    const t = performance.now();
    // transparent overlay drawing
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    // draw on top without clearing game; just paint confetti
    for (const p of particles) {
      p.vy += 0.12; // gravity
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.restore();
    if (t < endAt) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}


