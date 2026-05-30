export type TagType = 'data' | 'marker' | 'state' | 'relation' | 'timer'

export type FieldKind = 'number' | 'string' | 'bool' | 'vec2'

export interface TagField {
  name: string
  kind: FieldKind
}

export interface TagDef {
  id: string
  name: string
  type: TagType
  fields?: TagField[]
  stateGroup?: string
  duration?: number
}

export const TAG_TYPE_LABELS: Record<TagType, string> = {
  data: 'Data',
  marker: 'Marker',
  state: 'State',
  relation: 'Relation',
  timer: 'Timer',
}

export const TAG_TYPE_COLORS: Record<TagType, string> = {
  data: 'bg-blue-100 text-blue-800 border-blue-200',
  marker: 'bg-gray-100 text-gray-800 border-gray-200',
  state: 'bg-purple-100 text-purple-800 border-purple-200',
  relation: 'bg-amber-100 text-amber-800 border-amber-200',
  timer: 'bg-green-100 text-green-800 border-green-200',
}
