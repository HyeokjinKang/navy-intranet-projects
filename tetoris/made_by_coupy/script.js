const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const holdCanvas = document.getElementById("holdCanvas");
const holdCtx = holdCanvas.getContext("2d");
const nextCanvas = document.getElementById("nextCanvas");
const nextCtx = nextCanvas.getContext("2d");
const newGameButton = document.getElementById("newGameButton");
const score = document.getElementById("score");
const rankContainer = document.getElementById("rankBackground");
const rankContents = document.getElementById("rankContents");

const WIDTH = 300;
const HEIGHT = 600;
const DIV = 10;
const HDIV = 22; // 2 for upper rest space
const INFOWIDTH = 100;
const INFODIV = 4;
const TICK = 24; // ms
const DEBOUNCE = 120; // ms

const colorChip = ["#000", "#C031F2", "#F2CE26", "#3BBEF2", "#3B52F2", "#F2A14A", "#29CA3B", "#CE3838"];
const blockWidth = WIDTH / DIV;
const infoBlockWidth = INFOWIDTH / INFODIV;

// prettier-ignore
const blocks = {
  1: [
    [[0, 0], [-1, 0], [0, -1], [0, 1]],
    [[0, 0], [-1, 0], [0, 1], [1, 0]],
    [[0, 0], [1, 0], [0, -1], [0, 1]],
    [[0, 0], [-1, 0], [0, -1], [1, 0]],
  ],
  2: [
    [[0, 0], [-1, 0], [-1, 1], [0, 1]],
  ],
  3: [
    [[0, 0], [-1, 0], [-2, 0], [1, 0]],
    [[0, 0], [0, -1], [0, 1], [0, 2]],
    [[0, 1], [-1, 1], [-2, 1], [1, 1]],
    [[0, 0], [0, -1], [0, 1], [0, 2]],
  ],
  4: [
    [[0, 0], [-1, -1], [0, -1], [0, 1]],
    [[-1, 0], [-1, -1], [0, -1], [1, -1]],
    [[0, 0], [-1, 0], [-1, -1], [-1, -2]],
    [[0, 0], [-1, 0], [-2, 0], [0, -1]],
  ],
  5: [
    [[0, 0], [-1, 1], [0, 1], [0, -1]],
    [[-1, 0], [-2, 0], [0, 0], [0, 1]],
    [[-1, 1], [0, 0], [-1, 0], [-1, 2]],
    [[0, 1], [-1, 0], [-1, 1], [1, 1]],
  ],
  6: [
    [[0, 0], [-1, -1], [0, -1], [1, 0]],
    [[0, 0], [1, -1], [1, 0], [0, 1]],
    [[0, 0], [-1, 0], [0, 1], [1, 1]],
    [[0, 0], [1, -1], [1, 0], [0, 1]],
  ],
  7: [
    [[0, 0], [-1, 0], [0, -1], [1, -1]],
    [[0, 0], [0, -1], [1, 0], [1, 1]],
    [[0, 0], [-1, 1], [0, 1], [1, 0]],
    [[0, 0], [0, -1], [1, 0], [1, 1]],
  ],
};

const infoBoard = {
  1: [
    [0, 0, 0, 0],
    [0, 1, 0, 0],
    [1, 1, 1, 0],
    [0, 0, 0, 0],
  ],
  2: [
    [0, 0, 0, 0],
    [2, 2, 0, 0],
    [2, 2, 0, 0],
    [0, 0, 0, 0],
  ],
  3: [
    [0, 3, 0, 0],
    [0, 3, 0, 0],
    [0, 3, 0, 0],
    [0, 3, 0, 0],
  ],
  4: [
    [0, 0, 0, 0],
    [4, 0, 0, 0],
    [4, 4, 4, 0],
    [0, 0, 0, 0],
  ],
  5: [
    [0, 0, 0, 0],
    [0, 0, 5, 0],
    [5, 5, 5, 0],
    [0, 0, 0, 0],
  ],
  6: [
    [0, 0, 0, 0],
    [6, 0, 0, 0],
    [6, 6, 0, 0],
    [0, 6, 0, 0],
  ],
  7: [
    [0, 0, 0, 0],
    [0, 7, 0, 0],
    [7, 7, 0, 0],
    [7, 0, 0, 0],
  ],
};

