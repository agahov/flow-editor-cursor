import type { TagDef } from './tags'
import type { System } from './systems'

export interface Position {
  x: number
  y: number
}

export interface GraphNodeData {
  systemId?: string
  actionId?: string
  label?: string
}

export interface GraphNode {
  id: string
  type: string
  position: Position
  data: GraphNodeData
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type?: string
  sourceHandle?: string
  targetHandle?: string
}

export type SubGraph = {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

/** A named group of systems describing a process; owns the connections drawn between its members. */
export interface Process {
  id: string
  name: string
  /** Declared tag ids this process is "about" (used as a visual lens). */
  components: string[]
  graph: SubGraph
}

export interface FlowDoc {
  id: string
  name: string
  tags: TagDef[]
  systems: System[]
  processes: Process[]
}

export type NavigationLevel = 'processes' | 'process' | 'system'

export interface NavigationState {
  level: NavigationLevel
  processId: string | null
  systemId: string | null
}
