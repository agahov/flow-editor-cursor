import type { TagType } from './tags'

/** Per-component status of a flow, mapped to the editor color palette. */
export type StrandStatus = 'added' | 'deleted' | 'updated' | 'read' | 'unchanged'

export interface Strand {
  tagId: string
  name: string
  type: TagType
  status: StrandStatus
}

export interface EdgeFlow {
  edgeId: string
  strands: Strand[]
  warnings: string[]
}

/** SVG stroke colors per status (added=yellow, deleted=red, updated=green, read=blue, unchanged=gray). */
export const STRAND_STATUS_STROKE: Record<StrandStatus, string> = {
  added: '#eab308',
  deleted: '#ef4444',
  updated: '#22c55e',
  read: '#3b82f6',
  unchanged: '#9ca3af',
}

export const STRAND_STATUS_LABELS: Record<StrandStatus, string> = {
  added: 'added',
  deleted: 'deleted',
  updated: 'updated',
  read: 'read',
  unchanged: 'unchanged',
}

/** Tailwind chip classes per status, used in the inspector and edge labels. */
export const STRAND_STATUS_BADGE: Record<StrandStatus, string> = {
  added: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  deleted: 'bg-red-100 text-red-800 border-red-300',
  updated: 'bg-green-100 text-green-800 border-green-300',
  read: 'bg-blue-100 text-blue-800 border-blue-300',
  unchanged: 'bg-gray-100 text-gray-700 border-gray-300',
}
