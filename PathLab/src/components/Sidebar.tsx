import type { ChangeEvent, ReactNode } from 'react'
import { ALGORITHMS, GRID_SIZES, MAZES, TOOLS } from '../constants'
import type { AlgorithmName, MazeName, ToolName } from '../types'

type Props = {
  algorithm: AlgorithmName
  maze: MazeName
  gridSize: string
  tool: ToolName
  weight: number
  speed: number
  density: number
  onAlgorithmChange: (value: AlgorithmName) => void
  onMazeChange: (value: MazeName) => void
  onGridSizeChange: (value: string) => void
  onToolChange: (value: ToolName) => void
  onWeightChange: (value: number) => void
  onSpeedChange: (value: number) => void
  onDensityChange: (value: number) => void
  onGenerateMaze: () => void
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="section-title">{children}</div>
}

export default function Sidebar({
  algorithm,
  maze,
  gridSize,
  tool,
  weight,
  speed,
  density,
  onAlgorithmChange,
  onMazeChange,
  onGridSizeChange,
  onToolChange,
  onWeightChange,
  onSpeedChange,
  onDensityChange,
  onGenerateMaze,
}: Props) {
  return (
    <aside className="sidebar panel">
      <SectionTitle>Algorithm</SectionTitle>
      <select className="select-control" value={algorithm} onChange={(event: ChangeEvent<HTMLSelectElement>) => onAlgorithmChange(event.target.value as AlgorithmName)}>
        {ALGORITHMS.map((item) => <option key={item}>{item}</option>)}
      </select>

      <SectionTitle>Tools</SectionTitle>
      <div className="tool-grid">
        {TOOLS.map((item) => (
          <button
            type="button"
            key={item.key}
            className={`control-button tool-button${tool === item.key ? ' selected' : ''}`}
            onClick={() => onToolChange(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="inline-control">
        <label htmlFor="weight-cost">Weight cost</label>
        <input
          id="weight-cost"
          className="number-control"
          type="number"
          min={2}
          max={9}
          value={weight}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onWeightChange(Math.max(2, Math.min(9, Number(event.target.value) || 2)))}
        />
      </div>

      <SectionTitle>Maze</SectionTitle>
      <select className="select-control" value={maze} onChange={(event: ChangeEvent<HTMLSelectElement>) => onMazeChange(event.target.value as MazeName)}>
        {MAZES.map((item) => <option key={item}>{item}</option>)}
      </select>

      <div className="range-header">
        <label htmlFor="density">Density</label>
        <span>{density}%</span>
      </div>
      <input
        id="density"
        className="range-control"
        type="range"
        min={8}
        max={48}
        value={density}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onDensityChange(Number(event.target.value))}
      />

      <button type="button" className="control-button primary full-width" onClick={onGenerateMaze}>
        Generate Maze
      </button>

      <SectionTitle>Board</SectionTitle>
      <select className="select-control" value={gridSize} onChange={(event: ChangeEvent<HTMLSelectElement>) => onGridSizeChange(event.target.value)}>
        {GRID_SIZES.map((item) => <option key={item}>{item}</option>)}
      </select>

      <div className="range-header speed-header">
        <label htmlFor="animation-speed">Animation speed</label>
        <span>{speed}</span>
      </div>
      <input
        id="animation-speed"
        className="range-control speed-range"
        type="range"
        min={1}
        max={300}
        value={speed}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onSpeedChange(Number(event.target.value))}
      />
    </aside>
  )
}
