const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let baseCellSize = 40;
let cellSize = baseCellSize;
let rows, cols;
let player = {x:0, y:0};
let exit = {x:0, y:0};
let currentDifficulty = "easy";

let startTime = null;
let timerInterval = null;
let timerStarted = false;

let animating = false;
let animX = 0;
let animY = 0;
const animSpeed = 0.2;

let debugMode = true;

// Player direction
let playerDirection = "right";

// Adjust cell size based on window size and difficulty
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

// Start game
function startGame(difficulty) {
  currentDifficulty = difficulty;
  adjustCellSize(difficulty);

  maze = generateMaze(rows, cols);

  player = randomCell();
  exit = randomCellFarFrom(player);

  animX = player.x;
  animY = player.y;
  playerDirection = "right";

  drawMaze();
  drawPlayer();

  if (timerInterval) clearInterval(timerInterval);
  timerStarted = false;
  document.getElementById("timer").textContent = "⏱ 0:00";
}

// Restart current game
function restartGame() {
  startGame(currentDifficulty);
}

// Random cell
function randomCell() {
  return { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
}

// Random cell far enough from start
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

// Maze cell class
class Cell {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.walls = {top:true, right:true, bottom:true, left:true};
    this.visited = false;
  }
}

// Generate maze using recursive backtracker
function generateMaze(rows, cols) {
  let grid = [];
  for (let y=0; y<rows; y++) {
    let row = [];
    for (let x=0; x<cols; x++) row.push(new Cell(x,y));
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
    } else break;
  }
  return grid;
}

// Get unvisited neighbors
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

// Remove walls between two cells
function removeWalls(a, b) {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  if (dx === 1) { a.walls.right = false; b.walls.left = false; }
  else if (dx === -1) { a.walls.left = false; b.walls.right = false; }
  else if (dy === 1) { a.walls.bottom = false; b.walls.top = false; }
  else if (dy === -1) { a.walls.top = false; b.walls.bottom = false; }
}

