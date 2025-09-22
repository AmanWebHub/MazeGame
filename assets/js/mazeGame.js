const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let maze = [];
let cellSize = 20;
let rows, cols;
let player = {x:0, y:0};
let exit = {x:0, y:0};
let currentDifficulty = "easy";

// Load sprites
const mouseImg = new Image();
mouseImg.src = "assets/img/mouse.png";

const cheeseImg = new Image();
cheeseImg.src = "assets/img/cheese.png";

// Start game based on difficulty
function startGame(difficulty) {
  currentDifficulty = difficulty;

  if (difficulty === "easy") { rows = cols = 10; }
  if (difficulty === "medium") { rows = cols = 20; }
  if (difficulty === "hard") { rows = cols = 30; }

  canvas.width = cols * cellSize;
  canvas.height = rows * cellSize;

  maze = generateMaze(rows, cols);

  // Random start and exit positions
  player = randomCell();
  exit = randomCellFarFrom(player);

  drawMaze();
  drawPlayer();
}

function restartGame() {
  startGame(currentDifficulty);
}

// Pick a random cell
function randomCell() {
  return {
    x: Math.floor(Math.random() * cols),
    y: Math.floor(Math.random() * rows)
  };
}

// Pick a random cell far enough from start
function randomCellFarFrom(start) {
  let cell, dist;
  do {
    cell = randomCell();
    let dx = cell.x - start.x;
    let dy = cell.y - start.y;
    dist = Math.abs(dx) + Math.abs(dy); // Manhattan distance
  } while (dist < Math.floor(Math.max(rows, cols) / 2));
  return cell;
}

// Maze cell structure
class Cell {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.walls = {top:true, right:true, bottom:true, left:true};
    this.visited = false;
  }
}

// Recursive backtracking maze generator
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
  if (y > 0 && !grid[y-1][x].visited) neighbors.push(grid[y-1][x]);      // top
  if (x < cols-1 && !grid[y][x+1].visited) neighbors.push(grid[y][x+1]); // right
  if (y < rows-1 && !grid[y+1][x].visited) neighbors.push(grid[y+1][x]); // bottom
  if (x > 0 && !grid[y][x-1].visited) neighbors.push(grid[y][x-1]);      // left
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

// Draw maze
function drawMaze() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;
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

  // Draw exit (cheese if available)
  if (cheeseImg.complete && cheeseImg.naturalWidth !== 0) {
    ctx.drawImage(
      cheeseImg,
      exit.x*cellSize+4,
      exit.y*cellSize+4,
      cellSize-8,
      cellSize-8
    );
  } else {
    ctx.fillStyle = "green";
    ctx.fillRect(exit.x*cellSize+4, exit.y*cellSize+4, cellSize-8, cellSize-8);
  }
}

function drawLine(x1,y1,x2,y2) {
  ctx.beginPath();
  ctx.moveTo(x1,y1);
  ctx.lineTo(x2,y2);
  ctx.stroke();
}

// Draw player (mouse sprite, fallback red circle)
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

// Movement
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
    if (player.x === exit.x && player.y === exit.y) {
      setTimeout(()=>alert("🎉 You win!"), 50);
    }
  }
});
