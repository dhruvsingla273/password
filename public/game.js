const socket = io();

// ── DOM References ──────────────────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);
const screens = {
  lobby: $("#screen-lobby"),
  waiting: $("#screen-waiting"),
  secret: $("#screen-secret"),
  game: $("#screen-game"),
  gameover: $("#screen-gameover"),
};

let currentDigitLength = 4;

// ══════════════════════════════════════════════════════════════════════════════
//  PARTICLE BACKGROUND
// ══════════════════════════════════════════════════════════════════════════════

const particleCanvas = $("#particle-canvas");
const pCtx = particleCanvas.getContext("2d");
let particles = [];
let particleAnimId = null;

function resizeParticleCanvas() {
  particleCanvas.width = window.innerWidth;
  particleCanvas.height = window.innerHeight;
}

function createParticle(x, y, color, velocity, life) {
  return {
    x: x ?? Math.random() * particleCanvas.width,
    y: y ?? Math.random() * particleCanvas.height,
    vx: velocity ? velocity.x : (Math.random() - 0.5) * 0.3,
    vy: velocity ? velocity.y : (Math.random() - 0.5) * 0.3,
    radius: Math.random() * 2 + 0.5,
    color: color || `hsla(${Math.random() * 60 + 240}, 70%, 70%, ${Math.random() * 0.4 + 0.1})`,
    life: life || Infinity,
    maxLife: life || Infinity,
  };
}

function initParticles() {
  resizeParticleCanvas();
  particles = [];
  const count = Math.min(80, Math.floor(window.innerWidth * window.innerHeight / 12000));
  for (let i = 0; i < count; i++) {
    particles.push(createParticle());
  }
}

function animateParticles() {
  pCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;

    if (p.life !== Infinity) {
      p.life--;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
    }

    if (p.x < 0) p.x = particleCanvas.width;
    if (p.x > particleCanvas.width) p.x = 0;
    if (p.y < 0) p.y = particleCanvas.height;
    if (p.y > particleCanvas.height) p.y = 0;

    const alpha = p.life !== Infinity ? p.life / p.maxLife : 1;
    pCtx.beginPath();
    pCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    pCtx.fillStyle = p.life !== Infinity
      ? p.color.replace(/[\d.]+\)$/, `${alpha})`)
      : p.color;
    pCtx.fill();
  }

  const ambientParticles = particles.filter(p => p.life === Infinity);
  for (let i = 0; i < ambientParticles.length; i++) {
    for (let j = i + 1; j < ambientParticles.length; j++) {
      const a = ambientParticles[i];
      const b = ambientParticles[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        pCtx.beginPath();
        pCtx.moveTo(a.x, a.y);
        pCtx.lineTo(b.x, b.y);
        pCtx.strokeStyle = `rgba(124, 92, 252, ${0.08 * (1 - dist / 120)})`;
        pCtx.lineWidth = 0.5;
        pCtx.stroke();
      }
    }
  }

  particleAnimId = requestAnimationFrame(animateParticles);
}

function burstParticles(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = Math.random() * 3 + 1;
    particles.push(createParticle(x, y, color, {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed,
    }, 60 + Math.random() * 40));
  }
}

window.addEventListener("resize", resizeParticleCanvas);
initParticles();
animateParticles();

// ══════════════════════════════════════════════════════════════════════════════
//  DIGIT RAIN (Matrix-style, lobby only)
// ══════════════════════════════════════════════════════════════════════════════

const drCanvas = $("#digit-rain-canvas");
const drCtx = drCanvas.getContext("2d");
let digitRainActive = false;
let drAnimId = null;
let columns = [];

function initDigitRain() {
  drCanvas.width = window.innerWidth;
  drCanvas.height = window.innerHeight;
  const fontSize = 14;
  const colCount = Math.floor(drCanvas.width / fontSize);
  columns = [];
  for (let i = 0; i < colCount; i++) {
    columns.push({
      x: i * fontSize,
      y: Math.random() * drCanvas.height,
      speed: Math.random() * 2 + 1,
      chars: [],
    });
  }
}

function animateDigitRain() {
  if (!digitRainActive) return;
  drCtx.fillStyle = "rgba(6, 6, 14, 0.15)";
  drCtx.fillRect(0, 0, drCanvas.width, drCanvas.height);
  drCtx.font = "14px 'Courier New', monospace";

  for (const col of columns) {
    const char = Math.floor(Math.random() * 10).toString();
    drCtx.fillStyle = `rgba(0, 212, 170, ${Math.random() * 0.5 + 0.2})`;
    drCtx.fillText(char, col.x, col.y);
    col.y += col.speed * 8;
    if (col.y > drCanvas.height) {
      col.y = -20;
      col.speed = Math.random() * 2 + 1;
    }
  }

  drAnimId = requestAnimationFrame(animateDigitRain);
}

