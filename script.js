const gridEl = document.getElementById('grid');
const runBtn = document.getElementById('runBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const clearPathBtn = document.getElementById('clearPathBtn');
const randomWallsBtn = document.getElementById('randomWallsBtn');
const algoSelect = document.getElementById('algoSelect');
const speedInput = document.getElementById('speed');
const speedVal = document.getElementById('speedVal');
const rowsInput = document.getElementById('rows');
const exploredCountEl = document.getElementById('exploredCount');
const pathLenEl = document.getElementById('pathLen');

const modeBtns = {
  start: document.getElementById('modeStart'),
  end: document.getElementById('modeEnd'),
  wall: document.getElementById('modeWall'),
  erase: document.getElementById('modeErase')
};

let ROWS = 25, COLS = 25;
let grid = [];
let isRunning = false;
let stopRequested = false;
let currentMode = 'start';
let startNode = null;
let endNode = null;
let isMouseDown = false;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function initGrid() {
  if (isRunning) return;
  ROWS = parseInt(rowsInput.value);
  // Maintain square-ish cells based on container width
  const containerWidth = gridEl.clientWidth || 800;
  const containerHeight = gridEl.clientHeight || 600;
  COLS = Math.floor(containerWidth / (containerHeight / ROWS));
  
  gridEl.innerHTML = '';
  gridEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
  grid = [];

  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.addEventListener('mousedown', (e) => { e.preventDefault(); isMouseDown = true; handleInteraction(r, c); });
      cell.addEventListener('mouseenter', () => { if (isMouseDown) handleInteraction(r, c); });
      gridEl.appendChild(cell);
      row.push({ el: cell, r, c, type: 'empty', parent: null, g: Infinity, f: Infinity });
    }
    grid.push(row);
  }
  
  // Default positions
  setNode(grid[Math.floor(ROWS/2)][Math.floor(COLS/4)], 'start');
  setNode(grid[Math.floor(ROWS/2)][Math.floor(COLS*0.75)], 'end');
}

window.addEventListener('mouseup', () => isMouseDown = false);

function handleInteraction(r, c) {
  if (isRunning) return;
  const node = grid[r][c];
  if (currentMode === 'start') {
    if (startNode) setNode(startNode, 'empty');
    setNode(node, 'start');
  } else if (currentMode === 'end') {
    if (endNode) setNode(endNode, 'empty');
    setNode(node, 'end');
  } else if (currentMode === 'wall') {
    if (node !== startNode && node !== endNode) setNode(node, 'wall');
  } else if (currentMode === 'erase') {
    if (node !== startNode && node !== endNode) setNode(node, 'empty');
  }
}

function setNode(node, type) {
  if (!node) return;
  node.type = type;
  node.el.className = 'cell ' + type;
  if (type === 'start') startNode = node;
  if (type === 'end') endNode = node;
}

// Manhattan Distance Heuristic
const getH = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);

function getNeighbors(node) {
  const neighbors = [];
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  for (const [dr, dc] of dirs) {
    const nr = node.r + dr, nc = node.c + dc;
    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
      if (grid[nr][nc].type !== 'wall') neighbors.push(grid[nr][nc]);
    }
  }
  return neighbors;
}

// BFS Implementation: Explores layer by layer. Guaranteed shortest path.
async function runBFS() {
  const queue = [startNode];
  const visited = new Set([startNode]);
  let count = 0;

  while (queue.length && !stopRequested) {
    const node = queue.shift();
    if (node === endNode) return true;
    if (node !== startNode) setNode(node, 'visited');
    exploredCountEl.textContent = ++count;

    for (const neighbor of getNeighbors(node)) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        neighbor.parent = node;
        if (neighbor !== endNode) setNode(neighbor, 'frontier');
        queue.push(neighbor);
      }
    }
    await sleep(speedInput.value);
  }
  return false;
}

// A* Implementation: Heuristic search. Efficiently finds shortest path.
async function runAStar() {
  const openSet = [startNode];
  startNode.g = 0;
  startNode.f = getH(startNode, endNode);
  let count = 0;

  while (openSet.length && !stopRequested) {
    openSet.sort((a, b) => a.f - b.f);
    const node = openSet.shift();

    if (node === endNode) return true;
    if (node !== startNode) setNode(node, 'visited');
    exploredCountEl.textContent = ++count;

    for (const neighbor of getNeighbors(node)) {
      const tempG = node.g + 1;
      if (tempG < neighbor.g) {
        neighbor.parent = node;
        neighbor.g = tempG;
        neighbor.f = neighbor.g + getH(neighbor, endNode);
        if (!openSet.includes(neighbor)) {
          openSet.push(neighbor);
          if (neighbor !== endNode) setNode(neighbor, 'frontier');
        }
      }
    }
    await sleep(speedInput.value);
  }
  return false;
}

