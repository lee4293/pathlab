import { DIRS } from './constants'
import { cloneGrid, sameCell } from './grid'
import type { Cell, Grid, MazeName } from './types'

function clearEndpointCells(grid: Grid, start: Cell, target: Cell): void {
  for (const point of [start, target]) {
    grid[point.row][point.col] = { kind: 'empty', weight: 1 }
  }
}

function randomWalls(grid: Grid, start: Cell, target: Cell, density: number): void {
  const p = density / 100
  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[0].length; col += 1) {
      const cell = { row, col }
      if (!sameCell(cell, start) && !sameCell(cell, target) && Math.random() < p) {
        grid[row][col] = { kind: 'wall', weight: 1 }
      }
    }
  }

  for (const base of [start, target]) {
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        const row = base.row + dr
        const col = base.col + dc
        if (row >= 0 && row < grid.length && col >= 0 && col < grid[0].length) {
          grid[row][col] = { kind: 'empty', weight: 1 }
        }
      }
    }
  }
}

function staircase(grid: Grid): void {
  const rows = grid.length
  const cols = grid[0].length
  let row = Math.max(2, Math.floor(rows / 6))
  let col = 2
  let direction = 1

  while (col < cols - 2) {
    for (let i = 0; i < Math.max(2, Math.floor(rows / 5)); i += 1) {
      if (row >= 1 && row < rows - 1 && col >= 1 && col < cols - 1) {
        grid[row][col] = { kind: 'wall', weight: 1 }
      }
      row += direction
      col += 1
      if (col >= cols - 2) break
    }
    direction *= -1
  }

  if (rows >= 20) {
    row = rows - 4
    for (col = 4; col < cols - 4; col += 2) {
      grid[row][col] = { kind: 'wall', weight: 1 }
      row -= 1
      if (row <= Math.floor(rows / 2)) row = rows - 4
    }
  }
}

function weightedTerrain(grid: Grid, start: Cell, target: Cell, density: number): void {
  const p = density / 100
  const seeds: Cell[] = []

  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[0].length; col += 1) {
      const cell = { row, col }
      if (sameCell(cell, start) || sameCell(cell, target)) continue
      const roll = Math.random()
      if (roll < p * 0.3) {
        grid[row][col] = { kind: 'wall', weight: 1 }
      } else if (roll < p) {
        const weight = 2 + Math.floor(Math.random() * 8)
        grid[row][col] = { kind: 'weight', weight }
        seeds.push(cell)
      }
    }
  }

  for (let i = seeds.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[seeds[i], seeds[j]] = [seeds[j], seeds[i]]
  }

  const limit = Math.max(2, Math.floor(seeds.length / 8))
  for (const seed of seeds.slice(0, limit)) {
    const directions = [...DIRS].sort(() => Math.random() - 0.5)
    const count = 1 + Math.floor(Math.random() * 3)
    for (const [dr, dc] of directions.slice(0, count)) {
      const row = seed.row + dr
      const col = seed.col + dc
      if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) continue
      const cell = { row, col }
      if (sameCell(cell, start) || sameCell(cell, target)) continue
      if (grid[row][col].kind === 'empty') {
        grid[row][col] = { kind: 'weight', weight: grid[seed.row][seed.col].weight }
      }
    }
  }
}

function recursiveDivision(grid: Grid): void {
  const rows = grid.length
  const cols = grid[0].length

  for (let row = 0; row < rows; row += 1) {
    grid[row][0] = { kind: 'wall', weight: 1 }
    grid[row][cols - 1] = { kind: 'wall', weight: 1 }
  }
  for (let col = 0; col < cols; col += 1) {
    grid[0][col] = { kind: 'wall', weight: 1 }
    grid[rows - 1][col] = { kind: 'wall', weight: 1 }
  }

  const choose = <T,>(values: T[]): T | undefined => values[Math.floor(Math.random() * values.length)]

  const divide = (r1: number, r2: number, c1: number, c2: number, orientation?: 'H' | 'V'): void => {
    const height = r2 - r1 + 1
    const width = c2 - c1 + 1
    if (height < 4 || width < 4) return

    let nextOrientation = orientation
    if (!nextOrientation) {
      if (width > height) nextOrientation = 'V'
      else if (height > width) nextOrientation = 'H'
      else nextOrientation = Math.random() < 0.5 ? 'H' : 'V'
    }

    if (nextOrientation === 'H') {
      const candidates: number[] = []
      for (let row = r1 + 1; row < r2; row += 1) if (row % 2 === 0) candidates.push(row)
      const wallRow = choose(candidates)
      if (wallRow === undefined) return
      const gaps: number[] = []
      for (let col = c1; col <= c2; col += 1) if (col % 2 === 1) gaps.push(col)
      const gapCol = choose(gaps) ?? (c1 + Math.floor(Math.random() * (c2 - c1 + 1)))
      for (let col = c1; col <= c2; col += 1) {
        if (col !== gapCol) grid[wallRow][col] = { kind: 'wall', weight: 1 }
      }
      divide(r1, wallRow - 1, c1, c2, 'V')
      divide(wallRow + 1, r2, c1, c2, 'V')
    } else {
      const candidates: number[] = []
      for (let col = c1 + 1; col < c2; col += 1) if (col % 2 === 0) candidates.push(col)
      const wallCol = choose(candidates)
      if (wallCol === undefined) return
      const gaps: number[] = []
      for (let row = r1; row <= r2; row += 1) if (row % 2 === 1) gaps.push(row)
      const gapRow = choose(gaps) ?? (r1 + Math.floor(Math.random() * (r2 - r1 + 1)))
      for (let row = r1; row <= r2; row += 1) {
        if (row !== gapRow) grid[row][wallCol] = { kind: 'wall', weight: 1 }
      }
      divide(r1, r2, c1, wallCol - 1, 'H')
      divide(r1, r2, wallCol + 1, c2, 'H')
    }
  }

  divide(1, rows - 2, 1, cols - 2)
}

export function generateMaze(source: Grid, maze: MazeName, start: Cell, target: Cell, density: number): Grid {
  const grid = cloneGrid(source)
  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[0].length; col += 1) grid[row][col] = { kind: 'empty', weight: 1 }
  }

  if (maze === 'Random Walls') randomWalls(grid, start, target, density)
  else if (maze === 'Recursive Division') recursiveDivision(grid)
  else if (maze === 'Staircase') staircase(grid)
  else weightedTerrain(grid, start, target, density)

  clearEndpointCells(grid, start, target)
  return grid
}
