export type Cell = { row: number; col: number }

export type CellKind = 'empty' | 'wall' | 'weight'

export type GridCell = {
  kind: CellKind
  weight: number
}

export type Grid = GridCell[][]

export type AlgorithmName = 'Dijkstra' | 'A*' | 'BFS' | 'Greedy Best-First'

export type MazeName = 'Random Walls' | 'Recursive Division' | 'Staircase' | 'Weighted Terrain'

export type ToolName = 'wall' | 'erase' | 'weight' | 'start' | 'target'

export type SearchEventKind = 'frontier' | 'visit' | 'path_start' | 'path' | 'done'

export type SearchEvent = {
  kind: SearchEventKind
  cell?: Cell
  value?: number
}

export type VisualState = {
  frontier: Set<string>
  visited: Set<string>
  current: string | null
  path: string[]
  distanceLabels: Map<string, number>
  pathCost: number | null
  runtimeMs: number | null
  status: string
  searchComplete: boolean
  foundPath: boolean
}

export type UndoPatch = {
  event: SearchEvent
  current: string | null
  pathLength: number
  pathCost: number | null
  runtimeMs: number | null
  status: string
  searchComplete: boolean
  foundPath: boolean
  frontierHad?: boolean
  visitedHad?: boolean
  distanceHad?: boolean
  distanceValue?: number
}