function startDigitRain() {
  if (digitRainActive) return;
  digitRainActive = true;
  drCanvas.style.opacity = "0.18";
  initDigitRain();
  animateDigitRain();
}

function stopDigitRain() {
  digitRainActive = false;
  if (drAnimId) cancelAnimationFrame(drAnimId);
  drCtx.clearRect(0, 0, drCanvas.width, drCanvas.height);
}

window.addEventListener("resize", () => {
  if (digitRainActive) initDigitRain();
});

startDigitRain();

// ══════════════════════════════════════════════════════════════════════════════
//  CONFETTI ENGINE
// ══════════════════════════════════════════════════════════════════════════════

const confettiCanvas = $("#confetti-canvas");
const cCtx = confettiCanvas.getContext("2d");
let confettiPieces = [];
let confettiAnimId = null;

function resizeConfettiCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

function launchConfetti() {
  resizeConfettiCanvas();
  confettiPieces = [];
  const colors = ["#7c5cfc", "#00d4aa", "#ffc44d", "#ff4d6a", "#9b7dff", "#00ffcc"];

  for (let i = 0; i < 150; i++) {
    confettiPieces.push({
      x: Math.random() * confettiCanvas.width,
      y: -20 - Math.random() * 200,
      w: Math.random() * 10 + 5,
      h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      life: 200 + Math.random() * 100,
    });
  }

  if (!confettiAnimId) animateConfetti();
}

function animateConfetti() {
  cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  for (let i = confettiPieces.length - 1; i >= 0; i--) {
    const c = confettiPieces[i];
    c.x += c.vx;
    c.y += c.vy;
    c.vy += 0.03;
    c.vx *= 0.99;
    c.rotation += c.rotSpeed;
    c.life--;

    if (c.life <= 0 || c.y > confettiCanvas.height + 20) {
      confettiPieces.splice(i, 1);
      continue;
    }

    cCtx.save();
    cCtx.translate(c.x, c.y);
    cCtx.rotate((c.rotation * Math.PI) / 180);
    cCtx.fillStyle = c.color;
    cCtx.globalAlpha = Math.min(1, c.life / 30);
    cCtx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
    cCtx.restore();
  }

  if (confettiPieces.length > 0) {
    confettiAnimId = requestAnimationFrame(animateConfetti);
  } else {
    confettiAnimId = null;
  }
}

window.addEventListener("resize", resizeConfettiCanvas);

// ══════════════════════════════════════════════════════════════════════════════
//  SOUND SYSTEM (Web Audio API)
// ══════════════════════════════════════════════════════════════════════════════

let soundEnabled = false;
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq, duration, type, volume) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume || 0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (duration || 0.2));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (duration || 0.2));
  } catch (_) { /* audio not available */ }
}

function playClick() { playTone(800, 0.06, "square", 0.04); }
function playSuccess() {
  playTone(523, 0.15, "sine", 0.08);
  setTimeout(() => playTone(659, 0.15, "sine", 0.08), 100);
  setTimeout(() => playTone(784, 0.2, "sine", 0.08), 200);
}
function playError() {
  playTone(200, 0.15, "square", 0.06);
  setTimeout(() => playTone(160, 0.2, "square", 0.06), 120);
}
function playWin() {
  [523, 659, 784, 1047].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.25, "sine", 0.1), i * 120);
  });
}
function playLose() {
  [400, 350, 300, 250].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.2, "triangle", 0.07), i * 150);
  });
}
function playGuess() { playTone(440, 0.08, "sine", 0.05); }
function playTurn() {
  playTone(660, 0.1, "sine", 0.06);
  setTimeout(() => playTone(880, 0.12, "sine", 0.06), 80);
}

