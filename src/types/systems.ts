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

export interface ChangeCompEntry {
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

export interface RemoveTagsAction {
  id: string
  kind: 'removeTags'
  tagIds: string[]
}

export interface ChangeCompAction {
  id: string
  kind: 'changeComp'
  changes: ChangeCompEntry[]
}

export type Action = TextAction | AddTagsAction | RemoveTagsAction | ChangeCompAction

/** A manually-defined output pin forwarding a chosen subset of the system's output set. */
export interface OutputPin {
  id: string
  label: string
  tagIds: string[]
}

export interface System {
  id: string
  name: string
  query: Query
  actions: Action[]
  outputs: OutputPin[]
  graph: SubGraph
}

export type ActionKind = Action['kind']

export const ACTION_KIND_LABELS: Record<ActionKind, string> = {
  text: 'Text',
  addTags: 'Add Tags',
  removeTags: 'Remove Tags',
  changeComp: 'Change Component',
}
