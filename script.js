(() => {
  const canvas = document.getElementById("game-canvas");
  const statusText = document.getElementById("status-text");
  const turnChip = document.getElementById("turn-chip");
  const scoreX = document.getElementById("score-x");
  const scoreO = document.getElementById("score-o");
  const scoreDraw = document.getElementById("score-draw");
  const newRoundBtn = document.getElementById("new-round-btn");
  const resetScoreBtn = document.getElementById("reset-score-btn");
  const modeButtons = Array.from(document.querySelectorAll(".mode-btn"));
  const difficultyButtons = Array.from(document.querySelectorAll(".difficulty-btn"));
  const difficultyPanel = document.getElementById("difficulty-panel");

  if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const WIN_LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  const state = {
    board: Array(9).fill(""),
    currentPlayer: "X",
    result: null,
    winningLine: null,
    winLineStart: null,
    marksPlacedAt: Array(9).fill(-1_000),
    scores: {
      X: 0,
      O: 0,
      draw: 0,
    },
    vsAI: false,
    aiDifficulty: "medium",
    aiMoveAt: null,
    cursorIndex: 4,
    hoverIndex: null,
    clock: 0,
  };

  const layout = {
    size: 0,
    dpr: 1,
  };

  const THEME = {
    boardBgNear: "#3f4759",
    boardBgFar: "#2d3442",
    shellBase: "#3b4355",
    shellStrokeLight: "rgba(216, 222, 233, 0.12)",
    shellStrokeDark: "rgba(10, 13, 19, 0.38)",
    shadowDark: "rgba(8, 11, 17, 0.5)",
    shadowLight: "rgba(236, 239, 244, 0.08)",
    highlightX: "rgba(191, 97, 106, 0.58)",
    highlightO: "rgba(129, 161, 193, 0.58)",
    markXA: "#d08770",
    markXB: "#bf616a",
    markOA: "#88c0d0",
    markOB: "#5e81ac",
    winLine: "rgba(163, 190, 140, 0.96)",
    winGlow: "rgba(163, 190, 140, 0.34)",
  };

  function pickRandom(items) {
    if (!items.length) {
      return null;
    }
    const idx = Math.floor(Math.random() * items.length);
    return items[idx];
  }

  function cloneBoard(board) {
    return board.slice();
  }

  function availableMoves(board = state.board) {
    const out = [];
    for (let i = 0; i < board.length; i += 1) {
      if (!board[i]) {
        out.push(i);
      }
    }
    return out;
  }

  function evaluateBoard(board) {
    for (const line of WIN_LINES) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[b] === board[c]) {
        return { winner: board[a], line };
      }
    }

    if (board.every(Boolean)) {
      return { winner: "draw", line: null };
    }

    return null;
  }

  function minimax(board, maximizing, depth) {
    const outcome = evaluateBoard(board);
    if (outcome) {
      if (outcome.winner === "O") {
        return 10 - depth;
      }
      if (outcome.winner === "X") {
        return depth - 10;
      }
      return 0;
    }

    const moves = availableMoves(board);
    if (maximizing) {
      let best = -Infinity;
      for (const move of moves) {
        board[move] = "O";
        const score = minimax(board, false, depth + 1);
        board[move] = "";
        if (score > best) {
          best = score;
        }
      }
      return best;
    }

    let best = Infinity;
    for (const move of moves) {
      board[move] = "X";
      const score = minimax(board, true, depth + 1);
      board[move] = "";
      if (score < best) {
        best = score;
      }
    }
    return best;
  }

  function findImmediateMove(player) {
    const moves = availableMoves();
    for (const move of moves) {
      const testBoard = cloneBoard(state.board);
      testBoard[move] = player;
      const result = evaluateBoard(testBoard);
      if (result && result.winner === player) {
        return move;
      }
    }
    return null;
  }

  function bestAIMove() {
    const board = cloneBoard(state.board);
    const moves = availableMoves(board);
    if (!moves.length) {
      return null;
    }

    let bestMove = moves[0];
    let bestScore = -Infinity;

    for (const move of moves) {
      board[move] = "O";
      const score = minimax(board, false, 0);
      board[move] = "";

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  function chooseAIMove() {
    const openMoves = availableMoves();
    if (!openMoves.length) {
      return null;
    }

    if (state.aiDifficulty === "easy") {
      return pickRandom(openMoves);
    }

    const canWin = findImmediateMove("O");
    const canBlock = findImmediateMove("X");

    if (state.aiDifficulty === "medium") {
      if (canWin !== null) {
        return canWin;
      }
      if (canBlock !== null && Math.random() < 0.8) {
        return canBlock;
      }
      if (Math.random() < 0.55) {
        return bestAIMove();
      }
      return pickRandom(openMoves);
    }

    if (canWin !== null) {
      return canWin;
    }
    if (canBlock !== null) {
      return canBlock;
    }

    return bestAIMove();
  }

  function setMode(nextMode) {
    state.vsAI = nextMode === "ai";
    state.aiMoveAt = null;
    resetRound();
    syncControls();
  }

  function setDifficulty(level) {
    state.aiDifficulty = level;
    syncControls();
  }

  function syncControls() {
    for (const btn of modeButtons) {
      const active = (state.vsAI && btn.dataset.mode === "ai") || (!state.vsAI && btn.dataset.mode === "human");
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    }

    for (const btn of difficultyButtons) {
      const active = btn.dataset.difficulty === state.aiDifficulty;
      btn.classList.toggle("is-active", active);
      btn.disabled = !state.vsAI;
      btn.setAttribute("aria-disabled", String(!state.vsAI));
    }

    difficultyPanel.classList.toggle("is-disabled", !state.vsAI);
  }

  function resetRound() {
    state.board.fill("");
    state.currentPlayer = "X";
    state.result = null;
    state.winningLine = null;
    state.winLineStart = null;
    state.aiMoveAt = null;
    state.cursorIndex = 4;
    state.hoverIndex = null;
    state.marksPlacedAt.fill(-1_000);
    updateHud();
  }

  function resetScores() {
    state.scores.X = 0;
    state.scores.O = 0;
    state.scores.draw = 0;
    resetRound();
  }

  function scheduleAIMove() {
    if (!state.vsAI || state.currentPlayer !== "O" || state.result) {
      state.aiMoveAt = null;
      return;
    }
    state.aiMoveAt = state.clock + 320;
  }

  function commitMove(index) {
    if (index < 0 || index > 8 || state.board[index] || state.result) {
      return false;
    }

    const player = state.currentPlayer;
    state.board[index] = player;
    state.marksPlacedAt[index] = state.clock;

    const outcome = evaluateBoard(state.board);
    if (outcome) {
      state.result = outcome.winner;
      state.winningLine = outcome.line;
      state.winLineStart = state.clock;
      state.aiMoveAt = null;

      if (outcome.winner === "draw") {
        state.scores.draw += 1;
      } else {
        state.scores[outcome.winner] += 1;
      }

      updateHud();
      return true;
    }

    state.currentPlayer = player === "X" ? "O" : "X";
    updateHud();

    if (state.vsAI && state.currentPlayer === "O") {
      scheduleAIMove();
    }

    return true;
  }

  function humanCanPlay() {
    if (state.result) {
      return false;
    }
    if (!state.vsAI) {
      return true;
    }
    return state.currentPlayer === "X";
  }

  function tryHumanMove(index) {
    if (!humanCanPlay()) {
      return false;
    }
    return commitMove(index);
  }

  function updateHud() {
    scoreX.textContent = String(state.scores.X);
    scoreO.textContent = String(state.scores.O);
    scoreDraw.textContent = String(state.scores.draw);

    if (state.result === "X") {
      statusText.textContent = "X wins this round";
      turnChip.textContent = "Round done";
      turnChip.className = "turn-chip turn-end";
      return;
    }

    if (state.result === "O") {
      statusText.textContent = state.vsAI ? "AI wins this round" : "O wins this round";
      turnChip.textContent = "Round done";
      turnChip.className = "turn-chip turn-end";
      return;
    }

    if (state.result === "draw") {
      statusText.textContent = "Draw. Clean board, no winner.";
      turnChip.textContent = "Round done";
      turnChip.className = "turn-chip turn-end";
      return;
    }

    if (state.vsAI && state.currentPlayer === "O") {
      statusText.textContent = "AI thinking...";
    } else {
      statusText.textContent = `${state.currentPlayer} to move`;
    }

    turnChip.textContent = `Turn: ${state.currentPlayer}`;
    turnChip.className = state.currentPlayer === "X" ? "turn-chip turn-x" : "turn-chip turn-o";
  }

  function syncCanvasSize() {
    const size = Math.floor(canvas.clientWidth);
    if (!size) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.floor(size * dpr);

    if (canvas.width !== targetW || canvas.height !== targetW) {
      canvas.width = targetW;
      canvas.height = targetW;
    }

    layout.size = size;
    layout.dpr = dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function roundedRectPath(x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawSoftRect(x, y, width, height, radius, inset) {
    const base = THEME.shellBase;

    ctx.save();
    roundedRectPath(x, y, width, height, radius);
    ctx.fillStyle = base;
    ctx.fill();
    ctx.restore();

    if (inset) {
      ctx.save();
      roundedRectPath(x + 1.2, y + 1.2, width - 2.4, height - 2.4, Math.max(8, radius - 1));
      ctx.strokeStyle = THEME.shellStrokeLight;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      roundedRectPath(x + 1.8, y + 1.8, width - 3.6, height - 3.6, Math.max(8, radius - 2));
      ctx.strokeStyle = THEME.shellStrokeDark;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.shadowColor = THEME.shadowDark;
    ctx.shadowBlur = 9;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    roundedRectPath(x, y, width, height, radius);
    ctx.fillStyle = base;
    ctx.fill();

    ctx.shadowColor = THEME.shadowLight;
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = -3;
    ctx.shadowOffsetY = -3;
    roundedRectPath(x, y, width, height, radius);
    ctx.fillStyle = base;
    ctx.fill();
    ctx.restore();
  }

  function drawXMark(cx, cy, size, progress, alpha) {
    const arm = size * (0.2 + progress * 0.14);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = size * 0.1;
    ctx.lineCap = "round";
    ctx.shadowColor = "rgba(191, 97, 106, 0.34)";
    ctx.shadowBlur = 7;
    const gradient = ctx.createLinearGradient(cx - arm, cy - arm, cx + arm, cy + arm);
    gradient.addColorStop(0, THEME.markXA);
    gradient.addColorStop(1, THEME.markXB);
    ctx.strokeStyle = gradient;

    ctx.beginPath();
    ctx.moveTo(cx - arm, cy - arm);
    ctx.lineTo(cx + arm, cy + arm);
    ctx.moveTo(cx + arm, cy - arm);
    ctx.lineTo(cx - arm, cy + arm);
    ctx.stroke();
    ctx.restore();
  }

  function drawOMark(cx, cy, size, progress, alpha) {
    const radius = size * (0.17 + progress * 0.11);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = size * 0.09;
    ctx.shadowColor = "rgba(129, 161, 193, 0.3)";
    ctx.shadowBlur = 7;
    const gradient = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    gradient.addColorStop(0, THEME.markOA);
    gradient.addColorStop(1, THEME.markOB);
    ctx.strokeStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function metrics() {
    const size = layout.size;
    const pad = size * 0.08;
    const boardSize = size - pad * 2;
    const gap = boardSize * 0.045;
    const cell = (boardSize - gap * 2) / 3;
    return { size, pad, boardSize, gap, cell };
  }

  function cellRect(index, m) {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const x = m.pad + col * (m.cell + m.gap);
    const y = m.pad + row * (m.cell + m.gap);
    return { x, y, w: m.cell, h: m.cell };
  }

  function drawBoard() {
    const m = metrics();
    if (!m.size) {
      return;
    }

    const bg = ctx.createRadialGradient(m.size * 0.24, m.size * 0.2, 30, m.size * 0.5, m.size * 0.52, m.size * 0.68);
    bg.addColorStop(0, THEME.boardBgNear);
    bg.addColorStop(1, THEME.boardBgFar);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, m.size, m.size);

    drawSoftRect(m.pad * 0.45, m.pad * 0.45, m.size - m.pad * 0.9, m.size - m.pad * 0.9, m.size * 0.08, true);

    const playable = humanCanPlay();
    for (let i = 0; i < 9; i += 1) {
      const rect = cellRect(i, m);
      const occupied = Boolean(state.board[i]);
      drawSoftRect(rect.x, rect.y, rect.w, rect.h, rect.w * 0.18, occupied);

      const highlighted = playable && !occupied && (state.hoverIndex === i || state.cursorIndex === i);
      if (highlighted) {
        ctx.save();
        roundedRectPath(rect.x + 3, rect.y + 3, rect.w - 6, rect.h - 6, rect.w * 0.16);
        ctx.strokeStyle = state.currentPlayer === "X" ? THEME.highlightX : THEME.highlightO;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      const mark = state.board[i];
      if (mark) {
        const elapsed = state.clock - state.marksPlacedAt[i];
        const raw = Math.max(0, Math.min(1, elapsed / 220));
        const eased = 1 - (1 - raw) * (1 - raw);
        const alpha = 0.5 + eased * 0.5;
        const cx = rect.x + rect.w / 2;
        const cy = rect.y + rect.h / 2;
        if (mark === "X") {
          drawXMark(cx, cy, rect.w, eased, alpha);
        } else {
          drawOMark(cx, cy, rect.w, eased, alpha);
        }
      }
    }

    const previewIndex = state.hoverIndex !== null ? state.hoverIndex : state.cursorIndex;
    if (playable && previewIndex !== null && !state.board[previewIndex]) {
      const rect = cellRect(previewIndex, m);
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      if (state.currentPlayer === "X") {
        drawXMark(cx, cy, rect.w, 0.7, 0.16);
      } else {
        drawOMark(cx, cy, rect.w, 0.7, 0.16);
      }
    }

    if (state.winningLine) {
      const [startIndex, , endIndex] = state.winningLine;
      const a = cellRect(startIndex, m);
      const b = cellRect(endIndex, m);

      const ax = a.x + a.w / 2;
      const ay = a.y + a.h / 2;
      const bx = b.x + b.w / 2;
      const by = b.y + b.h / 2;

      const elapsed = Math.max(0, state.clock - (state.winLineStart || state.clock));
      const progress = Math.min(1, elapsed / 420);
      const tx = ax + (bx - ax) * progress;
      const ty = ay + (by - ay) * progress;

      ctx.save();
      ctx.strokeStyle = THEME.winLine;
      ctx.lineWidth = Math.max(6, m.size * 0.012);
      ctx.lineCap = "round";
      ctx.shadowColor = THEME.winGlow;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.restore();
    }
  }

  function getCellFromPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const m = metrics();
    for (let i = 0; i < 9; i += 1) {
      const cell = cellRect(i, m);
      if (
        x >= cell.x &&
        x <= cell.x + cell.w &&
        y >= cell.y &&
        y <= cell.y + cell.h
      ) {
        return i;
      }
    }

    return null;
  }

  function tick(ms) {
    state.clock += ms;

    if (state.aiMoveAt !== null && state.clock >= state.aiMoveAt) {
      state.aiMoveAt = null;
      const choice = chooseAIMove();
      if (choice !== null) {
        commitMove(choice);
      }
    }
  }

  function renderGameToText() {
    const payload = {
      coordinateSystem: "Board uses cell indices 0-8 from top-left to bottom-right. Canvas origin is top-left; +x right, +y down.",
      board: state.board,
      currentPlayer: state.currentPlayer,
      result: state.result,
      winningLine: state.winningLine,
      mode: state.vsAI ? "vs-ai" : "vs-human",
      aiDifficulty: state.aiDifficulty,
      aiMovePending: state.aiMoveAt !== null,
      scores: state.scores,
      cursorIndex: state.cursorIndex,
      hoverIndex: state.hoverIndex,
      availableMoves: availableMoves(),
    };

    return JSON.stringify(payload);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      return;
    }
    document.exitFullscreen?.();
  }

  function moveCursor(deltaRow, deltaCol) {
    const row = Math.floor(state.cursorIndex / 3);
    const col = state.cursorIndex % 3;
    const nextRow = (row + deltaRow + 3) % 3;
    const nextCol = (col + deltaCol + 3) % 3;
    state.cursorIndex = nextRow * 3 + nextCol;
    state.hoverIndex = state.cursorIndex;
  }

  canvas.addEventListener("mousemove", (event) => {
    const idx = getCellFromPoint(event.clientX, event.clientY);
    state.hoverIndex = idx;
    if (idx !== null) {
      state.cursorIndex = idx;
    }
  });

  canvas.addEventListener("mouseleave", () => {
    state.hoverIndex = null;
  });

  canvas.addEventListener("click", (event) => {
    canvas.focus();
    const idx = getCellFromPoint(event.clientX, event.clientY);
    if (idx !== null) {
      tryHumanMove(idx);
    }
  });

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    if (key === "f") {
      event.preventDefault();
      toggleFullscreen();
      return;
    }

    if (key === "r") {
      event.preventDefault();
      resetRound();
      return;
    }

    if (key === "arrowleft") {
      event.preventDefault();
      moveCursor(0, -1);
      return;
    }

    if (key === "arrowright") {
      event.preventDefault();
      moveCursor(0, 1);
      return;
    }

    if (key === "arrowup") {
      event.preventDefault();
      moveCursor(-1, 0);
      return;
    }

    if (key === "arrowdown") {
      event.preventDefault();
      moveCursor(1, 0);
      return;
    }

    if (key === " " || key === "enter") {
      event.preventDefault();
      if (state.result) {
        resetRound();
      } else {
        tryHumanMove(state.cursorIndex);
      }
    }
  });

  window.addEventListener("resize", syncCanvasSize);
  document.addEventListener("fullscreenchange", syncCanvasSize);

  for (const btn of modeButtons) {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;
      if (!mode) {
        return;
      }
      setMode(mode);
    });
  }

  for (const btn of difficultyButtons) {
    btn.addEventListener("click", () => {
      if (!state.vsAI) {
        return;
      }
      const level = btn.dataset.difficulty;
      if (!level) {
        return;
      }
      setDifficulty(level);
    });
  }

  newRoundBtn?.addEventListener("click", resetRound);
  resetScoreBtn?.addEventListener("click", resetScores);

  let prevTs = performance.now();
  function frame(ts) {
    const dt = Math.min(40, Math.max(0, ts - prevTs));
    prevTs = ts;
    tick(dt);
    drawBoard();
    requestAnimationFrame(frame);
  }

  window.render_game_to_text = renderGameToText;
  window.advanceTime = async (ms) => {
    const frameMs = 1000 / 60;
    const steps = Math.max(1, Math.ceil(ms / frameMs));
    const slice = ms / steps;
    for (let i = 0; i < steps; i += 1) {
      tick(slice);
    }
    drawBoard();
  };

  syncControls();
  syncCanvasSize();
  updateHud();
  requestAnimationFrame(frame);
})();
