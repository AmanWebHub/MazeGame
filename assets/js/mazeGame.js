const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Base cell size for visibility
let baseCellSize = 40;
let cellSize = baseCellSize;
let rows, cols;
let player = {x:0, y:0};
let exit = {x:0, y:0};
let currentDifficulty = "easy";

// Timer variables
let startTime = null;
let timerInterval = null;
let timerStarted = false;

// Animation variables
let animating = false;
let animX = 0;
let animY = 0;
const animSpeed = 0.2; // fraction per frame

// Debug toggle
const DEBUG = true; // set false when done

// Load sprites
const mouseImg = new Image();
mouseImg.src = "assets/img/mouse.png";

const cheeseImg = new Image();
cheeseImg.src = "assets/img/cheese.png";

// Adjust cell size dynamically based on screen and difficulty
function adjustCellSize(difficulty) {
  let maxWidth = window.innerWidth - 40;
  let maxHeight = window.innerHeight - 150;

  if (difficulty === "easy") { rows = cols = 10; }
  if (difficulty === "medium") { rows = cols = 20; }
  if (difficulty === "hard") { rows = cols = 30; }

  let sizeX = Math.floor(maxWidth / cols);
  let sizeY = Math.floor(maxHeight / rows);
  cellSize = Math.min(baseCellSize, sizeX, sizeY);

  canvas.width = cols * cellSize;
  canvas.height = rows * cellSize;
}

// Start game based on difficulty
function startGame(difficulty) {
  currentDifficulty = difficulty;
  adjustCellSize(difficulty);

  maze = generateMaze(rows, cols);

  player = randomCell();
  exit = randomCellFarFrom(player);

  animX = player.x;
  animY = player.y;

  drawMaze();
  drawPlayer();

  // Reset timer
  if (timerInterval) clearInterval(timerInterval);
  timerStarted = false;
  document.getElementById("timer").textContent = "⏱ 0:00";
}

function restartGame() {
  startGame(currentDifficulty);
}

// Random cell
function randomCell() {
  return {
    x: Math.floor(Math.random() * cols),
    y: Math.floor(Math.random() * rows)
  };
}

// Random cell far from start
function randomCellFarFrom(start) {
  let cell, dist;
  do {
    cell = randomCell();
    let dx = cell.x - start.x;
    let dy = cell.y - start.y;
    dist = Math.abs(dx) + Math.abs(dy);
  } while (dist < Math.floor(Math.max(rows, cols) / 2));
  return cell;
}

// Maze cell
class Cell {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.walls = {top:true, right:true, bottom:true, left:true};
    this.visited = false;
  }
}

// Maze generator (recursive backtracking)
function generateMaze(rows, cols) {
  let grid = [];
  for (let y=0; y<rows; y++) {
    let row = [];
    for (let x=0; x<cols; x++) {
      row.push(new Cell(x,y));
    }
    grid.push(row);
  }

  let stack = [];
  let current = grid[0][0];
  current.visited = true;

  while (true) {
    let next = getUnvisitedNeighbor(current, grid);
    if (next) {
      stack.push(current);
      removeWalls(current, next);
      current = next;
      current.visited = true;
    } else if (stack.length > 0) {
      current = stack.pop();
    } else {
      break;
    }
  }
  return grid;
}

function getUnvisitedNeighbor(cell, grid) {
  let neighbors = [];
  let {x,y} = cell;
  if (y > 0 && !grid[y-1][x].visited) neighbors.push(grid[y-1][x]);
  if (x < cols-1 && !grid[y][x+1].visited) neighbors.push(grid[y][x+1]);
  if (y < rows-1 && !grid[y+1][x].visited) neighbors.push(grid[y+1][x]);
  if (x > 0 && !grid[y][x-1].visited) neighbors.push(grid[y][x-1]);
  if (neighbors.length === 0) return undefined;
  return neighbors[Math.floor(Math.random() * neighbors.length)];
}

function removeWalls(a, b) {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  if (dx === 1) { a.walls.right = false; b.walls.left = false; }
  else if (dx === -1) { a.walls.left = false; b.walls.right = false; }
  else if (dy === 1) { a.walls.bottom = false; b.walls.top = false; }
  else if (dy === -1) { a.walls.top = false; b.walls.bottom = false; }
}

