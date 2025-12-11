const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const WIDTH = canvas.width;
const OUTER_RADIUS = 20;
const MARGIN = 10;
const DEFAULT_COLOR_RGB = [250, 230, 170];

class GameSession {
  isPlaying = true
  row = 4
  board = [[0, 0, 0, 0],
           [0, 0, 0, 0],
           [0, 0, 0, 0],
           [0, 0, 0, 0]]
  score = 0
  animationQueue = [] // [{from: {x, y, scale}, to: {x, y, scale}, num: n}]
  animationStartTime = 0
  animationDuration = 100
}

let game = null;
let bestScore = 0;

const pushNext = (arr, adder) => {
  arr[0] += adder[0];
  arr[1] += adder[1];
  return game.board[arr[0]][arr[1]];
};

const move = (key) => {
  if (!game.isPlaying) return;
  game.animationQueue = [];
  
  // [y, x]
  let root = [[-1, 0], [0, -1], [-1, game.row - 1], [game.row - 1, -1]][key];
  const rootAdder = [[1, 0], [0, 1], [1, 0], [0, 1]][key];
  const searchAdder = [[0, 1], [1, 0], [0, -1], [-1, 0]][key];

  for (let i = 0; i < game.row; i++) {
    pushNext(root, rootAdder);
    let now = [root[0], root[1]];
    let nowValue = game.board[now[0]][now[1]];
    let search = [now[0], now[1]];

    if (nowValue != 0) {
      game.animationQueue.push({from: {y: now[0], x: now[1], scale: 1},
                                to: {y: now[0], x: now[1], scale: 1},
                                num: nowValue});
    }

    for (let j = 1; j < game.row; j++) {
      let searchValue = pushNext(search, searchAdder);
      if (searchValue != 0) {
        if (nowValue == searchValue) {
          game.animationQueue.push({from: {y: search[0], x: search[1], scale: 1},
                                    to: {y: now[0], x: now[1], scale: 1},
                                    num: game.board[search[0]][search[1]]});
          game.board[now[0]][now[1]] *= 2;
          game.board[search[0]][search[1]] = 0;
          nowValue = pushNext(now, searchAdder);
        } else if (nowValue == 0) {
          game.animationQueue.push({from: {y: search[0], x: search[1], scale: 1},
                                    to: {y: now[0], x: now[1], scale: 1},
                                    num: game.board[search[0]][search[1]]});
          game.board[now[0]][now[1]] = searchValue;
          game.board[search[0]][search[1]] = 0;
          nowValue = searchValue;
        } else {
          let isFound = false;

          while(JSON.stringify(now) != JSON.stringify(search)) {
            nowValue = pushNext(now, searchAdder);
            if (nowValue == 0) {
              isFound = true;
              game.animationQueue.push({from: {y: search[0], x: search[1], scale: 1},
                                        to: {y: now[0], x: now[1], scale: 1},
                                        num: game.board[search[0]][search[1]]});
              game.board[now[0]][now[1]] = searchValue;
              game.board[search[0]][search[1]] = 0;
              nowValue = searchValue;
              break;
            }
          }

          if (!isFound) {
            game.animationQueue.push({from: {y: search[0], x: search[1], scale: 1},
                                      to: {y: search[0], x: search[1], scale: 1},
                                      num: game.board[search[0]][search[1]]});
          }
        }
      }
    }
  }

  if (randomGen()) {
    game.animationStartTime = Date.now();
    draw();
  }
};

const gameOver = () => {
  game.isPlaying = false;
  ctx.beginPath();
  ctx.fillStyle = "#00000055";
  ctx.rect(0, 0, WIDTH, WIDTH);
  ctx.fill();
  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.font = '32px Arial';
  ctx.fillText("Game Over", WIDTH / 2, WIDTH / 2);
  
  if (bestScore < game.score) {
    const name = prompt("최고기록 달성! 닉네임을 입력하세요.");
    localStorage['best2048'] = game.score;
    localStorage['bestname2048'] = name;
    document.getElementById("best").innerText = `${game.score} (${name})`;
  }
};