let game;
let keyStatus = {};
let isRankOpen = false;

// WARN: class를 제대로 이해하고 쓴 코드가 아님
class Session {
  isPlaying = false;
  isPaused = false;
  board = [];
  now = 0; // 1 ~ 7
  direction = 0;
  score = 0;
  baseLoc = [2, 4]; // y, x
  locations = []; // y, x
  speed = 800;
  timer = undefined;
  tickTimer = Date.now();

  moveLimit = false;
  moveLimitTimeout = undefined;

  isHoldUsed = false;
  holded = undefined;
  queue = [];

  randomQueue = () => {
    let bag = [1, 2, 3, 4, 5, 6, 7];

    while (bag.length) {
      let rand = Math.floor(Math.random() * bag.length);
      this.queue.push(bag[rand]);
      bag.splice(rand, 1);
    }
  };

  rotate = (dir) => {
    const now = this.now;
    const base = this.baseLoc;
    const prevLocations = this.locations;

    let direction = this.direction + dir;
    let locations = [];
    let collapseX = 0;
    let collapseY = 0;

    if (direction < 0) direction = blocks[now].length - 1;
    else if (direction >= blocks[now].length) direction = 0;

    for (let block of blocks[now][direction]) {
      const y = base[0] + block[0];
      const x = base[1] + block[1];
      if (x < 0) {
        collapseX = Math.min(collapseX, x);
      } else if (x >= DIV) {
        collapseX = Math.max(collapseY, y - HDIV);
      }
      if (y >= HDIV) {
        collapseY = Math.max(collapseY, y - HDIV);
      }
      locations.push([y, x]);
    }

    let isValid = true;

    for (let block of locations) {
      block[0] -= collapseY;
      block[1] -= collapseX;

      if (this.board[block[0]][block[1]] != 0) {
        let prevLocCheck = false;
        for (let loc of prevLocations) {
          if (block[0] == loc[0] && block[1] == loc[1]) {
            prevLocCheck = true;
            break;
          }
        }
        if (!prevLocCheck) {
          isValid = false;
          break;
        }
      }
    }

    if (!isValid) return;

    base[0] -= collapseY;
    base[1] -= collapseX;
    this.direction = direction;
    this.updateBoard(locations, now);
  };

  move = (yAdder, xAdder, noWait) => {
    if (xAdder == 0) this.timer = Date.now();
    if (yAdder && this.moveLimit) return;

    const now = this.now;
    const prevLocations = this.locations;
    const direction = this.direction;

    let base = this.baseLoc;
    let locations = [];

    let isGround = false;
    let isValid = true;

    for (let block of blocks[now][direction]) {
      const y = base[0] + block[0] + yAdder;
      const x = base[1] + block[1] + xAdder;
      if (y >= HDIV) {
        isGround = true;
        break;
      }
      if (x < 0 || x >= DIV) {
        isValid = false;
        break;
      }
      locations.push([y, x]);
    }

    for (let block of locations) {
      if (block[0] >= 0 && this.board[block[0]][block[1]] != 0) {
        let itself = false;
        for (let loc of prevLocations) {
          if (block[0] == loc[0] && block[1] == loc[1]) {
            itself = true;
            break;
          }
        }
        if (!itself) {
          if (yAdder || yAdder + xAdder == 0) {
            if (block[0] <= 2) this.gameOver();
            isGround = true;
          } else isValid = false;
          break;
        }
      }
    }

    if (isGround) {
      this.moveLimit = true;
      if (noWait) {
        this.speed -= 4;
        this.lineCheck();
      } else {
        this.moveLimitTimeout = setTimeout(() => {
          this.moveLimitTimeout = undefined;
          this.moveLimit = false;
          this.move(1, 0, true);
        }, 200);
      }
    }
    if (!isValid || isGround) return 1;

    base[0] += yAdder;
    base[1] += xAdder;
    this.updateBoard(locations, now);
  };

  ground = () => {
    let result = undefined;
    do {
      result = this.move(1, 0, true);
    } while (!result);
  };

  lineCheck = () => {
    let line = 0;
    for (let y = 2; y < HDIV; y++) {
      let isFull = true;
      for (let x = 0; x < DIV; x++) {
        if (this.board[y][x] == 0) {
          isFull = false;
          break;
        }
      }
      if (isFull) {
        this.board.splice(y, 1);
        let row = [];
        for (let j = 0; j < DIV; j++) {
          row.push(0);
        }
        this.board = [row, ...this.board];
        line++;
      }
    }
    this.score += (line * 10) ** 2;
    score.textContent = this.score;
    this.next();
  };