// Hill Climbing Implementation: Pure Greedy. 
// Moves only to the best immediate neighbor. No memory/backtracking.
async function runHillClimbing() {
  let current = startNode;
  const visited = new Set([startNode]);
  let count = 0;

  while (current !== endNode && !stopRequested) {
    if (current !== startNode) setNode(current, 'visited');
    exploredCountEl.textContent = ++count;

    let neighbors = getNeighbors(current).filter(n => !visited.has(n));
    if (neighbors.length === 0) break; // Trapped

    // Sort by heuristic only
    neighbors.sort((a, b) => getH(a, endNode) - getH(b, endNode));
    const next = neighbors[0];
    
    // Strict Hill Climbing: Only move if it's better or at least equal
    // Note: To see it "fail" or behave differently, we use strict greedy movement.
    next.parent = current;
    visited.add(next);
    current = next;

    await sleep(speedInput.value);
  }
  return current === endNode;
}

// DFS Implementation: Deep exploration. Path is rarely optimal.
async function runDFS() {
    const stack = [startNode];
    const visited = new Set();
    let count = 0;

    while (stack.length && !stopRequested) {
        const node = stack.pop();
        if (node === endNode) return true;
        
        if (!visited.has(node)) {
            visited.add(node);
            if (node !== startNode) setNode(node, 'visited');
            exploredCountEl.textContent = ++count;

            // Reverse neighbors to make the visual path more "DFS-like"
            const neighbors = getNeighbors(node).reverse();
            for (const n of neighbors) {
                if (!visited.has(n)) {
                    n.parent = node;
                    if (n !== endNode) setNode(n, 'frontier');
                    stack.push(n);
                }
            }
            await sleep(speedInput.value);
        }
    }
    return false;
}

runBtn.addEventListener('click', async () => {
  if (isRunning) return;
  isRunning = true; stopRequested = false;
  
  // Reset grid state for search
  grid.flat().forEach(n => {
    n.parent = null; n.g = Infinity; n.f = Infinity;
    if (['visited', 'frontier', 'path'].includes(n.type)) setNode(n, 'empty');
  });

  const algo = algoSelect.value;
  let found = false;

  if (algo === 'bfs') found = await runBFS();
  else if (algo === 'astar') found = await runAStar();
  else if (algo === 'hill') found = await runHillClimbing();
  else if (algo === 'dfs') found = await runDFS();

  if (found && !stopRequested) {
    let curr = endNode.parent;
    let pathCount = 0;
    while (curr && curr !== startNode) {
      setNode(curr, 'path');
      curr = curr.parent;
      pathCount++;
      await sleep(25);
    }
    pathLenEl.textContent = pathCount + 1;
  }
  isRunning = false;
});

stopBtn.addEventListener('click', () => stopRequested = true);
clearBtn.addEventListener('click', initGrid);
clearPathBtn.addEventListener('click', () => {
    grid.flat().forEach(n => {
        if (['visited', 'frontier', 'path'].includes(n.type)) setNode(n, 'empty');
        n.parent = null; n.g = Infinity; n.f = Infinity;
    });
    pathLenEl.textContent = '0'; exploredCountEl.textContent = '0';
});
randomWallsBtn.addEventListener('click', () => {
  if (isRunning) return;
  grid.flat().forEach(n => {
    if (n !== startNode && n !== endNode) setNode(n, Math.random() < 0.28 ? 'wall' : 'empty');
  });
});

Object.keys(modeBtns).forEach(m => {
  modeBtns[m].addEventListener('click', () => {
    Object.values(modeBtns).forEach(b => b.classList.remove('active'));
    modeBtns[m].classList.add('active');
    currentMode = m;
  });
});

speedInput.addEventListener('input', () => speedVal.textContent = speedInput.value);
rowsInput.addEventListener('change', initGrid);
window.addEventListener('resize', initGrid);
initGrid();