const randomGen = () => {
  console.log("[randomGen] Called");
  let emptyCoords = [];

  for (let y = 0; y < game.row; y++) {
    for (let x = 0; x < game.row; x++) {
      if (game.board[y][x] == 0) emptyCoords.push([y, x]);
    }
  }

  if (emptyCoords.length == 0) {
    gameOver();
    return false;
  }

  const coord = emptyCoords[Math.floor(Math.random() * emptyCoords.length)];
  let random = Math.ceil(Math.random() * 10) == 10 ? 4 : 2;

  game.board[coord[0]][coord[1]] = random;
  game.score += random;
  game.animationQueue.push({from: {y: coord[0], x: coord[1], scale: 0},
                            to: {y: coord[0], x: coord[1], scale: 1},
                            num: random});
  document.getElementById("score").innerText = game.score;
  return true;
};

const drawBlock = (x, y, w, r, num, px) => {
  let rgb = JSON.parse(JSON.stringify(DEFAULT_COLOR_RGB));
  let numCalc = num;

  while (numCalc > 2) {
    if (rgb[2] <= 100) {
      rgb[0] -= 25;
      rgb[1] -= 10;
      rgb[2] -= 10;
    }
    rgb[1] -= 13;
    rgb[2] -= 7;
    numCalc /= 2;
  }

  ctx.beginPath();
  ctx.fillStyle = `rgb(${rgb.join(',')})`;
  ctx.roundRect(x, y, w, w, r);
  ctx.fill();
  ctx.font = `${px}px Eurostile`;
  ctx.fillStyle = num >= 2048 ? "#fff" : "#000";
  ctx.fillText(num, x + (w / 2), y + (w / 2), w);
};

const draw = () => {
  if (!game.isPlaying) return;
  ctx.clearRect(0, 0, WIDTH, WIDTH);

  const blockWidth = (WIDTH - (MARGIN * (game.row + 1))) / game.row;
  const animationEnd = game.animationStartTime + game.animationDuration;

  if (animationEnd > Date.now()) {
    const queue = game.animationQueue;
    const percent = 1 - ((animationEnd - Date.now()) / game.animationDuration);

    for (let anim of queue) {
      const scalePercent = (anim.from.scale + (anim.to.scale - anim.from.scale) * percent);
      const x = anim.from.x + (anim.to.x - anim.from.x) * percent;
      const y = anim.from.y + (anim.to.y - anim.from.y) * percent;
      const width = scalePercent * blockWidth;
      const drawX = (blockWidth + MARGIN) * x + MARGIN + (blockWidth - width) / 2;
      const drawY = (blockWidth + MARGIN) * y + MARGIN + (blockWidth - width) / 2;

      drawBlock(drawX, drawY, width, OUTER_RADIUS - MARGIN, anim.num, 32 * scalePercent);
    }
    requestAnimationFrame(draw);
  } else {
    for (let y = 0; y < game.row; y++) {
      for (let x = 0; x < game.row; x++) {
        if (game.board[y][x] != 0) {
          const drawX = (blockWidth + MARGIN) * x + MARGIN;
          const drawY = (blockWidth + MARGIN) * y + MARGIN;
          drawBlock(drawX, drawY, blockWidth, OUTER_RADIUS - MARGIN, game.board[y][x], 32);
        }
      }
    }
  }
};

document.addEventListener("keydown", e => {
  if (game == null) {
    game = new GameSession();
    for (let i = 0; i <= 1; i++) randomGen();
    game.animationStartTime = Date.now();
    draw();
    return;
  }

  const key = ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"].indexOf(e.code);

  if (key != -1) {
    move(key);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  if (localStorage['best2048'] != undefined) {
    bestScore = Number(localStorage['best2048']);
    const bestName = localStorage['bestname2048'];
    document.getElementById("best").innerText = `${bestScore} (${bestName})`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '16px Arial';
  ctx.fillText("Press Any Key", WIDTH / 2, WIDTH / 2);
});