  next = (calledByHold) => {
    if (!this.isPlaying) return;
    if (calledByHold && this.holded) this.now = this.holded;
    else {
      this.now = this.queue[0];
      this.queue.splice(0, 1);
    }
    this.isHoldUsed = false;
    this.locations = [];
    this.direction = 0;
    this.timer = Date.now();
    this.baseLoc = [2, 4];
    this.moveLimit = false;
    this.move(0, 0);

    if (this.queue.length <= 1) this.randomQueue();
    drawNext();
  };

  hold = () => {
    if (this.isHoldUsed) return;

    const nowBackup = this.now;

    this.updateBoard([], 0);

    this.next(true);
    this.holded = nowBackup;
    this.isHoldUsed = true;
    drawHold();
  };

  updateBoard = (locations, now) => {
    const prevLocations = this.locations;
    for (let block of prevLocations) {
      if (block[0] >= 0) this.board[block[0]][block[1]] = 0;
    }

    this.locations = locations;
    for (let block of locations) {
      if (block[0] >= 0) this.board[block[0]][block[1]] = now;
    }
  };

  gameOver = () => {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    ctx.beginPath();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#000";
    ctx.rect(0, 0, WIDTH, HEIGHT);
    ctx.fill();
    ctx.beginPath();
    ctx.globalAlpha = 1;
    ctx.font = "24px Arial";
    ctx.fillText("Game Over", WIDTH / 2, HEIGHT / 2);
    newGameButton.disabled = true;
    const name = prompt("기록을 저장하기 위해 이름을 알려주세요.\n전에 사용한 이름을 입력하면 점수만 갱신됩니다.");
    if (name != null) {
      let rankings = localStorage["tetrisRanking1024"] || "{}";
      rankings = JSON.parse(rankings);
      if (rankings[name]) {
        rankings[name] = Math.max(this.score, rankings[name]);
      } else {
        rankings[name] = this.score;
      }
      localStorage["tetrisRanking1024"] = JSON.stringify(rankings);
    }
  };
}

const drawBase = () => {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#111";
  for (let i = 1; i < DIV; i++) {
    ctx.moveTo(blockWidth * i, 0);
    ctx.lineTo(blockWidth * i, HEIGHT);
  }
  for (let i = 1; i < HDIV - 2; i++) {
    ctx.moveTo(0, blockWidth * i);
    ctx.lineTo(WIDTH, blockWidth * i);
  }
  ctx.stroke();
};

const loop = () => {
  if (!game.isPlaying) return;
  if (game.isPaused) return requestAnimationFrame(loop);
  drawBase();

  for (let x = 0; x < DIV; x++) {
    for (let y = 0; y < HDIV; y++) {
      const target = game.board[y][x];
      if (target == 0) continue;
      ctx.beginPath();
      ctx.fillStyle = colorChip[target];
      ctx.roundRect(blockWidth * x + 1, blockWidth * (y - 2) + 1, blockWidth - 2, blockWidth - 2, 3);
      ctx.fill();
    }
  }

  if (Date.now() - game.timer >= game.speed) {
    game.move(1, 0);
  }

  if (Date.now() - game.tickTimer >= TICK) {
    game.tickTimer = Date.now();
    keyCheck();
  }

  requestAnimationFrame(loop);
};

const keyCheck = () => {
  if (keyStatus["ArrowDown"]) {
    game.move(1, 0);
  }
  if (Date.now() - keyStatus["ArrowLeft"] >= DEBOUNCE) game.move(0, -1);
  if (Date.now() - keyStatus["ArrowRight"] >= DEBOUNCE) game.move(0, 1);
};

const drawNext = () => {
  nextCtx.clearRect(0, 0, INFOWIDTH, INFOWIDTH);
  nextCtx.beginPath();

  for (let x = 0; x < INFODIV; x++) {
    for (let y = 0; y < INFODIV; y++) {
      const target = infoBoard[game.queue[0]][y][x];
      if (target == 0) continue;
      nextCtx.beginPath();
      nextCtx.fillStyle = colorChip[target];
      nextCtx.roundRect(infoBlockWidth * x + 1, infoBlockWidth * y + 1, infoBlockWidth - 2, infoBlockWidth - 2, 2);
      nextCtx.fill();
    }
  }
};

