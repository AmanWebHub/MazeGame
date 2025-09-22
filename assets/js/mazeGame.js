const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Base cell size for visibility
let baseCellSize = 40;
let cellSize = baseCellSize;
let rows, cols;
let player = {x:0, y:0};
let exit = {x:0, y:0};
let currentDifficulty = "easy";

// Debug toggle
const DEBUG = true; // set false when done

// Load sprites
const mouseImg = new Image();
mouseImg.src = "assets/img/mouse.png";

const cheeseImg = new Image();
cheeseImg.src = "assets/img/cheese.png";

// Adjust cell size dynamically based on screen and difficulty
function adjustCellSize(difficulty) {
  let maxWidth = window.innerWidth - 40;  // padding
  let maxHeight = window.innerHeight - 150; // header + buttons

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

  // Random start and exit points
  player = randomCell();
  exit = randomCellFarFrom(player);

  drawMaze();
  drawPlayer();
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
  ctx.lineWidth = Math.max(2, Math.floor(cellSize / 10)); // dynamic thickness
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

// Draw player (mouse sprite or fallback red circle)
function drawPlayer() {
  if (mouseImg.complete && mouseImg.naturalWidth !== 0) {
    ctx.drawImage(
      mouseImg,
      player.x*cellSize+2,
      player.y*cellSize+2,
      cellSize-4,
      cellSize-4
    );
  } else {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(
      player.x*cellSize + cellSize/2,
      player.y*cellSize + cellSize/2,
      cellSize/3,
      0, Math.PI*2
    );
    ctx.fill();
  }
}

// Movement controls
document.addEventListener("keydown", e => {
  let cell = maze[player.y][player.x];
  let nx = player.x;
  let ny = player.y;

  if (e.key === "ArrowUp" && !cell.walls.top) ny--;
  if (e.key === "ArrowDown" && !cell.walls.bottom) ny++;
  if (e.key === "ArrowLeft" && !cell.walls.left) nx--;
  if (e.key === "ArrowRight" && !cell.walls.right) nx++;

  if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
    player.x = nx;
    player.y = ny;
    drawMaze();
    drawPlayer();

    // Win behavior
    if (player.x === exit.x && player.y === exit.y) {
      // Draw overlay message
     ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
ctx.fillRect(0, canvas.height/2 - 20, canvas.width, 40);
ctx.fillStyle = "white";
ctx.font = `${Math.floor(cellSize / 1.5)}px Arial`; // smaller font
ctx.textAlign = "center";
ctx.fillText("🎉 You won! Starting new game...", canvas.width/2, canvas.height/2 + 7);

      // Restart after short delay
      setTimeout(() => {
        startGame(currentDifficulty);
      }, 1500);
    }
  }
});

// Auto-start game in Easy mode
window.onload = () => {
  startGame("easy");
};
