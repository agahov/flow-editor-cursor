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
}

export type SubGraph = {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface FlowDoc {
  id: string
  name: string
  tags: TagDef[]
  systems: System[]
  flow: SubGraph
}

export type NavigationLevel = 'flow' | 'system'

export interface NavigationState {
  level: NavigationLevel
  systemId: string | null
}