$("#sound-toggle").addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  const btn = $("#sound-toggle");
  btn.textContent = soundEnabled ? "🔊" : "🔇";
  btn.classList.toggle("active", soundEnabled);
  if (soundEnabled) {
    getAudioCtx();
    playClick();
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  BUTTON RIPPLE EFFECT
// ══════════════════════════════════════════════════════════════════════════════

document.querySelectorAll(".btn").forEach((btn) => {
  btn.addEventListener("click", function (e) {
    const ripple = document.createElement("span");
    ripple.className = "btn-ripple";
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    ripple.style.width = ripple.style.height = size + "px";
    ripple.style.left = e.clientX - rect.left - size / 2 + "px";
    ripple.style.top = e.clientY - rect.top - size / 2 + "px";
    this.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  DIGIT INPUT BOXES
// ══════════════════════════════════════════════════════════════════════════════

let secretDigitValues = [];

function createDigitBoxes(container, count) {
  container.innerHTML = "";
  secretDigitValues = new Array(count).fill("");
  for (let i = 0; i < count; i++) {
    const box = document.createElement("div");
    box.className = "digit-box";
    box.dataset.index = i;
    box.addEventListener("click", () => focusDigitBox(i));
    container.appendChild(box);
  }
}

function focusDigitBox(index) {
  const boxes = document.querySelectorAll("#secret-digit-boxes .digit-box");
  boxes.forEach((b) => b.classList.remove("active"));
  if (index < boxes.length) {
    boxes[index].classList.add("active");
  }
}

function updateDigitBoxes() {
  const boxes = document.querySelectorAll("#secret-digit-boxes .digit-box");
  boxes.forEach((box, i) => {
    const val = secretDigitValues[i] || "";
    box.textContent = val;
    box.classList.toggle("filled", val !== "");
    if (val !== "" && !box.dataset.animated) {
      box.dataset.animated = "1";
      box.style.animation = "none";
      box.offsetHeight;
      box.style.animation = "";
    }
  });
  $("#input-secret").value = secretDigitValues.join("");
}

function getActiveDigitIndex() {
  const firstEmpty = secretDigitValues.indexOf("");
  return firstEmpty === -1 ? secretDigitValues.length - 1 : firstEmpty;
}

document.addEventListener("keydown", (e) => {
  const secretScreen = screens.secret;
  if (!secretScreen.classList.contains("active")) return;
  if ($("#input-secret").disabled) return;

  if (/^\d$/.test(e.key)) {
    const idx = getActiveDigitIndex();
    if (idx < currentDigitLength) {
      secretDigitValues[idx] = e.key;
      updateDigitBoxes();
      playClick();
      focusDigitBox(Math.min(idx + 1, currentDigitLength - 1));
    }
    e.preventDefault();
  } else if (e.key === "Backspace") {
    let idx = getActiveDigitIndex();
    if (idx === currentDigitLength || (idx > 0 && secretDigitValues[idx] === "")) {
      idx = Math.max(0, idx - 1);
    }
    secretDigitValues[idx] = "";
    const boxes = document.querySelectorAll("#secret-digit-boxes .digit-box");
    if (boxes[idx]) delete boxes[idx].dataset.animated;
    updateDigitBoxes();
    focusDigitBox(idx);
    e.preventDefault();
  } else if (e.key === "Enter") {
    $("#btn-secret").click();
    e.preventDefault();
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");

  if (name === "lobby") {
    startDigitRain();
  } else {
    stopDigitRain();
  }
}

function showToast(msg) {
  const toast = $("#toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  toast.classList.add("visible");
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.classList.add("hidden"), 400);
  }, 3000);
}

function renderGuesses(container, guesses, animate) {
  const prevCount = container.children.length;
  container.innerHTML = "";
  guesses.forEach((g, i) => {
    const row = document.createElement("div");
    row.className = "guess-row";

    if (animate && i >= prevCount) {
      row.classList.add("new-guess");
      row.style.animationDelay = `${(i - prevCount) * 0.08}s`;
    }

    const allPositions = g.positionsCorrect === currentDigitLength;
    row.innerHTML = `
      <span style="color:var(--muted);font-size:0.75rem;min-width:1.2em;">${i + 1}</span>
      <span class="guess-number">${g.guess}</span>
      <span class="guess-result">
        <span class="result-badge numbers">${g.numbersCorrect}N</span>
        <span class="result-badge positions${allPositions ? " perfect" : ""}">${g.positionsCorrect}P</span>
      </span>
    `;
    container.appendChild(row);
  });
  container.scrollTop = container.scrollHeight;
}

function animateRoomCode(code) {
  const display = $("#display-code");
  display.innerHTML = "";
  code.split("").forEach((char, i) => {
    const span = document.createElement("span");
    span.className = "char";
    span.textContent = char;
    span.style.animationDelay = `${i * 0.08}s`;
    display.appendChild(span);
  });
}

// ── Lobby Tabs ──────────────────────────────────────────────────────────────

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    tab.classList.add("active");
    $(`#tab-${tab.dataset.tab}`).classList.add("active");
    playClick();
  });
});

// ── Create Room ─────────────────────────────────────────────────────────────

$("#btn-create").addEventListener("click", () => {
  const name = $("#input-name").value.trim();
  if (!name) {
    showToast("Please enter your name.");
    playError();
    return;
  }
  const digitLength = $("#input-digits").value;
  socket.emit("create-room", { name, digitLength });
  playClick();
});

// ── Join Room ───────────────────────────────────────────────────────────────

$("#btn-join").addEventListener("click", () => {
  const name = $("#input-name").value.trim();
  const code = $("#input-code").value.trim();
  if (!name) {
    showToast("Please enter your name.");
    playError();
    return;
  }
  if (!code) {
    showToast("Please enter a room code.");
    playError();
    return;
  }
  socket.emit("join-room", { code, name });
  playClick();
});

// ── Room Created -> Waiting ─────────────────────────────────────────────────

socket.on("room-created", ({ code, digitLength }) => {
  currentDigitLength = digitLength;
  animateRoomCode(code);
  showScreen("waiting");
  playSuccess();

  burstParticles(window.innerWidth / 2, window.innerHeight / 2, 30, "rgba(0, 212, 170, 0.6)");
});

$("#btn-copy").addEventListener("click", () => {
  const code = $("#display-code").textContent;
  navigator.clipboard.writeText(code).then(
    () => showToast("Code copied!"),
    () => showToast("Couldn't copy — select it manually.")
  );
  const toast = $("#toast");
  toast.style.background = "var(--accent)";
  setTimeout(() => (toast.style.background = ""), 3200);
  playClick();
});

// ── Both Joined -> Set Secret ───────────────────────────────────────────────

socket.on("game-start-set-secret", ({ digitLength }) => {
  currentDigitLength = digitLength;
  $("#digit-count-label").textContent = digitLength;
  $("#input-secret").maxLength = digitLength;
  $("#input-secret").value = "";
  $("#input-secret").disabled = false;
  $("#btn-secret").disabled = false;
  $("#btn-secret").classList.remove("hidden");
  $("#secret-waiting").classList.add("hidden");

  createDigitBoxes($("#secret-digit-boxes"), digitLength);
  focusDigitBox(0);

  showScreen("secret");
  playTurn();
});

// ── Set Secret ──────────────────────────────────────────────────────────────

$("#btn-secret").addEventListener("click", () => {
  const secret = $("#input-secret").value.trim();
  if (secret.length !== currentDigitLength || !/^\d+$/.test(secret)) {
    showToast(`Enter exactly ${currentDigitLength} digits.`);
    playError();
    const boxes = document.querySelectorAll("#secret-digit-boxes .digit-box");
    boxes.forEach((b) => {
      b.classList.add("error-shake");
      setTimeout(() => b.classList.remove("error-shake"), 500);
    });
    return;
  }
  socket.emit("set-secret", { secret });
  playSuccess();
});

socket.on("secret-accepted", () => {
  $("#btn-secret").disabled = true;
  $("#btn-secret").classList.add("hidden");
  $("#input-secret").disabled = true;
  $("#secret-waiting").classList.remove("hidden");

  const boxes = document.querySelectorAll("#secret-digit-boxes .digit-box");
  boxes.forEach((b) => {
    b.style.pointerEvents = "none";
    b.style.opacity = "0.6";
  });
});

socket.on("waiting-for-opponent-secret", () => {});

// ── Game Playing ────────────────────────────────────────────────────────────

socket.on("game-playing", ({ yourName, opponentName, digitLength, isYourTurn, yourSecret }) => {
  currentDigitLength = digitLength;
  $("#game-title").textContent = `${yourName} vs ${opponentName}`;
  $("#game-your-secret").textContent = yourSecret;
  $("#input-guess").maxLength = digitLength;
  $("#input-guess").placeholder = "0".repeat(digitLength);
  $("#input-guess").value = "";
  $("#your-guesses").innerHTML = "";
  $("#opponent-guesses").innerHTML = "";
  updateTurn(isYourTurn);
  showScreen("game");
  if (isYourTurn) $("#input-guess").focus();

  burstParticles(window.innerWidth / 2, window.innerHeight / 3, 25, "rgba(124, 92, 252, 0.5)");
  playTurn();
});

function updateTurn(isYourTurn) {
  const badge = $("#turn-indicator");
  const guessInput = $("#input-guess");
  const guessBtn = $("#btn-guess");

  if (isYourTurn) {
    badge.textContent = "Your Turn";
    badge.className = "turn-badge your-turn";
    guessInput.disabled = false;
    guessBtn.disabled = false;
    guessInput.focus();
  } else {
    badge.textContent = "Opponent's Turn";
    badge.className = "turn-badge their-turn";
    guessInput.disabled = true;
    guessBtn.disabled = true;
  }
}

// ── Make Guess ───────────────────────────────────────────────────────────────

function submitGuess() {
  const guess = $("#input-guess").value.trim();
  if (guess.length !== currentDigitLength || !/^\d+$/.test(guess)) {
    showToast(`Enter exactly ${currentDigitLength} digits.`);
    playError();
    $("#input-guess").parentElement.classList.add("shake");
    setTimeout(() => $("#input-guess").parentElement.classList.remove("shake"), 500);
    return;
  }
  socket.emit("make-guess", { guess });
  $("#input-guess").value = "";
  playGuess();
}

$("#btn-guess").addEventListener("click", submitGuess);
$("#input-guess").addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitGuess();
});

