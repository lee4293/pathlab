import { DIRS } from './constants'
import { sameCell } from './grid'
import type { AlgorithmName, Cell, Grid, SearchEvent } from './types'

class MinHeap<T> {
  private data: T[] = []
  private compare: (a: T, b: T) => number

  constructor(compare: (a: T, b: T) => number) {
    this.compare = compare
  }

  get size(): number {
    return this.data.length
  }

  push(value: T): void {
    this.data.push(value)
    let index = this.data.length - 1
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2)
      if (this.compare(this.data[index], this.data[parent]) >= 0) break
      ;[this.data[index], this.data[parent]] = [this.data[parent], this.data[index]]
      index = parent
    }
  }

  pop(): T | undefined {
    if (this.data.length === 0) return undefined
    const root = this.data[0]
    const last = this.data.pop()
    if (this.data.length > 0 && last !== undefined) {
      this.data[0] = last
      let index = 0
      while (true) {
        const left = index * 2 + 1
        const right = left + 1
        let smallest = index
        if (left < this.data.length && this.compare(this.data[left], this.data[smallest]) < 0) smallest = left
        if (right < this.data.length && this.compare(this.data[right], this.data[smallest]) < 0) smallest = right
        if (smallest === index) break
        ;[this.data[index], this.data[smallest]] = [this.data[smallest], this.data[index]]
        index = smallest
      }
    }
    return root
  }
}

function id(cell: Cell, cols: number): number {
  return cell.row * cols + cell.col
}

function fromId(value: number, cols: number): Cell {
  return { row: Math.floor(value / cols), col: value % cols }
}

function neighbors(grid: Grid, cell: Cell): Cell[] {
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  const result: Cell[] = []
  for (const [dr, dc] of DIRS) {
    const row = cell.row + dr
    const col = cell.col + dc
    if (row >= 0 && row < rows && col >= 0 && col < cols && grid[row][col].kind !== 'wall') {
      result.push({ row, col })
    }
  }
  return result
}

function stepCost(grid: Grid, cell: Cell): number {
  const current = grid[cell.row][cell.col]
  return current.kind === 'weight' ? current.weight : 1
}

function heuristic(a: Cell, b: Cell): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col)
}

function reconstruct(prev: Int32Array, start: Cell, target: Cell, cols: number): Cell[] {
  const startId = id(start, cols)
  const targetId = id(target, cols)
  if (startId === targetId) return [start]
  if (prev[targetId] < 0) return []
  const path: Cell[] = []
  let current = targetId
  while (current >= 0) {
    path.push(fromId(current, cols))
    if (current === startId) break
    current = prev[current]
  }
  if (path[path.length - 1] && !sameCell(path[path.length - 1], start)) return []
  path.reverse()
  return path
}

function appendPathEvents(events: SearchEvent[], path: Cell[], cost: number): void {
  if (path.length > 0) {
    events.push({ kind: 'path_start', value: cost })
    for (const cell of path) events.push({ kind: 'path', cell })
  }
  events.push({ kind: 'done', value: cost })
}

function dijkstra(grid: Grid, start: Cell, target: Cell): SearchEvent[] {
  const rows = grid.length
  const cols = grid[0].length
  const total = rows * cols
  const dist = new Float64Array(total)
  dist.fill(Number.POSITIVE_INFINITY)
  const prev = new Int32Array(total)
  prev.fill(-1)
  const settled = new Uint8Array(total)
  const startId = id(start, cols)
  const targetId = id(target, cols)
  dist[startId] = 0
  const heap = new MinHeap<[number, number]>((a, b) => a[0] - b[0] || a[1] - b[1])
  heap.push([0, startId])
  const events: SearchEvent[] = [{ kind: 'frontier', cell: start, value: 0 }]

  while (heap.size > 0) {
    const item = heap.pop()
    if (!item) break
    const [currentDistance, currentId] = item
    if (settled[currentId]) continue
    settled[currentId] = 1
    const current = fromId(currentId, cols)
    events.push({ kind: 'visit', cell: current, value: currentDistance })
    if (currentId === targetId) break

    for (const next of neighbors(grid, current)) {
      const nextId = id(next, cols)
      const nextDistance = currentDistance + stepCost(grid, next)
      if (nextDistance < dist[nextId]) {
        dist[nextId] = nextDistance
        prev[nextId] = currentId
        heap.push([nextDistance, nextId])
        events.push({ kind: 'frontier', cell: next, value: nextDistance })
      }
    }
  }

  const path = reconstruct(prev, start, target, cols)
  const cost = path.length > 0 ? dist[targetId] : Number.POSITIVE_INFINITY
  appendPathEvents(events, path, cost)
  return events
}