// Solve maze for debug path
function solveMaze() {
  let queue = [[player]];
  let visited = new Set([`${player.x},${player.y}`]);

  while (queue.length > 0) {
    let path = queue.shift();
    let cell = path[path.length-1];

    if (cell.x === exit.x && cell.y === exit.y) return path;

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

// Get movable neighbors (no walls)
function getMovableNeighbors(cell) {
  let neighbors = [];
  let c = maze[cell.y][cell.x];
  if (!c.walls.top) neighbors.push({x:cell.x, y:cell.y-1});
  if (!c.walls.right) neighbors.push({x:cell.x+1, y:cell.y});
  if (!c.walls.bottom) neighbors.push({x:cell.x, y:cell.y+1});
  if (!c.walls.left) neighbors.push({x:cell.x-1, y:cell.y});
  return neighbors;
}

// Draw the maze
function drawMaze() {
  ctx.fillStyle = "#4A90E2"; 
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.strokeStyle = "black";
  ctx.lineWidth = Math.max(2, Math.floor(cellSize / 10));
  for (let y=0; y<rows; y++) {
    for (let x=0; x<cols; x++) {
      let cell = maze[y][x];
      let px = x*cellSize;
      let py = y*cellSize;
      if (cell.walls.top) drawLine(px, py, px+cellSize, py);
      if (cell.walls.right) drawLine(px+cellSize, py, px+cellSize, py+cellSize);
      if (cell.walls.bottom) drawLine(px, py+cellSize, px+cellSize, py+cellSize);
      if (cell.walls.left) drawLine(px, py, px, py+cellSize);
    }
  }

  // DEBUG PATH
  if (debugMode) {
    let path = solveMaze();
    ctx.strokeStyle = "rgba(255,255,0,0.5)";
    ctx.lineWidth = Math.max(2, cellSize / 8);
    ctx.beginPath();
    for (let i=0;i<path.length;i++){
      let cx = path[i].x*cellSize+cellSize/2;
      let cy = path[i].y*cellSize+cellSize/2;
      if (i===0) ctx.moveTo(cx,cy);
      else ctx.lineTo(cx,cy);
    }
    ctx.stroke();
    
    // Draw dots at each path point
    for (let i=0;i<path.length;i++){
      let cx = path[i].x*cellSize+cellSize/2;
      let cy = path[i].y*cellSize+cellSize/2;
      ctx.fillStyle = i === 0 ? "green" : (i === path.length-1 ? "red" : "yellow");
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize/6, 0, Math.PI*2);
      ctx.fill();
    }
  }

  // Draw exit (cheese)
  ctx.fillStyle = "#FFD700";
  ctx.beginPath();
  const exitX = exit.x * cellSize + cellSize / 2;
  const exitY = exit.y * cellSize + cellSize / 2;
  const cheeseRadius = cellSize * 0.35;
  
  // Cheese wedge shape
  ctx.moveTo(exitX + cheeseRadius, exitY);
  ctx.arc(exitX, exitY, cheeseRadius, 0, Math.PI * 1.8, false);
  ctx.lineTo(exitX + cheeseRadius * 0.3, exitY - cheeseRadius * 0.3);
  ctx.lineTo(exitX + cheeseRadius, exitY);
  ctx.closePath();
  ctx.fill();
  
  // Cheese holes
  ctx.fillStyle = "#E67E22";
  ctx.beginPath();
  ctx.arc(exitX - cheeseRadius * 0.2, exitY - cheeseRadius * 0.1, cheeseRadius * 0.15, 0, Math.PI * 2);
  ctx.arc(exitX + cheeseRadius * 0.1, exitY + cheeseRadius * 0.2, cheeseRadius * 0.1, 0, Math.PI * 2);
  ctx.arc(exitX - cheeseRadius * 0.1, exitY + cheeseRadius * 0.15, cheeseRadius * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawLine(x1,y1,x2,y2){
  ctx.beginPath();
  ctx.moveTo(x1,y1);
  ctx.lineTo(x2,y2);
  ctx.stroke();
}

// Draw the player
function drawPlayer(){
  animX=player.x;
  animY=player.y;
  drawAnimatedPlayer();
}

// Draw a simple red arrow
function drawAnimatedPlayer(){
  const centerX = animX * cellSize + cellSize / 2;
  const centerY = animY * cellSize + cellSize / 2;
  const arrowSize = cellSize * 0.35;

  ctx.save();
  ctx.translate(centerX, centerY);

  // Rotate based on direction
  switch(playerDirection){
    case "up": ctx.rotate(-Math.PI / 2); break;
    case "down": ctx.rotate(Math.PI / 2); break;
    case "left": ctx.rotate(Math.PI); break;
    case "right": ctx.rotate(0); break;
  }

  // Simple red arrow - just a triangle
  ctx.fillStyle = "#FF0000";
  ctx.strokeStyle = "#CC0000";
  ctx.lineWidth = 2;
  
  // Draw arrow as a simple triangle
  ctx.beginPath();
  ctx.moveTo(arrowSize, 0);
  ctx.lineTo(-arrowSize, -arrowSize * 0.8);
  ctx.lineTo(-arrowSize, arrowSize * 0.8);
  ctx.closePath();
  
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

// Update timer display
function updateTimerDisplay(){
  if(!timerStarted) return;
  let elapsed = Math.floor((Date.now()-startTime)/1000);
  let minutes = Math.floor(elapsed/60);
  let seconds = elapsed%60;
  document.getElementById("timer").textContent = `⏱ ${minutes}:${seconds.toString().padStart(2,'0')}`;
}

// Keyboard input for movement
document.addEventListener("keydown", e=>{
  if(animating) return;

  if(!timerStarted && ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)){
    timerStarted=true;
    startTime=Date.now();
    timerInterval=setInterval(updateTimerDisplay,1000);
  }

  let cell = maze[player.y][player.x];
  let nx=player.x;
  let ny=player.y;

  switch(e.key){
    case "ArrowUp":
      if(!cell.walls.top) ny--;
      playerDirection="up";
      break;
    case "ArrowDown":
      if(!cell.walls.bottom) ny++;
      playerDirection="down";
      break;
    case "ArrowLeft":
      if(!cell.walls.left) nx--;
      playerDirection="left";
      break;
    case "ArrowRight":
      if(!cell.walls.right) nx++;
      playerDirection="right";
      break;
    case "d":
    case "D":
      // Toggle debug mode
      debugMode = !debugMode;
      drawMaze();
      drawPlayer();
      console.log("Debug mode:", debugMode);
      return;
  }

  if(nx!==player.x || ny!==player.y) animateMove(nx,ny);
});

// Animate movement
function animateMove(nx, ny){
  animating=true;
  const startX=animX;
  const startY=animY;
  const deltaX=nx-startX;
  const deltaY=ny-startY;

  function step(){
    animX += deltaX*animSpeed;
    animY += deltaY*animSpeed;
    drawMaze();
    drawAnimatedPlayer();

    if(Math.abs(animX-nx)<0.01 && Math.abs(animY-ny)<0.01){
      animX=nx; animY=ny;
      player.x=nx; player.y=ny;
      drawMaze(); drawPlayer();
      animating=false;

      if(player.x===exit.x && player.y===exit.y){
        clearInterval(timerInterval);
        timerStarted=false;
        let elapsed=Math.floor((Date.now()-startTime)/1000);
        let minutes=Math.floor(elapsed/60);
        let seconds=elapsed%60;
        alert(`🎉 You won in ${minutes}:${seconds.toString().padStart(2,'0')}!`);
        updateHighScore(elapsed);
        startGame(currentDifficulty);
      }
    } else requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// High score tracking
function updateHighScore(elapsed){
  let key=`highscore_${currentDifficulty}`;
  let prev = localStorage.getItem(key);
  if(!prev || elapsed < parseInt(prev)){
    localStorage.setItem(key,elapsed);
    alert(`🏆 New record for ${currentDifficulty} mode: ${elapsed} seconds!`);
  }
}

// Auto-start easy mode
window.onload = ()=>{ startGame("easy"); };