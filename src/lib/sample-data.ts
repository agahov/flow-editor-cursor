import { nanoid } from 'nanoid'
import type { FlowDoc } from '@/types/flow'
import type { System } from '@/types/systems'

function createSystem(
  name: string,
  queryTagIds: string[],
  actions: System['actions'],
  graphLayout: { queryX: number; actionXs: number[] },
): System {
  const systemId = nanoid()
  const queryNodeId = `${systemId}-query`
  const actionNodeIds = actions.map((a) => `${systemId}-${a.id}`)

  const nodes = [
    {
      id: queryNodeId,
      type: 'query',
      position: { x: graphLayout.queryX, y: 120 },
      data: { systemId, label: 'Query' },
    },
    ...actions.map((action, i) => ({
      id: actionNodeIds[i]!,
      type: action.kind === 'text' ? 'textAction' : 'addTagsAction',
      position: { x: graphLayout.actionXs[i] ?? 300 + i * 220, y: 120 },
      data: { systemId, actionId: action.id, label: action.kind },
    })),
  ]

  const edges = actionNodeIds.map((actionNodeId, i) => ({
    id: `${systemId}-edge-${i}`,
    source: i === 0 ? queryNodeId : actionNodeIds[i - 1]!,
    target: actionNodeId,
  }))

  return {
    id: systemId,
    name,
    query: {
      conditions: queryTagIds.map((tagId) => ({ tagId, mode: 'has' as const })),
    },
    actions,
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
      id: 'tag-health',
      name: 'health',
      type: 'data' as const,
      fields: [{ name: 'value', kind: 'number' as const }],
    },
    { id: 'tag-destroyed', name: 'destroyed', type: 'marker' as const },
    { id: 'tag-jump', name: 'jump', type: 'state' as const, stateGroup: 'movement' },
    { id: 'tag-attack', name: 'attack', type: 'state' as const, stateGroup: 'combat' },
    { id: 'tag-parent', name: 'parent', type: 'relation' as const },
    { id: 'tag-child', name: 'child', type: 'relation' as const },
    { id: 'tag-timer', name: 'timer', type: 'timer' as const, duration: 1000 },
  ]

  const textAction1 = { id: nanoid(), kind: 'text' as const, message: 'Entity matched query' }
  const addTagsAction1 = {
    id: nanoid(),
    kind: 'addTags' as const,
    tags: [{ tagId: 'tag-destroyed' }],
  }

  const textAction2 = { id: nanoid(), kind: 'text' as const, message: 'Player is jumping' }
  const addTagsAction2 = {
    id: nanoid(),
    kind: 'addTags' as const,
    tags: [{ tagId: 'tag-timer', values: { duration: 500 } }],
  }

  const healthSystem = createSystem(
    'Health Check',
    ['tag-health'],
    [textAction1, addTagsAction1],
    { queryX: 40, actionXs: [280, 500] },
  )

  const jumpSystem = createSystem(
    'Jump Handler',
    ['tag-jump', 'tag-position'],
    [textAction2, addTagsAction2],
    { queryX: 40, actionXs: [280, 500] },
  )

  const flow = {
    nodes: [
      {
        id: `flow-${healthSystem.id}`,
        type: 'system',
        position: { x: 80, y: 100 },
        data: { systemId: healthSystem.id, label: healthSystem.name },
      },
      {
        id: `flow-${jumpSystem.id}`,
        type: 'system',
        position: { x: 80, y: 320 },
        data: { systemId: jumpSystem.id, label: jumpSystem.name },
      },
    ],
    edges: [
      {
        id: 'flow-edge-1',
        source: `flow-${healthSystem.id}`,
        target: `flow-${jumpSystem.id}`,
      },
    ],
  }

  return {
    id: nanoid(),
    name: 'Main Flow',
    tags,
    systems: [healthSystem, jumpSystem],
    flow,
  }
}
