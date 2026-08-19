import type { MouseEvent as ReactMouseEvent } from 'react'
import { useEffect } from 'react'

type Props = {
  open: boolean
  onClose: () => void
}

const sections = [
  ['Getting started', 'Choose an algorithm, edit the board with the tools, optionally generate a maze, then press Run. The green S is the start and the pink T is the target. The colored search tiles show the algorithm exploring the board before the final path is traced.'],
  ['Algorithms', 'Dijkstra expands the reachable cell with the lowest accumulated cost and guarantees the cheapest path when movement costs are non-negative. A* adds a distance estimate toward the target, usually exploring fewer cells while still finding an optimal path with this grid heuristic. BFS explores level by level and guarantees the fewest moves on an unweighted board, but it does not optimize weighted cost. Greedy Best-First prioritizes whichever cell appears closest to the target; it is often fast and direct, but its path is not guaranteed to be optimal.'],
  ['Tools', 'Wall paints impassable cells. Eraser removes walls or weights. Weight paints traversable cells that cost more to enter. Move Start and Move Target are the only modes that reposition S and T; selecting any other tool locks the endpoints in place. You can also right-click a non-endpoint cell to erase it quickly.'],
  ['Weights and weight cost', 'A normal cell costs 1 to enter. Weighted cells use the selected Weight cost from 2 through 9. Dijkstra and A* account for those costs, so a longer-looking route can be cheaper than a short route through expensive cells. BFS and Greedy Best-First do not use weighted cost in the same optimal way, which makes weighted boards useful for comparing algorithms.'],
  ['Maze generation', 'Choose a maze style, then press Generate Maze. Random Walls scatters obstacles according to Density. Recursive Division builds room-like partitions and passages. Staircase creates a structured obstacle pattern. Weighted Terrain creates cost variation rather than only hard barriers. Generated layouts are intentionally not guaranteed to contain a solution, so an occasional “No path found” result is expected; generate again, reduce density, or edit the board if you want another layout.'],
  ['Density', 'Density controls how heavily the generated maze is populated. Lower values leave more open space and usually make paths easier to find. Higher values create tighter, more obstructed boards and increase the chance that the target becomes unreachable. Its exact visual effect depends on the selected maze generator.'],
  ['Board size', 'Board size changes the number of rows and columns. Larger boards give the algorithms more search space and make exploration patterns easier to compare, while smaller boards are useful for slow step-by-step inspection. Changing the size creates a fresh empty board and repositions the endpoints.'],
  ['Animation speed', 'Animation speed controls how quickly search events are displayed. At low values, nodes advance slowly enough to inspect individual choices. At high values, PathLab processes multiple search events per animation frame so large searches finish much faster without changing the algorithm result.'],
  ['Run, step, pause, and reset', 'Run starts the selected algorithm from the beginning. ◀ Step moves the visualization backward by exactly one recorded search event. Pause freezes an active run and Resume continues it. Step ▶ moves forward by exactly one event and automatically puts the run in a paused state, which is useful for inspection. Reset clears the entire board and search and restores every configurable parameter to its default value.'],
  ['Status and metrics', 'The status box reports the current state, such as running, paused, path found, no path found, or reset to defaults. Visited counts processed cells, Path counts moves in the final route, Cost reports total traversal cost, and Runtime reports the time used to compute the search event sequence.'],
] as const

export default function GuideModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="guide-modal" role="dialog" aria-modal="true" aria-labelledby="guide-title">
        <div className="guide-heading-row">
          <h2 id="guide-title">PathLab Guide</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close guide">×</button>
        </div>
        <div className="guide-scroll">
          {sections.map(([heading, body]) => (
            <section className="guide-section" key={heading}>
              <h3>{heading}</h3>
              <p>{body}</p>
            </section>
          ))}
          <p className="guide-tip">Tip: the backward and forward step controls are most useful while paused, because you can inspect the exact order in which frontier, visit, and path events occurred.</p>
        </div>
        <div className="guide-footer">
          <button type="button" className="control-button primary" onClick={onClose}>Close</button>
        </div>
      </section>
    </div>
  )
}