function astar(grid: Grid, start: Cell, target: Cell): SearchEvent[] {
  const rows = grid.length
  const cols = grid[0].length
  const total = rows * cols
  const g = new Float64Array(total)
  g.fill(Number.POSITIVE_INFINITY)
  const prev = new Int32Array(total)
  prev.fill(-1)
  const closed = new Uint8Array(total)
  const startId = id(start, cols)
  const targetId = id(target, cols)
  g[startId] = 0
  const heap = new MinHeap<[number, number, number]>((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2])
  heap.push([heuristic(start, target), 0, startId])
  const events: SearchEvent[] = [{ kind: 'frontier', cell: start, value: 0 }]

  while (heap.size > 0) {
    const item = heap.pop()
    if (!item) break
    const [, currentG, currentId] = item
    if (closed[currentId]) continue
    closed[currentId] = 1
    const current = fromId(currentId, cols)
    events.push({ kind: 'visit', cell: current, value: currentG })
    if (currentId === targetId) break

    for (const next of neighbors(grid, current)) {
      const nextId = id(next, cols)
      const nextG = currentG + stepCost(grid, next)
      if (nextG < g[nextId]) {
        g[nextId] = nextG
        prev[nextId] = currentId
        heap.push([nextG + heuristic(next, target), nextG, nextId])
        events.push({ kind: 'frontier', cell: next, value: nextG })
      }
    }
  }

  const path = reconstruct(prev, start, target, cols)
  const cost = path.length > 0 ? g[targetId] : Number.POSITIVE_INFINITY
  appendPathEvents(events, path, cost)
  return events
}

function bfs(grid: Grid, start: Cell, target: Cell): SearchEvent[] {
  const rows = grid.length
  const cols = grid[0].length
  const total = rows * cols
  const prev = new Int32Array(total)
  prev.fill(-1)
  const depth = new Int32Array(total)
  depth.fill(-1)
  const seen = new Uint8Array(total)
  const queue = new Int32Array(total)
  let head = 0
  let tail = 0
  const startId = id(start, cols)
  seen[startId] = 1
  depth[startId] = 0
  queue[tail++] = startId
  const events: SearchEvent[] = [{ kind: 'frontier', cell: start, value: 0 }]

  while (head < tail) {
    const currentId = queue[head++]
    const current = fromId(currentId, cols)
    events.push({ kind: 'visit', cell: current, value: depth[currentId] })
    if (sameCell(current, target)) break
    for (const next of neighbors(grid, current)) {
      const nextId = id(next, cols)
      if (seen[nextId]) continue
      seen[nextId] = 1
      prev[nextId] = currentId
      depth[nextId] = depth[currentId] + 1
      queue[tail++] = nextId
      events.push({ kind: 'frontier', cell: next, value: depth[nextId] })
    }
  }

  const path = reconstruct(prev, start, target, cols)
  const cost = path.length > 0 ? path.slice(1).reduce((sum, cell) => sum + stepCost(grid, cell), 0) : Number.POSITIVE_INFINITY
  appendPathEvents(events, path, cost)
  return events
}

function greedy(grid: Grid, start: Cell, target: Cell): SearchEvent[] {
  const rows = grid.length
  const cols = grid[0].length
  const total = rows * cols
  const prev = new Int32Array(total)
  prev.fill(-1)
  const seen = new Uint8Array(total)
  const startId = id(start, cols)
  seen[startId] = 1
  const heap = new MinHeap<[number, number]>((a, b) => a[0] - b[0] || a[1] - b[1])
  heap.push([heuristic(start, target), startId])
  const events: SearchEvent[] = [{ kind: 'frontier', cell: start, value: 0 }]

  while (heap.size > 0) {
    const item = heap.pop()
    if (!item) break
    const [, currentId] = item
    const current = fromId(currentId, cols)
    events.push({ kind: 'visit', cell: current })
    if (sameCell(current, target)) break
    for (const next of neighbors(grid, current)) {
      const nextId = id(next, cols)
      if (seen[nextId]) continue
      seen[nextId] = 1
      prev[nextId] = currentId
      heap.push([heuristic(next, target), nextId])
      events.push({ kind: 'frontier', cell: next })
    }
  }

  const path = reconstruct(prev, start, target, cols)
  const cost = path.length > 0 ? path.slice(1).reduce((sum, cell) => sum + stepCost(grid, cell), 0) : Number.POSITIVE_INFINITY
  appendPathEvents(events, path, cost)
  return events
}

export function makeSearchEvents(algorithm: AlgorithmName, grid: Grid, start: Cell, target: Cell): SearchEvent[] {
  if (algorithm === 'Dijkstra') return dijkstra(grid, start, target)
  if (algorithm === 'A*') return astar(grid, start, target)
  if (algorithm === 'BFS') return bfs(grid, start, target)
  return greedy(grid, start, target)
}
