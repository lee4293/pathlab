# PathLab

PathLab is an interactive pathfinding laboratory for visualizing how Dijkstra, A*, BFS, and Greedy Best-First Search navigate configurable grids, weighted terrain, and generated mazes.

## How to Use

### Step 1: Install Node.js

1. Install Node.js 20.19+ or 22.12+.
2. Verify the installation:

```bash
node --version
npm --version
```

### Step 2: Download the Application

1. Download or clone this repository.
2. Open a terminal in the PathLab project folder.
3. Install the dependencies:

```bash
npm install
```

### Step 3: Run the Application

Start the development server:

```bash
npm run dev
```

Open the local URL shown by Vite in your browser.

## Production Build

Create a production build with:

```bash
npm run build
```

Preview the production build locally with:

```bash
npm run preview
```

## Controls

- Choose Dijkstra, A*, BFS, or Greedy Best-First Search.
- Paint walls, erase cells, add weighted terrain, or explicitly move the start and target.
- Configure weight cost, maze type, maze density, board size, and animation speed.
- Generate Random Walls, Recursive Division, Staircase, or Weighted Terrain boards.
- Use Run, Pause/Resume, Step Back, Step Forward, and Reset to inspect the search process.
- Right-click a non-endpoint cell to erase it quickly.
- Open Guide inside PathLab for explanations of every control, algorithm, maze type, weights, metrics, and no-solution cases.

## Keyboard Shortcuts

- `Space`: Run or pause/resume
- `N`: Step forward
- `B`: Step backward
- `R`: Reset PathLab to defaults
