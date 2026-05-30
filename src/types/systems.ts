import type { SubGraph } from './flow'

export type ConditionMode = 'has' | 'absent'

export interface Condition {
  tagId: string
  mode: ConditionMode
}

export interface Query {
  conditions: Condition[]
}

export interface AddTagEntry {
  tagId: string
  values?: Record<string, unknown>
}

export interface TextAction {
  id: string
  kind: 'text'
  message: string
}

export interface AddTagsAction {
  id: string
  kind: 'addTags'
  tags: AddTagEntry[]
}

export type Action = TextAction | AddTagsAction

export interface System {
  id: string
  name: string
  query: Query
  actions: Action[]
  graph: SubGraph
}

export type ActionKind = Action['kind']

export const ACTION_KIND_LABELS: Record<ActionKind, string> = {
  text: 'Text',
  addTags: 'Add Tags',
}
