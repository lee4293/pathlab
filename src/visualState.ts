import { cellKey } from './grid'
import type { SearchEvent, UndoPatch, VisualState } from './types'

export function createVisualState(status = 'Ready'): VisualState {
  return {
    frontier: new Set(),
    visited: new Set(),
    current: null,
    path: [],
    distanceLabels: new Map(),
    pathCost: null,
    runtimeMs: null,
    status,
    searchComplete: false,
    foundPath: false,
  }
}

export function cloneVisualState(state: VisualState): VisualState {
  return {
    frontier: new Set(state.frontier),
    visited: new Set(state.visited),
    current: state.current,
    path: [...state.path],
    distanceLabels: new Map(state.distanceLabels),
    pathCost: state.pathCost,
    runtimeMs: state.runtimeMs,
    status: state.status,
    searchComplete: state.searchComplete,
    foundPath: state.foundPath,
  }
}

export function applySearchEvent(state: VisualState, event: SearchEvent, algorithmRuntimeMs: number): UndoPatch {
  const patch: UndoPatch = {
    event,
    current: state.current,
    pathLength: state.path.length,
    pathCost: state.pathCost,
    runtimeMs: state.runtimeMs,
    status: state.status,
    searchComplete: state.searchComplete,
    foundPath: state.foundPath,
  }

  if (event.kind === 'frontier' && event.cell) {
    const key = cellKey(event.cell)
    patch.frontierHad = state.frontier.has(key)
    patch.distanceHad = state.distanceLabels.has(key)
    patch.distanceValue = state.distanceLabels.get(key)
    if (!state.visited.has(key)) state.frontier.add(key)
    if (event.value !== undefined) state.distanceLabels.set(key, event.value)
  } else if (event.kind === 'visit' && event.cell) {
    const key = cellKey(event.cell)
    patch.frontierHad = state.frontier.has(key)
    patch.visitedHad = state.visited.has(key)
    state.current = key
    state.frontier.delete(key)
    state.visited.add(key)
  } else if (event.kind === 'path_start') {
    state.current = null
    if (event.value !== undefined && Number.isFinite(event.value)) state.pathCost = Math.trunc(event.value)
    state.status = 'Tracing shortest path…'
  } else if (event.kind === 'path' && event.cell) {
    state.path.push(cellKey(event.cell))
  } else if (event.kind === 'done') {
    state.current = null
    state.runtimeMs = algorithmRuntimeMs
    state.searchComplete = true
    state.foundPath = event.value !== undefined && Number.isFinite(event.value)
    state.status = state.foundPath ? 'Path found' : 'No path found'
  }

  return patch
}

export function undoSearchEvent(state: VisualState, patch: UndoPatch): void {
  const event = patch.event
  state.current = patch.current
  state.path.length = patch.pathLength
  state.pathCost = patch.pathCost
  state.runtimeMs = patch.runtimeMs
  state.status = patch.status
  state.searchComplete = patch.searchComplete
  state.foundPath = patch.foundPath

  if (event.cell) {
    const key = cellKey(event.cell)
    if (patch.frontierHad !== undefined) {
      if (patch.frontierHad) state.frontier.add(key)
      else state.frontier.delete(key)
    }
    if (patch.visitedHad !== undefined) {
      if (patch.visitedHad) state.visited.add(key)
      else state.visited.delete(key)
    }
    if (patch.distanceHad !== undefined) {
      if (patch.distanceHad) state.distanceLabels.set(key, patch.distanceValue ?? 0)
      else state.distanceLabels.delete(key)
    }
  }
}
