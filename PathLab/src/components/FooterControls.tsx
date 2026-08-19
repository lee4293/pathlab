type Props = {
  running: boolean
  paused: boolean
  canStepBack: boolean
  onRun: () => void
  onStepBack: () => void
  onPause: () => void
  onStepForward: () => void
  onReset: () => void
  visited: number
  pathLength: number
  pathCost: number | null
  runtimeMs: number | null
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  )
}

export default function FooterControls({
  running,
  paused,
  canStepBack,
  onRun,
  onStepBack,
  onPause,
  onStepForward,
  onReset,
  visited,
  pathLength,
  pathCost,
  runtimeMs,
}: Props) {
  return (
    <footer className="footer panel">
      <div className="transport-controls">
        <button type="button" className="control-button primary transport-button" onClick={onRun}>▶ Run</button>
        <button type="button" className="control-button transport-button" onClick={onStepBack} disabled={!canStepBack}>◀ Step</button>
        <button type="button" className="control-button transport-button" onClick={onPause} disabled={!running}>
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <button type="button" className="control-button transport-button" onClick={onStepForward}>Step ▶</button>
        <button type="button" className="control-button transport-button" onClick={onReset}>Reset</button>
      </div>
      <div className="stats-grid">
        <Stat label="Visited" value={visited} />
        <Stat label="Path" value={pathLength} />
        <Stat label="Cost" value={pathCost ?? 0} />
        <Stat label="Runtime" value={runtimeMs === null ? '0.00 ms' : `${runtimeMs.toFixed(2)} ms`} />
      </div>
    </footer>
  )
}