// ── Guess Result ────────────────────────────────────────────────────────────

socket.on("guess-result", ({ isYourTurn, yourGuesses, opponentGuesses }) => {
  renderGuesses($("#your-guesses"), yourGuesses, true);
  renderGuesses($("#opponent-guesses"), opponentGuesses, true);
  updateTurn(isYourTurn);

  if (isYourTurn) playTurn();

  const lastGuess = yourGuesses[yourGuesses.length - 1];
  if (lastGuess && lastGuess.positionsCorrect > 0) {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    burstParticles(centerX, centerY, lastGuess.positionsCorrect * 5, "rgba(0, 212, 170, 0.5)");
  }
});

// ── Game Over ───────────────────────────────────────────────────────────────

socket.on("game-over", ({ winnerName, youWon, yourSecret, opponentSecret, yourGuesses, opponentGuesses }) => {
  if (youWon) {
    $("#gameover-icon").textContent = "🏆";
    $("#gameover-title").textContent = "You Won!";
    $("#gameover-subtitle").textContent = `You cracked it in ${yourGuesses.length} guess${yourGuesses.length !== 1 ? "es" : ""}!`;

    launchConfetti();
    playWin();

    const card = $(".gameover-card");
    card.classList.add("win-glow");
    setTimeout(() => card.classList.remove("win-glow"), 8000);

    burstParticles(window.innerWidth / 2, window.innerHeight / 3, 60, "rgba(0, 212, 170, 0.6)");
    setTimeout(() => burstParticles(window.innerWidth / 3, window.innerHeight / 2, 40, "rgba(124, 92, 252, 0.5)"), 300);
    setTimeout(() => burstParticles(window.innerWidth * 0.7, window.innerHeight / 2, 40, "rgba(255, 196, 77, 0.5)"), 600);
  } else {
    $("#gameover-icon").textContent = "😔";
    $("#gameover-title").textContent = `${winnerName} Won!`;
    $("#gameover-subtitle").textContent = `They cracked your number in ${opponentGuesses.length} guess${opponentGuesses.length !== 1 ? "es" : ""}.`;
    playLose();

    const card = $(".gameover-card");
    card.classList.add("shake");
    setTimeout(() => card.classList.remove("shake"), 500);
  }

  $("#reveal-yours").textContent = yourSecret;
  $("#reveal-theirs").textContent = opponentSecret;

  renderGuesses($("#go-your-guesses"), yourGuesses, false);
  renderGuesses($("#go-opponent-guesses"), opponentGuesses, false);

  $("#btn-rematch").disabled = false;
  $("#btn-rematch").classList.remove("hidden");
  $("#rematch-waiting").classList.add("hidden");

  showScreen("gameover");
});

// ── Rematch ─────────────────────────────────────────────────────────────────

$("#btn-rematch").addEventListener("click", () => {
  socket.emit("play-again");
  playClick();
});

socket.on("waiting-for-rematch", () => {
  $("#btn-rematch").disabled = true;
  $("#btn-rematch").classList.add("hidden");
  $("#rematch-waiting").classList.remove("hidden");
});

// ── Opponent Left ───────────────────────────────────────────────────────────

socket.on("opponent-left", ({ name }) => {
  showToast(`${name} left the game.`);
  $("#input-secret").disabled = false;
  $("#input-guess").disabled = false;
  $("#btn-guess").disabled = false;
  showScreen("lobby");
  playError();
});

// ── Errors ──────────────────────────────────────────────────────────────────

socket.on("error-msg", (msg) => {
  showToast(msg);
  playError();
});

// ── Enter Key on Lobby Inputs ───────────────────────────────────────────────

$("#input-code").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("#btn-join").click();
});

$("#input-name").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const activeTab = document.querySelector(".tab.active");
    if (activeTab.dataset.tab === "create") $("#btn-create").click();
  }
});