// Solve maze (BFS) for debug
function solveMaze() {
  let queue = [[player]];
  let visited = new Set([`${player.x},${player.y}`]);

  while (queue.length > 0) {
    let path = queue.shift();
    let cell = path[path.length - 1];

    if (cell.x === exit.x && cell.y === exit.y) {
      return path;
    }

    let neighbors = getMovableNeighbors(cell);
    for (let n of neighbors) {
      let key = `${n.x},${n.y}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push([...path, n]);
      }
    }
  }
  return [];
}

function getMovableNeighbors(cell) {
  let neighbors = [];
  let c = maze[cell.y][cell.x];
  if (!c.walls.top) neighbors.push({x:cell.x, y:cell.y-1});
  if (!c.walls.right) neighbors.push({x:cell.x+1, y:cell.y});
  if (!c.walls.bottom) neighbors.push({x:cell.x, y:cell.y+1});
  if (!c.walls.left) neighbors.push({x:cell.x-1, y:cell.y});
  return neighbors;
}

// Draw maze
function drawMaze() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle = "black";
  ctx.lineWidth = Math.max(2, Math.floor(cellSize / 10));
  for (let y=0; y<rows; y++) {
    for (let x=0; x<cols; x++) {
      let cell = maze[y][x];
      let px = x * cellSize;
      let py = y * cellSize;
      if (cell.walls.top) drawLine(px, py, px+cellSize, py);
      if (cell.walls.right) drawLine(px+cellSize, py, px+cellSize, py+cellSize);
      if (cell.walls.bottom) drawLine(px, py+cellSize, px+cellSize, py+cellSize);
      if (cell.walls.left) drawLine(px, py, px, py+cellSize);
    }
  }

  // Debug: show solution path
  if (DEBUG) {
    let path = solveMaze();
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i=0; i<path.length; i++) {
      let cx = path[i].x * cellSize + cellSize/2;
      let cy = path[i].y * cellSize + cellSize/2;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  // Draw exit (cheese)
  if (cheeseImg.complete && cheeseImg.naturalWidth !== 0) {
    ctx.drawImage(
      cheeseImg,
      exit.x*cellSize+2,
      exit.y*cellSize+2,
      cellSize-4,
      cellSize-4
    );
  } else {
    ctx.fillStyle = "green";
    ctx.fillRect(exit.x*cellSize+2, exit.y*cellSize+2, cellSize-4, cellSize-4);
  }
}

function drawLine(x1,y1,x2,y2) {
  ctx.beginPath();
  ctx.moveTo(x1,y1);
  ctx.lineTo(x2,y2);
  ctx.stroke();
}

// Draw player (for initial placement)
function drawPlayer() {
  animX = player.x;
  animY = player.y;
  drawAnimatedPlayer();
}

// Draw player at animation position
function drawAnimatedPlayer() {
  if (mouseImg.complete && mouseImg.naturalWidth !== 0) {
    ctx.drawImage(
      mouseImg,
      animX*cellSize+2,
      animY*cellSize+2,
      cellSize-4,
      cellSize-4
    );
  } else {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(
      animX*cellSize + cellSize/2,
      animY*cellSize + cellSize/2,
      cellSize/3,
      0, Math.PI*2
    );
    ctx.fill();
  }
}

// Timer display
function updateTimerDisplay() {
  if (!timerStarted) return;
  let elapsed = Math.floor((Date.now() - startTime) / 1000);
  let minutes = Math.floor(elapsed / 60);
  let seconds = elapsed % 60;
  document.getElementById("timer").textContent = `⏱ ${minutes}:${seconds.toString().padStart(2,'0')}`;
}

// Movement & animation
document.addEventListener("keydown", e => {
  if (animating) return;

  // Start timer on first arrow key press
  if (!timerStarted && ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
    timerStarted = true;
    startTime = Date.now();
    timerInterval = setInterval(updateTimerDisplay, 1000);
  }

  let cell = maze[player.y][player.x];
  let nx = player.x;
  let ny = player.y;

  if (e.key === "ArrowUp" && !cell.walls.top) ny--;
  if (e.key === "ArrowDown" && !cell.walls.bottom) ny++;
  if (e.key === "ArrowLeft" && !cell.walls.left) nx--;
  if (e.key === "ArrowRight" && !cell.walls.right) nx++;

  if (nx !== player.x || ny !== player.y) {
    animateMove(nx, ny);
  }
});

function animateMove(nx, ny) {
  animating = true;
  const startX = animX;
  const startY = animY;
  const deltaX = nx - startX;
  const deltaY = ny - startY;

  function step() {
    animX += deltaX * animSpeed;
    animY += deltaY * animSpeed;
    drawMaze();
    drawAnimatedPlayer();

    if (Math.abs(animX - nx) < 0.01 && Math.abs(animY - ny) < 0.01) {
      animX = nx;
      animY = ny;
      player.x = nx;
      player.y = ny;
      drawMaze();
      drawPlayer();
      animating = false;

      // Check win
      if (player.x === exit.x && player.y === exit.y) {
        clearInterval(timerInterval);
        timerStarted = false;
        let elapsed = Math.floor((Date.now() - startTime) / 1000);
        let minutes = Math.floor(elapsed / 60);
        let seconds = elapsed % 60;

        // Show alert for simplicity
        alert(`🎉 You won in ${minutes}:${seconds.toString().padStart(2,'0')}!`);
        startGame(currentDifficulty);
      }
    } else {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

// Auto-start Easy mode
window.onload = () => {
  startGame("easy");
};