const drawHold = () => {
  holdCtx.clearRect(0, 0, INFOWIDTH, INFOWIDTH);
  holdCtx.beginPath();

  for (let x = 0; x < INFODIV; x++) {
    for (let y = 0; y < INFODIV; y++) {
      const target = infoBoard[game.holded][y][x];
      if (target == 0) continue;
      let xAdder = 1;
      if (target == 2 || target == 6 || target == 7) xAdder = 2;
      holdCtx.beginPath();
      holdCtx.fillStyle = colorChip[target];
      holdCtx.roundRect(infoBlockWidth * (x + xAdder) + 1, infoBlockWidth * y + 1, infoBlockWidth - 2, infoBlockWidth - 2, 2);
      holdCtx.fill();
    }
  }
};

const newGame = () => {
  if (!game || game.isPlaying == false) {
    newGameButton.disabled = true;
    score.textContent = 0;
    drawBase();
    game = new Session();
    for (let i = 0; i < HDIV; i++) {
      let row = [];
      for (let j = 0; j < DIV; j++) {
        row.push(0);
      }
      game.board.push(row);
    }
    ctx.font = "16px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("준비", WIDTH / 2, HEIGHT / 2);
    setTimeout(() => {
      drawBase();
      ctx.font = "24px Arial";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText("시작!", WIDTH / 2, HEIGHT / 2);
      game.randomQueue();
      setTimeout(() => {
        game.isPlaying = true;
        game.next();
        loop();
      }, 1000);
    }, 500);
  }
};

const toggleRank = () => {
  if (isRankOpen) {
    rankContainer.style.pointerEvents = "none";
    rankContainer.style.opacity = 0;
  } else {
    rankContainer.style.pointerEvents = "all";
    rankContainer.style.opacity = 1;
    let contents = "";
    if (localStorage["tetrisRanking1024"]) {
      const ranks = JSON.parse(localStorage["tetrisRanking1024"]);
      let rankArray = [];
      for (let name in ranks) {
        rankArray.push([name, ranks[name]]);
      }
      rankArray.sort((a, b) => {
        return b[1] - a[1];
      });
      for (let i in rankArray) {
        contents += `<div class="rankElement">
                      <b>${`${Number(i) + 1}`.padStart(2, "0")}.</b>
                      <span>${rankArray[i][0]}</span>
                      <span>${rankArray[i][1].toLocaleString("ko-KR")}</span>
                    </div>`;
      }
    } else {
      contents = "기록이 없습니다. 최초가 되어보세요!";
    }
    rankContents.innerHTML = contents;
  }
  isRankOpen = !isRankOpen;
};

window.onload = () => {
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  holdCanvas.width = INFOWIDTH;
  holdCanvas.height = INFOWIDTH;
  nextCanvas.width = INFOWIDTH;
  nextCanvas.height = INFOWIDTH;
  drawBase();
};

document.addEventListener("keydown", (e) => {
  if (game && game.isPlaying && !keyStatus[e.code]) {
    keyStatus[e.code] = Date.now();
    if (e.code == "ArrowLeft") game.move(0, -1);
    if (e.code == "ArrowRight") game.move(0, 1);
    if (e.code == "KeyZ") game.rotate(-1);
    if (e.code == "KeyX") game.rotate(1);
    if (e.code == "KeyC") game.hold();
    if (e.code == "Space") game.ground();
  }
  if (e.code == "Escape" && isRankOpen) toggleRank();
});

document.addEventListener("keyup", (e) => {
  if (game && game.isPlaying) keyStatus[e.code] = undefined;
});

window.addEventListener("blur", () => {
  if (game && game.isPlaying) {
    game.isPaused = true;
    ctx.beginPath();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#000";
    ctx.rect(0, 0, WIDTH, HEIGHT);
    ctx.fill();
    ctx.beginPath();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff";
    ctx.font = "24px Arial";
    ctx.fillText("Paused", WIDTH / 2, HEIGHT / 2);
  }
});

window.addEventListener("focus", () => {
  if (game && game.isPlaying) game.isPaused = false;
});
