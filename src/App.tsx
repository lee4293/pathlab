import { useEffect, useRef, useState } from 'react'
import { DEFAULTS } from './constants'
import { makeSearchEvents } from './algorithms'
import { createGrid, defaultEndpoints, initialEndpoints, interpolateCells, parseGridSize, sameCell } from './grid'
import { generateMaze } from './maze'
import { applySearchEvent, cloneVisualState, createVisualState, undoSearchEvent } from './visualState'
import type { AlgorithmName, Cell, Grid, MazeName, SearchEvent, ToolName, UndoPatch, VisualState } from './types'
import BoardCanvas from './components/BoardCanvas'
import FooterControls from './components/FooterControls'
import GuideModal from './components/GuideModal'
import Sidebar from './components/Sidebar'

function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element) return false
  const tag = element.tagName
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || element.isContentEditable
}

export default function App() {
  const [algorithm, setAlgorithm] = useState<AlgorithmName>(DEFAULTS.algorithm)
  const [maze, setMaze] = useState<MazeName>(DEFAULTS.maze)
  const [gridSize, setGridSize] = useState(DEFAULTS.gridSize)
  const [weight, setWeight] = useState(DEFAULTS.weight)
  const [speed, setSpeed] = useState(DEFAULTS.speed)
  const [density, setDensity] = useState(DEFAULTS.density)
  const [tool, setTool] = useState<ToolName>(DEFAULTS.tool)
  const [grid, setGrid] = useState<Grid>(() => createGrid(DEFAULTS.rows, DEFAULTS.cols))
  const initial = initialEndpoints(DEFAULTS.rows, DEFAULTS.cols)
  const [start, setStart] = useState<Cell>(initial.start)
  const [target, setTarget] = useState<Cell>(initial.target)
  const [visual, setVisual] = useState<VisualState>(() => createVisualState())
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [eventIndex, setEventIndex] = useState(0)
  const [guideOpen, setGuideOpen] = useState(false)

  const visualRef = useRef(visual)
  const eventsRef = useRef<SearchEvent[]>([])
  const undoRef = useRef<UndoPatch[]>([])
  const eventIndexRef = useRef(0)
  const runtimeRef = useRef(0)
  const runningRef = useRef(false)
  const pausedRef = useRef(false)
  const speedRef = useRef(speed)
  const animationRef = useRef<number | null>(null)
  const lastFrameRef = useRef(0)
  const draggingRef = useRef(false)
  const lastDragCellRef = useRef<Cell | null>(null)
  const algorithmRef = useRef(algorithm)

  visualRef.current = visual
  speedRef.current = speed
  algorithmRef.current = algorithm

  const commitVisual = () => {
    setVisual(cloneVisualState(visualRef.current))
  }

  const stopAnimationFrame = () => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
    animationRef.current = null
    lastFrameRef.current = 0
  }

  const setRunningState = (value: boolean) => {
    runningRef.current = value
    setRunning(value)
  }

  const setPausedState = (value: boolean) => {
    pausedRef.current = value
    setPaused(value)
  }

  const replaceVisual = (next: VisualState) => {
    visualRef.current = next
    setVisual(cloneVisualState(next))
  }

  const clearSearch = (status = 'Ready') => {
    stopAnimationFrame()
    eventsRef.current = []
    undoRef.current = []
    eventIndexRef.current = 0
    runtimeRef.current = 0
    setEventIndex(0)
    setRunningState(false)
    setPausedState(false)
    replaceVisual(createVisualState(status))
  }

  const buildSearchPlan = (initialStatus: string) => {
    stopAnimationFrame()
    const nextVisual = createVisualState(initialStatus)
    visualRef.current = nextVisual
    setVisual(cloneVisualState(nextVisual))
    undoRef.current = []
    eventIndexRef.current = 0
    setEventIndex(0)
    const started = performance.now()
    eventsRef.current = makeSearchEvents(algorithm, grid, start, target)
    runtimeRef.current = performance.now() - started
  }

  const processEvent = (): boolean => {
    const index = eventIndexRef.current
    const events = eventsRef.current
    if (index >= events.length) {
      setRunningState(false)
      return false
    }
    const event = events[index]
    const patch = applySearchEvent(visualRef.current, event, runtimeRef.current)
    undoRef.current.push(patch)
    eventIndexRef.current += 1
    setEventIndex(eventIndexRef.current)
    if (event.kind === 'done') {
      setRunningState(false)
      setPausedState(false)
      return false
    }
    return true
  }

  const animationLoop = (timestamp: number) => {
    if (!runningRef.current || pausedRef.current) {
      animationRef.current = null
      return
    }

    const currentSpeed = speedRef.current
    const interval = currentSpeed <= 100 ? Math.max(8, 150 - currentSpeed * 1.4) : 0
    const batch = currentSpeed <= 100 ? 1 : Math.min(32, 1 + Math.floor((currentSpeed - 100) / 7))

    if (interval > 0 && timestamp - lastFrameRef.current < interval) {
      animationRef.current = requestAnimationFrame(animationLoop)
      return
    }

    lastFrameRef.current = timestamp
    let active = true
    for (let i = 0; i < batch && active; i += 1) active = processEvent()
    commitVisual()

    if (runningRef.current && !pausedRef.current) animationRef.current = requestAnimationFrame(animationLoop)
    else animationRef.current = null
  }

  const startAnimation = () => {
    stopAnimationFrame()
    lastFrameRef.current = 0
    animationRef.current = requestAnimationFrame(animationLoop)
  }

  const runSearch = () => {
    buildSearchPlan(`Running ${algorithm}…`)
    setRunningState(true)
    setPausedState(false)
    startAnimation()
  }

  const togglePause = () => {
    if (!runningRef.current) return
    const nextPaused = !pausedRef.current
    setPausedState(nextPaused)
    visualRef.current.status = nextPaused ? 'Paused' : `Running ${algorithmRef.current}…`
    commitVisual()
    if (nextPaused) stopAnimationFrame()
    else startAnimation()
  }

  const stepForward = () => {
    stopAnimationFrame()
    if (eventsRef.current.length === 0) buildSearchPlan('Ready')
    if (eventIndexRef.current >= eventsRef.current.length) return
    setRunningState(true)
    setPausedState(true)
    const active = processEvent()
    if (active) visualRef.current.status = `Step ${eventIndexRef.current}/${eventsRef.current.length}`
    commitVisual()
  }

  const stepBack = () => {
    stopAnimationFrame()
    if (eventIndexRef.current <= 0 || undoRef.current.length === 0) return
    const retainedRuntime = visualRef.current.runtimeMs
    const patch = undoRef.current.pop()
    if (!patch) return
    undoSearchEvent(visualRef.current, patch)
    eventIndexRef.current -= 1
    setEventIndex(eventIndexRef.current)
    setRunningState(true)
    setPausedState(true)
    if (retainedRuntime !== null) visualRef.current.runtimeMs = retainedRuntime
    visualRef.current.searchComplete = false
    visualRef.current.status = `Step ${eventIndexRef.current}/${eventsRef.current.length}`
    commitVisual()
  }

  const resetAll = () => {
    stopAnimationFrame()
    setAlgorithm(DEFAULTS.algorithm)
    setMaze(DEFAULTS.maze)
    setGridSize(DEFAULTS.gridSize)
    setWeight(DEFAULTS.weight)
    setSpeed(DEFAULTS.speed)
    setDensity(DEFAULTS.density)
    setTool(DEFAULTS.tool)
    const endpoints = initialEndpoints(DEFAULTS.rows, DEFAULTS.cols)
    setStart(endpoints.start)
    setTarget(endpoints.target)
    setGrid(createGrid(DEFAULTS.rows, DEFAULTS.cols))
    eventsRef.current = []
    undoRef.current = []
    eventIndexRef.current = 0
    runtimeRef.current = 0
    setEventIndex(0)
    setRunningState(false)
    setPausedState(false)
    replaceVisual(createVisualState('Reset to defaults'))
  }

  const handleAlgorithmChange = (value: AlgorithmName) => {
    setAlgorithm(value)
    clearSearch('Ready')
  }

  const handleGridSizeChange = (value: string) => {
    const { rows, cols } = parseGridSize(value)
    const endpoints = defaultEndpoints(rows, cols)
    setGridSize(value)
    setStart(endpoints.start)
    setTarget(endpoints.target)
    setGrid(createGrid(rows, cols))
    clearSearch(`Grid resized to ${rows} × ${cols}`)
  }

  const handleGenerateMaze = () => {
    clearSearch(`${maze} ready`)
    setGrid((current) => generateMaze(current, maze, start, target, density))
  }

  const isEndpoint = (cell: Cell) => sameCell(cell, start) || sameCell(cell, target)

  const editCells = (cells: Cell[], selectedTool: ToolName) => {
    if (selectedTool === 'start' || selectedTool === 'target') {
      const destination = cells[cells.length - 1]
      const other = selectedTool === 'start' ? target : start
      if (sameCell(destination, other)) return
      if (grid[destination.row][destination.col].kind === 'wall') return
      if (selectedTool === 'start') setStart(destination)
      else setTarget(destination)
      return
    }

    setGrid((current) => {
      const next = current.slice()
      const touchedRows = new Map<number, Grid[number]>()
      for (const cell of cells) {
        if (isEndpoint(cell)) continue
        let row = touchedRows.get(cell.row)
        if (!row) {
          row = next[cell.row].map((item) => ({ ...item }))
          touchedRows.set(cell.row, row)
          next[cell.row] = row
        }
        if (selectedTool === 'wall') row[cell.col] = { kind: 'wall', weight: 1 }
        else if (selectedTool === 'erase') row[cell.col] = { kind: 'empty', weight: 1 }
        else if (selectedTool === 'weight') row[cell.col] = { kind: 'weight', weight }
      }
      return next
    })
  }

  const beginBoardEdit = (cell: Cell) => {
    clearSearch('Ready')
    draggingRef.current = true
    lastDragCellRef.current = cell
    editCells([cell], tool)
  }

  const continueBoardEdit = (cell: Cell) => {
    if (!draggingRef.current) return
    const previous = lastDragCellRef.current
    if (!previous || sameCell(previous, cell)) return
    const cells = tool === 'start' || tool === 'target' ? [cell] : interpolateCells(previous, cell)
    editCells(cells, tool)
    lastDragCellRef.current = cell
  }

  const endBoardEdit = () => {
    draggingRef.current = false
    lastDragCellRef.current = null
  }

  const eraseCell = (cell: Cell) => {
    if (isEndpoint(cell)) return
    clearSearch('Ready')
    setGrid((current) => {
      const next = current.slice()
      const row = next[cell.row].map((item) => ({ ...item }))
      row[cell.col] = { kind: 'empty', weight: 1 }
      next[cell.row] = row
      return next
    })
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      if (event.code === 'Space') {
        event.preventDefault()
        if (runningRef.current) togglePause()
        else runSearch()
      } else if (event.key.toLowerCase() === 'n') {
        stepForward()
      } else if (event.key.toLowerCase() === 'b') {
        stepBack()
      } else if (event.key.toLowerCase() === 'r') {
        resetAll()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  useEffect(() => () => stopAnimationFrame(), [])

  const pathLength = Math.max(0, visual.path.length - 1)
  const boardLocked = running && !paused

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-row">
          <div>
            <h1>PATHLAB</h1>
            <p>Interactive pathfinding laboratory</p>
          </div>
        </div>
        <div className="header-actions">
          <button type="button" className="control-button guide-button" onClick={() => setGuideOpen(true)}>Guide</button>
          <div className="status-pill" aria-live="polite">{visual.status}</div>
        </div>
      </header>

      <main className="workspace">
        <Sidebar
          algorithm={algorithm}
          maze={maze}
          gridSize={gridSize}
          tool={tool}
          weight={weight}
          speed={speed}
          density={density}
          onAlgorithmChange={handleAlgorithmChange}
          onMazeChange={setMaze}
          onGridSizeChange={handleGridSizeChange}
          onToolChange={setTool}
          onWeightChange={setWeight}
          onSpeedChange={setSpeed}
          onDensityChange={setDensity}
          onGenerateMaze={handleGenerateMaze}
        />
        <section className="board-panel panel">
          <div className="board-wrap">
            <BoardCanvas
              grid={grid}
              start={start}
              target={target}
              visual={visual}
              onPointerStart={beginBoardEdit}
              onPointerMove={continueBoardEdit}
              onPointerEnd={endBoardEdit}
              onEraseCell={eraseCell}
              locked={boardLocked}
            />
          </div>
        </section>
      </main>

      <FooterControls
        running={running}
        paused={paused}
        canStepBack={eventIndex > 0}
        onRun={runSearch}
        onStepBack={stepBack}
        onPause={togglePause}
        onStepForward={stepForward}
        onReset={resetAll}
        visited={visual.visited.size}
        pathLength={pathLength}
        pathCost={visual.pathCost}
        runtimeMs={visual.runtimeMs}
      />

      <GuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  )
}
