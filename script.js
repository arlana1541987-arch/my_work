(function () {
  'use strict';

  /* ── Constants ── */
  const COLS = 10;
  const ROWS = 20;
  const CELL = 30;
  const BORDER = 1;
  const CANVAS_W = (COLS + BORDER * 2) * CELL;
  const CANVAS_H = (ROWS + BORDER * 2) * CELL;

  const COLORS = {
    I: { main: '#e52521', light: '#ff6b6b', dark: '#a01010', inner: '#ff9999' },
    O: { main: '#fcba03', light: '#ffe066', dark: '#c89400', inner: '#fff3a0' },
    T: { main: '#00a800', light: '#44dd44', dark: '#006800', inner: '#88ff88' },
    S: { main: '#0066cc', light: '#4499ff', dark: '#004499', inner: '#88ccff' },
    Z: { main: '#fc9838', light: '#ffbb66', dark: '#c06000', inner: '#ffdd99' },
    J: { main: '#00cccc', light: '#66ffff', dark: '#008888', inner: '#aaFFFF' },
    L: { main: '#9933cc', light: '#cc66ff', dark: '#662299', inner: '#dd99ff' },
    brick: { main: '#8b4513', light: '#a0522d', dark: '#5c2e0a', inner: '#cd853f' },
  };

  const SHAPES = {
    I: [
      [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
      [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
    ],
    O: [
      [[1, 1], [1, 1]],
    ],
    T: [
      [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
      [[0, 1, 0], [0, 1, 1], [0, 1, 0]],
      [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
      [[0, 1, 0], [1, 1, 0], [0, 1, 0]],
    ],
    S: [
      [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
      [[0, 1, 0], [0, 1, 1], [0, 0, 1]],
    ],
    Z: [
      [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
      [[0, 0, 1], [0, 1, 1], [0, 1, 0]],
    ],
    J: [
      [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
      [[0, 1, 1], [0, 1, 0], [0, 1, 0]],
      [[0, 0, 0], [1, 1, 1], [0, 0, 1]],
      [[0, 1, 0], [0, 1, 0], [1, 1, 0]],
    ],
    L: [
      [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
      [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
      [[0, 0, 0], [1, 1, 1], [1, 0, 0]],
      [[1, 1, 0], [0, 1, 0], [0, 1, 0]],
    ],
  };

  const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  const LINE_SCORES = [0, 100, 300, 500, 800];
  const CLEAR_ANIM_MS = 400;

  /* ── DOM ── */
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const nextCanvas = document.getElementById('nextCanvas');
  const nextCtx = nextCanvas.getContext('2d');
  const scoreDisplay = document.getElementById('scoreDisplay');
  const levelDisplay = document.getElementById('levelDisplay');
  const linesDisplay = document.getElementById('linesDisplay');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayMessage = document.getElementById('overlayMessage');
  const pauseBanner = document.getElementById('pauseBanner');

  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  ctx.imageSmoothingEnabled = false;
  nextCtx.imageSmoothingEnabled = false;

  /* ── Audio (Web Audio API) ── */
  const Audio = (function () {
    let actx = null;
    let bgOsc = null;
    let bgGain = null;
    let bgPlaying = false;
    let melodyTimer = null;
    let melodyIndex = 0;

    const melody = [
      { f: 659, d: 0.12 }, { f: 659, d: 0.12 }, { f: 0, d: 0.12 },
      { f: 659, d: 0.12 }, { f: 0, d: 0.12 }, { f: 523, d: 0.12 },
      { f: 659, d: 0.12 }, { f: 0, d: 0.12 }, { f: 784, d: 0.24 },
      { f: 0, d: 0.36 }, { f: 392, d: 0.24 }, { f: 0, d: 0.36 },
      { f: 523, d: 0.24 }, { f: 0, d: 0.24 }, { f: 392, d: 0.24 },
      { f: 0, d: 0.24 }, { f: 330, d: 0.24 }, { f: 0, d: 0.12 },
      { f: 440, d: 0.12 }, { f: 0, d: 0.12 }, { f: 494, d: 0.12 },
      { f: 0, d: 0.12 }, { f: 466, d: 0.12 }, { f: 0, d: 0.06 },
      { f: 440, d: 0.18 }, { f: 0, d: 0.18 },
    ];

    function ensure() {
      if (!actx) {
        actx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (actx.state === 'suspended') actx.resume();
      return actx;
    }

    function tone(freq, duration, type, volume, slide) {
      const ac = ensure();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      if (slide) {
        osc.frequency.exponentialRampToValueAtTime(slide, ac.currentTime + duration);
      }
      gain.gain.setValueAtTime(volume || 0.08, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + duration);
    }

    function beep() {
      tone(880, 0.04, 'square', 0.06);
    }

    function boom() {
      const ac = ensure();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(120, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ac.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + 0.15);
    }

    function lineClear(count) {
      const freqs = [523, 659, 784, 988];
      for (let i = 0; i < count; i++) {
        setTimeout(function () {
          tone(freqs[Math.min(i, 3)], 0.12, 'square', 0.1);
        }, i * 80);
      }
      setTimeout(function () {
        tone(1047, 0.2, 'triangle', 0.08);
      }, count * 80);
    }

    function playMelodyStep() {
      if (!bgPlaying || !actx) return;
      const note = melody[melodyIndex % melody.length];
      melodyIndex++;
      if (note.f > 0) {
        tone(note.f, note.d * 0.9, 'square', 0.03);
      }
      melodyTimer = setTimeout(playMelodyStep, note.d * 1000);
    }

    function startBg() {
      ensure();
      if (bgPlaying) return;
      bgPlaying = true;
      melodyIndex = 0;
      playMelodyStep();
    }

    function stopBg() {
      bgPlaying = false;
      if (melodyTimer) clearTimeout(melodyTimer);
    }

    return { beep, boom, lineClear, startBg, stopBg, ensure };
  })();

  /* ── Game state (single object) ── */
  const state = {
    board: [],
    piece: null,
    pieceType: '',
    rotation: 0,
    pos: { x: 0, y: 0 },
    nextType: '',
    score: 0,
    level: 1,
    lines: 0,
    dropTimer: 0,
    dropInterval: 1000,
    lastTime: 0,
    paused: false,
    gameOver: false,
    clearing: [],
    clearTimer: 0,
    clearPhase: 0,
    keys: {},
    lockDelay: 0,
    started: false,
  };

  /* ── Helpers ── */
  function emptyBoard() {
    return Array.from({ length: ROWS }, function () {
      return Array(COLS).fill(null);
    });
  }

  function randomType() {
    return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
  }

  function getShape(type, rot) {
    const shapes = SHAPES[type];
    return shapes[rot % shapes.length];
  }

  function collides(shape, x, y, board) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = x + c;
        const ny = y + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function dropIntervalForLevel(level) {
    return Math.max(80, 1000 - (level - 1) * 80);
  }

  function spawnPiece() {
    state.pieceType = state.nextType || randomType();
    state.nextType = randomType();
    state.rotation = 0;
    state.piece = getShape(state.pieceType, 0);
    state.pos.x = Math.floor((COLS - state.piece[0].length) / 2);
    state.pos.y = -getSpawnOffset(state.piece);

    if (collides(state.piece, state.pos.x, state.pos.y, state.board)) {
      state.gameOver = true;
      Audio.stopBg();
      showOverlay('GAME OVER', 'SCORE: ' + state.score);
    }
  }

  function getSpawnOffset(shape) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) return r;
      }
    }
    return 0;
  }

  function lockPiece() {
    const shape = getShape(state.pieceType, state.rotation);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const ny = state.pos.y + r;
        const nx = state.pos.x + c;
        if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
          state.board[ny][nx] = state.pieceType;
        }
      }
    }
    checkLines();
  }

  function checkLines() {
    const full = [];
    for (let r = 0; r < ROWS; r++) {
      if (state.board[r].every(function (cell) { return cell !== null; })) {
        full.push(r);
      }
    }

    if (full.length === 0) {
      spawnPiece();
      updateUI();
      return;
    }

    state.clearing = full;
    state.clearTimer = CLEAR_ANIM_MS;
    state.clearPhase = 0;
    state.score += LINE_SCORES[full.length] * state.level;
    state.lines += full.length;
    const newLevel = Math.floor(state.lines / 10) + 1;
    if (newLevel > state.level) {
      state.level = newLevel;
      state.dropInterval = dropIntervalForLevel(state.level);
    }
    Audio.lineClear(full.length);
    updateUI();
  }

  function finishClear() {
    const sorted = state.clearing.slice().sort(function (a, b) { return a - b; });
    for (let i = sorted.length - 1; i >= 0; i--) {
      state.board.splice(sorted[i], 1);
      state.board.unshift(Array(COLS).fill(null));
    }
    state.clearing = [];
    state.clearTimer = 0;
    spawnPiece();
    updateUI();
  }

  function move(dx, dy) {
    if (state.paused || state.gameOver || state.clearing.length) return false;
    const shape = getShape(state.pieceType, state.rotation);
    if (!collides(shape, state.pos.x + dx, state.pos.y + dy, state.board)) {
      state.pos.x += dx;
      state.pos.y += dy;
      if (dx !== 0) Audio.beep();
      return true;
    }
    return false;
  }

  function rotatePiece() {
    if (state.paused || state.gameOver || state.clearing.length) return;
    const shapes = SHAPES[state.pieceType];
    const newRot = (state.rotation + 1) % shapes.length;
    const newShape = shapes[newRot];
    const kicks = [0, -1, 1, -2, 2];
    for (let i = 0; i < kicks.length; i++) {
      const kx = kicks[i];
      if (!collides(newShape, state.pos.x + kx, state.pos.y, state.board)) {
        state.rotation = newRot;
        state.pos.x += kx;
        Audio.beep();
        return;
      }
    }
  }

  function softDrop() {
    if (state.paused || state.gameOver || state.clearing.length) return;
    if (move(0, 1)) {
      state.score += 1;
      state.dropTimer = 0;
      updateUI();
    } else {
      lockPiece();
    }
  }

  function hardDrop() {
    if (state.paused || state.gameOver || state.clearing.length) return;
    let dropped = 0;
    while (move(0, 1)) dropped++;
    state.score += dropped * 2;
    Audio.boom();
    lockPiece();
    updateUI();
  }

  function togglePause() {
    if (state.gameOver) return;
    state.paused = !state.paused;
    pauseBanner.classList.toggle('hidden', !state.paused);
    if (state.paused) {
      Audio.stopBg();
    } else {
      Audio.startBg();
      state.lastTime = performance.now();
    }
  }

  function showOverlay(title, msg) {
    overlayTitle.textContent = title;
    overlayMessage.textContent = msg;
    overlay.classList.remove('hidden');
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  function resetGame() {
    state.board = emptyBoard();
    state.score = 0;
    state.level = 1;
    state.lines = 0;
    state.dropInterval = dropIntervalForLevel(1);
    state.dropTimer = 0;
    state.paused = false;
    state.gameOver = false;
    state.clearing = [];
    state.clearTimer = 0;
    state.nextType = randomType();
    state.started = true;
    pauseBanner.classList.add('hidden');
    hideOverlay();
    spawnPiece();
    updateUI();
    Audio.startBg();
    state.lastTime = performance.now();
  }

  function updateUI() {
    scoreDisplay.textContent = state.score;
    levelDisplay.textContent = state.level;
    linesDisplay.textContent = state.lines;
    drawNext();
  }

  /* ── Drawing ── */
  function drawPixelBlock(context, px, py, size, palette) {
    const s = size;
    const p = 2;

    context.fillStyle = palette.dark;
    context.fillRect(px, py, s, s);

    context.fillStyle = palette.main;
    context.fillRect(px + p, py + p, s - p * 2, s - p * 2);

    context.fillStyle = palette.light;
    context.fillRect(px + p, py + p, s - p * 3, p);
    context.fillRect(px + p, py + p, p, s - p * 3);

    context.fillStyle = palette.dark;
    context.fillRect(px + s - p * 2, py + p, p, s - p * 3);
    context.fillRect(px + p, py + s - p * 2, s - p * 3, p);

    context.fillStyle = palette.inner;
    context.fillRect(px + p * 2, py + p * 2, s - p * 5, s - p * 5);

    context.fillStyle = '#000';
    context.fillRect(px + p * 2, py + p * 2, s - p * 5, 1);
    context.fillRect(px + p * 2, py + p * 2, 1, s - p * 5);
  }

  function drawBrickBlock(context, px, py, size) {
    drawPixelBlock(context, px, py, size, COLORS.brick);
    context.fillStyle = '#5c2e0a';
    context.fillRect(px + 4, py + 8, size - 8, 2);
    context.fillRect(px + 4, py + 18, size - 8, 2);
  }

  function drawBoardBackground() {
    const ox = BORDER * CELL;
    const oy = BORDER * CELL;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(ox, oy, COLS * CELL, ROWS * CELL);

    ctx.strokeStyle = '#2a2a4e';
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(ox + c * CELL, oy);
      ctx.lineTo(ox + c * CELL, oy + ROWS * CELL);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(ox, oy + r * CELL);
      ctx.lineTo(ox + COLS * CELL, oy + r * CELL);
      ctx.stroke();
    }
  }

  function drawBorder() {
    for (let c = 0; c < COLS + BORDER * 2; c++) {
      for (let r = 0; r < BORDER; r++) {
        drawBrickBlock(ctx, c * CELL, r * CELL, CELL);
        drawBrickBlock(ctx, c * CELL, (ROWS + BORDER + r) * CELL, CELL);
      }
    }
    for (let r = BORDER; r < ROWS + BORDER; r++) {
      for (let c = 0; c < BORDER; c++) {
        drawBrickBlock(ctx, c * CELL, r * CELL, CELL);
        drawBrickBlock(ctx, (COLS + BORDER + c) * CELL, r * CELL, CELL);
      }
    }
  }

  function drawCell(type, col, row, flash) {
    const ox = (BORDER + col) * CELL;
    const oy = (BORDER + row) * CELL;

    if (flash) {
      const phase = state.clearPhase % 2;
      ctx.fillStyle = phase ? '#fff' : '#fcba03';
      ctx.fillRect(ox + 1, oy + 1, CELL - 2, CELL - 2);
      return;
    }

    if (!type) return;
    drawPixelBlock(ctx, ox, oy, CELL, COLORS[type]);
  }

  function drawGhost() {
    if (state.paused || state.gameOver || state.clearing.length) return;
    const shape = getShape(state.pieceType, state.rotation);
    let ghostY = state.pos.y;
    while (!collides(shape, state.pos.x, ghostY + 1, state.board)) {
      ghostY++;
    }
    if (ghostY === state.pos.y) return;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const col = state.pos.x + c;
        const row = ghostY + r;
        if (row < 0) continue;
        const ox = (BORDER + col) * CELL;
        const oy = (BORDER + row) * CELL;
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 2;
        ctx.strokeRect(ox + 3, oy + 3, CELL - 6, CELL - 6);
      }
    }
  }

  function drawPiece() {
    if (state.paused || state.gameOver || !state.pieceType) return;
    const shape = getShape(state.pieceType, state.rotation);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const col = state.pos.x + c;
        const row = state.pos.y + r;
        if (row < 0) continue;
        drawCell(state.pieceType, col, row, false);
      }
    }
  }

  function drawBoard() {
    for (let r = 0; r < ROWS; r++) {
      const isClearing = state.clearing.indexOf(r) !== -1;
      for (let c = 0; c < COLS; c++) {
        drawCell(state.board[r][c], c, r, isClearing);
      }
    }
  }

  function drawNext() {
    nextCtx.fillStyle = '#1a1a2e';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    const shape = getShape(state.nextType, 0);
    const blockSize = 24;
    const offsetX = Math.floor((nextCanvas.width - shape[0].length * blockSize) / 2);
    const offsetY = Math.floor((nextCanvas.height - shape.length * blockSize) / 2);

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        drawPixelBlock(nextCtx, offsetX + c * blockSize, offsetY + r * blockSize, blockSize, COLORS[state.nextType]);
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawBoardBackground();
    drawBorder();
    drawBoard();
    drawGhost();
    drawPiece();
  }

  /* ── Game loop ── */
  function update(dt) {
    if (state.paused || state.gameOver) return;

    if (state.clearing.length) {
      state.clearTimer -= dt;
      state.clearPhase = Math.floor((CLEAR_ANIM_MS - state.clearTimer) / 80);
      if (state.clearTimer <= 0) {
        finishClear();
      }
      return;
    }

    state.dropTimer += dt;
    if (state.dropTimer >= state.dropInterval) {
      state.dropTimer = 0;
      if (!move(0, 1)) {
        lockPiece();
      }
    }
  }

  function gameLoop(timestamp) {
    if (!state.lastTime) state.lastTime = timestamp;
    const dt = timestamp - state.lastTime;
    state.lastTime = timestamp;

    if (state.started) {
      update(dt);
      render();
    }

    requestAnimationFrame(gameLoop);
  }

  /* ── Input ── */
  const handledKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'p', 'P', 'r', 'R', 'x', 'X']);

  document.addEventListener('keydown', function (e) {
    if (handledKeys.has(e.key)) e.preventDefault();

    Audio.ensure();

    if (!state.started && e.key !== 'r' && e.key !== 'R') {
      resetGame();
    }

    if (e.key === 'r' || e.key === 'R') {
      resetGame();
      return;
    }

    if (e.key === 'p' || e.key === 'P') {
      togglePause();
      return;
    }

    if (state.gameOver || state.paused) return;

    switch (e.key) {
      case 'ArrowLeft':
        move(-1, 0);
        break;
      case 'ArrowRight':
        move(1, 0);
        break;
      case 'ArrowDown':
        softDrop();
        break;
      case 'ArrowUp':
      case 'x':
      case 'X':
        rotatePiece();
        break;
      case ' ':
        hardDrop();
        break;
    }
  });

  /* ── Responsive canvas scaling ── */
  function scaleCanvas() {
    const maxH = window.innerHeight * 0.72;
    const maxW = window.innerWidth * 0.55;
    const scale = Math.min(1, maxH / CANVAS_H, maxW / CANVAS_W);
    canvas.style.width = (CANVAS_W * scale) + 'px';
    canvas.style.height = (CANVAS_H * scale) + 'px';
  }

  window.addEventListener('resize', scaleCanvas);
  scaleCanvas();

  /* ── Init ── */
  overlayTitle.textContent = 'MARIO TETRIS';
  overlayMessage.textContent = 'PRESS ANY KEY TO START';
  overlay.classList.remove('hidden');

  drawNext();
  render();
  requestAnimationFrame(gameLoop);
})();
