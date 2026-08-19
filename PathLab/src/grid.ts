import type { Cell, Grid } from './types'

export function cellKey(cell: Cell): string {
  return `${cell.row}:${cell.col}`
}

export function keyToCell(key: string): Cell {
  const [row, col] = key.split(':').map(Number)
  return { row, col }
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a.row === b.row && a.col === b.col
}

export function createGrid(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ kind: 'empty' as const, weight: 1 })),
  )
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => row.map((cell) => ({ ...cell })))
}

export function parseGridSize(size: string): { rows: number; cols: number } {
  const [rows, cols] = size.replaceAll(' ', '').split('×').map(Number)
  return { rows, cols }
}

export function defaultEndpoints(rows: number, cols: number): { start: Cell; target: Cell } {
  return {
    start: { row: Math.floor(rows / 2), col: Math.max(2, Math.floor(cols / 7)) },
    target: { row: Math.floor(rows / 2), col: Math.min(cols - 3, cols - Math.floor(cols / 7)) },
  }
}

export function initialEndpoints(rows: number, cols: number): { start: Cell; target: Cell } {
  return {
    start: { row: Math.floor(rows / 2), col: 5 },
    target: { row: Math.floor(rows / 2), col: cols - 6 },
  }
}

export function interpolateCells(start: Cell, end: Cell): Cell[] {
  let x0 = start.row
  let y0 = start.col
  const x1 = end.row
  const y1 = end.col
  const points: Cell[] = []
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy

  while (true) {
    points.push({ row: x0, col: y0 })
    if (x0 === x1 && y0 === y1) break
    const e2 = err * 2
    if (e2 > -dy) {
      err -= dy
      x0 += sx
    }
    if (e2 < dx) {
      err += dx
      y0 += sy
    }
  }

  return points
}
