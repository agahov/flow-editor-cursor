import { nanoid } from 'nanoid'
import type { FlowDoc, GraphNode, GraphEdge, Process } from '@/types/flow'
import type { Action, OutputPin, System } from '@/types/systems'

interface SystemSpec {
  name: string
  queryHas?: string[]
  queryAbsent?: string[]
  actions: Action[]
  outputs: OutputPin[]
}

function buildSystem(spec: SystemSpec): System {
  const systemId = nanoid()
  const queryNodeId = `${systemId}-query`
  const nodes: GraphNode[] = [
    {
      id: queryNodeId,
      type: 'query',
      position: { x: 40, y: 120 },
      data: { systemId, label: 'Query' },
    },
  ]
  const edges: GraphEdge[] = []

  spec.actions.forEach((action, i) => {
    const actionNodeId = `${systemId}-${action.id}`
    nodes.push({
      id: actionNodeId,
      type:
        action.kind === 'text'
          ? 'textAction'
          : action.kind === 'addTags'
            ? 'addTagsAction'
            : action.kind === 'removeTags'
              ? 'removeTagsAction'
              : 'changeCompAction',
      position: { x: 280 + i * 220, y: 120 },
      data: { systemId, actionId: action.id, label: action.kind },
    })
    edges.push({
      id: `${systemId}-edge-${i}`,
      source: i === 0 ? queryNodeId : `${systemId}-${spec.actions[i - 1]!.id}`,
      target: actionNodeId,
    })
  })

  return {
    id: systemId,
    name: spec.name,
    query: {
      conditions: [
        ...(spec.queryHas ?? []).map((tagId) => ({ tagId, mode: 'has' as const })),
        ...(spec.queryAbsent ?? []).map((tagId) => ({ tagId, mode: 'absent' as const })),
      ],
    },
    actions: spec.actions,
    outputs: spec.outputs,
    graph: { nodes, edges },
  }
}

export function createSampleFlowDoc(): FlowDoc {
  const tags = [
    {
      id: 'tag-position',
      name: 'position',
      type: 'data' as const,
      fields: [
        { name: 'x', kind: 'number' as const },
        { name: 'y', kind: 'number' as const },
      ],
    },
    {
      id: 'tag-velocity',
      name: 'velocity',
      type: 'data' as const,
      fields: [
        { name: 'x', kind: 'number' as const },
        { name: 'y', kind: 'number' as const },
      ],
    },
    {
      id: 'tag-health',
      name: 'health',
      type: 'data' as const,
      fields: [{ name: 'value', kind: 'number' as const }],
    },
    { id: 'tag-destroyed', name: 'destroyed', type: 'marker' as const },
    { id: 'tag-jump', name: 'jump', type: 'state' as const, stateGroup: 'movement' },
    { id: 'tag-grounded', name: 'grounded', type: 'state' as const, stateGroup: 'movement' },
  ]

  // --- Movement process: two systems sharing position + velocity --------
  const accelOutPin: OutputPin = { id: nanoid(), label: 'moving', tagIds: ['tag-position', 'tag-velocity'] }
  const acceleration = buildSystem({
    name: 'Acceleration',
    queryHas: ['tag-velocity'],
    actions: [
      { id: nanoid(), kind: 'changeComp', changes: [{ tagId: 'tag-velocity' }] },
    ],
    outputs: [accelOutPin],
  })

  const smoothOutPin: OutputPin = { id: nanoid(), label: 'output', tagIds: [] }
  const smoothMovement = buildSystem({
    name: 'Smooth Movement',
    queryHas: ['tag-position', 'tag-velocity'],
    actions: [
      { id: nanoid(), kind: 'changeComp', changes: [{ tagId: 'tag-position' }] },
    ],
    outputs: [smoothOutPin],
  })

  const movement: Process = {
    id: nanoid(),
    name: 'Movement',
    components: ['tag-position', 'tag-velocity'],
    graph: {
      nodes: [
        {
          id: `move-${acceleration.id}`,
          type: 'system',
          position: { x: 120, y: 80 },
          data: { systemId: acceleration.id, label: acceleration.name },
        },
        {
          id: `move-${smoothMovement.id}`,
          type: 'system',
          position: { x: 120, y: 320 },
          data: { systemId: smoothMovement.id, label: smoothMovement.name },
        },
      ],
      edges: [
        {
          id: `move-edge-1`,
          source: `move-${acceleration.id}`,
          target: `move-${smoothMovement.id}`,
          type: 'dataFlow',
          sourceHandle: `out-${accelOutPin.id}`,
          targetHandle: 'in',
        },
      ],
    },
  }

  // --- Lifecycle process: a single health system -----------------------
  const healthOutPin: OutputPin = { id: nanoid(), label: 'output', tagIds: [] }
  const healthCheck = buildSystem({
    name: 'Health Check',
    queryHas: ['tag-health'],
    queryAbsent: ['tag-destroyed'],
    actions: [
      { id: nanoid(), kind: 'addTags', tags: [{ tagId: 'tag-destroyed' }] },
      { id: nanoid(), kind: 'text', message: 'Entity destroyed' },
    ],
    outputs: [healthOutPin],
  })

  const lifecycle: Process = {
    id: nanoid(),
    name: 'Lifecycle',
    components: ['tag-health', 'tag-destroyed'],
    graph: {
      nodes: [
        {
          id: `life-${healthCheck.id}`,
          type: 'system',
          position: { x: 120, y: 120 },
          data: { systemId: healthCheck.id, label: healthCheck.name },
        },
      ],
      edges: [],
    },
  }

  return {
    id: nanoid(),
    name: 'Main Flow',
    tags,
    systems: [acceleration, smoothMovement, healthCheck],
    processes: [movement, lifecycle],
  }
}
