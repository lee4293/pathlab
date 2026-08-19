import { useEffect, useRef } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { COLORS } from '../constants'
import { cellKey, keyToCell } from '../grid'
import type { Cell, Grid, VisualState } from '../types'

type Props = {
  grid: Grid
  start: Cell
  target: Cell
  visual: VisualState
  onPointerStart: (cell: Cell, pointerId: number) => void
  onPointerMove: (cell: Cell) => void
  onPointerEnd: () => void
  onEraseCell: (cell: Cell) => void
  locked: boolean
}

type Geometry = {
  cell: number
  offsetX: number
  offsetY: number
  width: number
  height: number
}

export default function BoardCanvas({
  grid,
  start,
  target,
  visual,
  onPointerStart,
  onPointerMove,
  onPointerEnd,
  onEraseCell,
  locked,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const geometryRef = useRef<Geometry>({ cell: 1, offsetX: 0, offsetY: 0, width: 1, height: 1 })
  const propsRef = useRef({ grid, start, target, visual })
  propsRef.current = { grid, start, target, visual }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const wrapper = canvas.parentElement
    if (!wrapper) return

    const draw = () => {
      const { grid: currentGrid, start: currentStart, target: currentTarget, visual: currentVisual } = propsRef.current
      const rect = wrapper.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const cssWidth = Math.max(1, rect.width)
      const cssHeight = Math.max(1, rect.height)
      const pixelWidth = Math.round(cssWidth * dpr)
      const pixelHeight = Math.round(cssHeight * dpr)
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
        canvas.style.width = `${cssWidth}px`
        canvas.style.height = `${cssHeight}px`
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cssWidth, cssHeight)
      ctx.fillStyle = COLORS.gridBackground
      ctx.fillRect(0, 0, cssWidth, cssHeight)

      const rows = currentGrid.length
      const cols = currentGrid[0]?.length ?? 1
      const cell = Math.min(cssWidth / cols, cssHeight / rows)
      const boardWidth = cell * cols
      const boardHeight = cell * rows
      const offsetX = (cssWidth - boardWidth) / 2
      const offsetY = (cssHeight - boardHeight) / 2
      geometryRef.current = { cell, offsetX, offsetY, width: boardWidth, height: boardHeight }

      ctx.fillStyle = COLORS.empty
      ctx.fillRect(offsetX, offsetY, boardWidth, boardHeight)

      const pathSet = new Set(currentVisual.path)

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const key = `${row}:${col}`
          const source = currentGrid[row][col]
          let fill = COLORS.empty
          if (source.kind === 'wall') fill = COLORS.wall
          else if (source.kind === 'weight') fill = COLORS.weight
          if (currentVisual.frontier.has(key)) fill = COLORS.frontier
          if (currentVisual.visited.has(key)) fill = COLORS.visited
          if (currentVisual.current === key) fill = COLORS.current
          if (pathSet.has(key)) fill = COLORS.path

          const x = offsetX + col * cell
          const y = offsetY + row * cell
          ctx.fillStyle = fill
          ctx.fillRect(x + 0.65, y + 0.65, Math.max(0, cell - 1.3), Math.max(0, cell - 1.3))

          if (source.kind === 'weight' && cell >= 17 && key !== cellKey(currentStart) && key !== cellKey(currentTarget)) {
            ctx.fillStyle = COLORS.text
            ctx.font = `600 ${Math.max(9, Math.min(12, cell * 0.38))}px Inter, system-ui, sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(String(source.weight), x + cell / 2, y + cell / 2)
          }
        }
      }

      if (currentVisual.path.length > 1) {
        ctx.strokeStyle = COLORS.pathEdge
        ctx.lineWidth = Math.max(2, cell * 0.18)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        currentVisual.path.forEach((key, index) => {
          const point = keyToCell(key)
          const x = offsetX + point.col * cell + cell / 2
          const y = offsetY + point.row * cell + cell / 2
          if (index === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.stroke()
      }

      for (const key of currentVisual.path) {
        const point = keyToCell(key)
        const x = offsetX + point.col * cell + cell / 2
        const y = offsetY + point.row * cell + cell / 2
        ctx.fillStyle = COLORS.path
        ctx.beginPath()
        ctx.arc(x, y, Math.max(2.5, cell * 0.17), 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.strokeStyle = COLORS.gridLine
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let col = 0; col <= cols; col += 1) {
        const x = offsetX + col * cell
        ctx.moveTo(x, offsetY)
        ctx.lineTo(x, offsetY + boardHeight)
      }
      for (let row = 0; row <= rows; row += 1) {
        const y = offsetY + row * cell
        ctx.moveTo(offsetX, y)
        ctx.lineTo(offsetX + boardWidth, y)
      }
      ctx.stroke()

      const drawEndpoint = (point: Cell, label: string, color: string) => {
        const x = offsetX + point.col * cell + cell / 2
        const y = offsetY + point.row * cell + cell / 2
        const radius = Math.max(6, cell * 0.34)
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#07111f'
        ctx.font = `800 ${Math.max(10, Math.min(15, cell * 0.48))}px Inter, system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, x, y + 0.5)
      }

      drawEndpoint(currentStart, 'S', COLORS.start)
      drawEndpoint(currentTarget, 'T', COLORS.target)
    }

    const observer = new ResizeObserver(draw)
    observer.observe(wrapper)
    draw()
    return () => observer.disconnect()
  }, [grid, start, target, visual])

  const eventToCell = (event: ReactPointerEvent<HTMLCanvasElement> | ReactMouseEvent<HTMLCanvasElement>): Cell | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const { cell, offsetX, offsetY } = geometryRef.current
    const col = Math.floor((event.clientX - rect.left - offsetX) / cell)
    const row = Math.floor((event.clientY - rect.top - offsetY) / cell)
    if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) return null
    return { row, col }
  }

  return (
    <canvas
      ref={canvasRef}
      className={`board-canvas${locked ? ' is-locked' : ''}`}
      onPointerDown={(event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (event.button !== 0 || locked) return
        const cell = eventToCell(event)
        if (!cell) return
        event.currentTarget.setPointerCapture(event.pointerId)
        onPointerStart(cell, event.pointerId)
      }}
      onPointerMove={(event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (locked || event.buttons !== 1) return
        const cell = eventToCell(event)
        if (cell) onPointerMove(cell)
      }}
      onPointerUp={(event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
        onPointerEnd()
      }}
      onPointerCancel={onPointerEnd}
      onContextMenu={(event: ReactMouseEvent<HTMLCanvasElement>) => {
        event.preventDefault()
        if (locked) return
        const cell = eventToCell(event)
        if (cell) onEraseCell(cell)
      }}
      aria-label="Interactive pathfinding grid"
    />
  )
}
