import type { AlgorithmName, MazeName, ToolName } from './types'

export const ALGORITHMS: AlgorithmName[] = ['Dijkstra', 'A*', 'BFS', 'Greedy Best-First']

export const MAZES: MazeName[] = ['Random Walls', 'Recursive Division', 'Staircase', 'Weighted Terrain']

export const GRID_SIZES = ['15 × 25', '20 × 30', '25 × 35', '30 × 45', '40 × 60'] as const

export const TOOLS: { key: ToolName; label: string }[] = [
  { key: 'wall', label: 'Wall' },
  { key: 'erase', label: 'Eraser' },
  { key: 'weight', label: 'Weight' },
  { key: 'start', label: 'Move Start' },
  { key: 'target', label: 'Move Target' },
]

export const DEFAULTS = {
  algorithm: 'Dijkstra' as AlgorithmName,
  maze: 'Random Walls' as MazeName,
  gridSize: '25 × 35',
  weight: 5,
  speed: 90,
  density: 28,
  tool: 'wall' as ToolName,
  rows: 25,
  cols: 35,
}

export const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

export const COLORS = {
  gridBackground: '#0d1426',
  gridLine: '#1d2944',
  empty: '#111a30',
  wall: '#bcc7da',
  weight: '#7b5f35',
  frontier: '#315d8f',
  visited: '#244664',
  current: '#ffd166',
  start: '#43d17c',
  target: '#ff6384',
  path: '#f8e16c',
  pathEdge: '#fff3a1',
  text: '#e8edf7',
}
