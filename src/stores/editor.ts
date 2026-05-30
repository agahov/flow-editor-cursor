import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'
import { computed, ref, watch } from 'vue'
import { createSampleFlowDoc } from '@/lib/sample-data'
import type { GraphEdge, GraphNode, FlowDoc, NavigationLevel, NavigationState } from '@/types/flow'
import type { Action, ActionKind, System } from '@/types/systems'
import type { TagDef, TagType } from '@/types/tags'

const STORAGE_KEY = 'tag-flow-editor-doc'

function loadFromStorage(): FlowDoc | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as FlowDoc
  } catch {
    return null
  }
}

function saveToStorage(doc: FlowDoc) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(doc))
}

export const useEditorStore = defineStore('editor', () => {
  const doc = ref<FlowDoc>(loadFromStorage() ?? createSampleFlowDoc())
  const navigation = ref<NavigationState>({ level: 'flow', systemId: null })
  const selectedNodeId = ref<string | null>(null)

  watch(
    doc,
    (value) => {
      saveToStorage(value)
    },
    { deep: true },
  )

  const currentSystem = computed(() => {
    if (!navigation.value.systemId) return null
    return doc.value.systems.find((s) => s.id === navigation.value.systemId) ?? null
  })

  const currentGraph = computed(() => {
    if (navigation.value.level === 'flow') return doc.value.flow
    return currentSystem.value?.graph ?? { nodes: [], edges: [] }
  })

  const breadcrumb = computed(() => {
    const items: Array<{ label: string; level: NavigationLevel; systemId: string | null }> = [
      { label: doc.value.name, level: 'flow', systemId: null },
    ]
    if (navigation.value.level === 'system' && currentSystem.value) {
      items.push({
        label: currentSystem.value.name,
        level: 'system',
        systemId: currentSystem.value.id,
      })
    }
    return items
  })

  function getTagById(tagId: string): TagDef | undefined {
    return doc.value.tags.find((t) => t.id === tagId)
  }

  function navigateToFlow() {
    navigation.value = { level: 'flow', systemId: null }
    selectedNodeId.value = null
  }

  function navigateToSystem(systemId: string) {
    navigation.value = { level: 'system', systemId }
    selectedNodeId.value = null
  }

  function selectNode(nodeId: string | null) {
    selectedNodeId.value = nodeId
  }

  function updateGraphNodes(nodes: GraphNode[]) {
    if (navigation.value.level === 'flow') {
      doc.value.flow.nodes = nodes
      return
    }
    const system = currentSystem.value
    if (system) system.graph.nodes = nodes
  }

  function updateGraphEdges(edges: GraphEdge[]) {
    if (navigation.value.level === 'flow') {
      doc.value.flow.edges = edges
      return
    }
    const system = currentSystem.value
    if (system) system.graph.edges = edges
  }

  function addTag(tag: Omit<TagDef, 'id'> & { id?: string }) {
    doc.value.tags.push({ ...tag, id: tag.id ?? nanoid() })
  }

  function updateTag(tagId: string, patch: Partial<TagDef>) {
    const tag = doc.value.tags.find((t) => t.id === tagId)
    if (tag) Object.assign(tag, patch)
  }

  function removeTag(tagId: string) {
    doc.value.tags = doc.value.tags.filter((t) => t.id !== tagId)
    for (const system of doc.value.systems) {
      system.query.conditions = system.query.conditions.filter((c) => c.tagId !== tagId)
      for (const action of system.actions) {
        if (action.kind === 'addTags') {
          action.tags = action.tags.filter((t) => t.tagId !== tagId)
        }
      }
    }
  }

  function addSystem(name = 'New System') {
    const systemId = nanoid()
    const queryNodeId = `${systemId}-query`
    const textAction: Action = { id: nanoid(), kind: 'text', message: 'Hello' }
    const actionNodeId = `${systemId}-${textAction.id}`

    const system: System = {
      id: systemId,
      name,
      query: { conditions: [] },
      actions: [textAction],
      graph: {
        nodes: [
          {
            id: queryNodeId,
            type: 'query',
            position: { x: 40, y: 120 },
            data: { systemId, label: 'Query' },
          },
          {
            id: actionNodeId,
            type: 'textAction',
            position: { x: 280, y: 120 },
            data: { systemId, actionId: textAction.id, label: 'text' },
          },
        ],
        edges: [{ id: `${systemId}-edge-0`, source: queryNodeId, target: actionNodeId }],
      },
    }

    doc.value.systems.push(system)

    const y = 100 + doc.value.flow.nodes.length * 180
    doc.value.flow.nodes.push({
      id: `flow-${systemId}`,
      type: 'system',
      position: { x: 80, y },
      data: { systemId, label: name },
    })
  }

  function updateSystem(systemId: string, patch: Partial<Pick<System, 'name' | 'query'>>) {
    const system = doc.value.systems.find((s) => s.id === systemId)
    if (system) Object.assign(system, patch)
    if (patch.name) {
      const flowNode = doc.value.flow.nodes.find((n) => n.data.systemId === systemId)
      if (flowNode) flowNode.data.label = patch.name
    }
  }

  function removeSystem(systemId: string) {
    doc.value.systems = doc.value.systems.filter((s) => s.id !== systemId)
    doc.value.flow.nodes = doc.value.flow.nodes.filter((n) => n.data.systemId !== systemId)
    doc.value.flow.edges = doc.value.flow.edges.filter((e) => {
      const source = doc.value.flow.nodes.find((n) => n.id === e.source)
      const target = doc.value.flow.nodes.find((n) => n.id === e.target)
      return source?.data.systemId !== systemId && target?.data.systemId !== systemId
    })
    if (navigation.value.systemId === systemId) navigateToFlow()
  }

  function addAction(systemId: string, kind: ActionKind) {
    const system = doc.value.systems.find((s) => s.id === systemId)
    if (!system) return

    const action: Action =
      kind === 'text'
        ? { id: nanoid(), kind: 'text', message: 'New message' }
        : { id: nanoid(), kind: 'addTags', tags: [] }

    system.actions.push(action)

    const lastActionNode = [...system.graph.nodes]
      .filter((n) => n.type !== 'query')
      .sort((a, b) => a.position.x - b.position.x)
      .at(-1)

    const x = lastActionNode ? lastActionNode.position.x + 220 : 280
    const actionNodeId = `${systemId}-${action.id}`
    const sourceId = lastActionNode?.id ?? `${systemId}-query`

    system.graph.nodes.push({
      id: actionNodeId,
      type: kind === 'text' ? 'textAction' : 'addTagsAction',
      position: { x, y: 120 },
      data: { systemId, actionId: action.id, label: kind },
    })

    system.graph.edges.push({
      id: `${systemId}-edge-${nanoid()}`,
      source: sourceId,
      target: actionNodeId,
    })
  }

  function updateAction(systemId: string, actionId: string, patch: Partial<Action>) {
    const system = doc.value.systems.find((s) => s.id === systemId)
    if (!system) return
    const action = system.actions.find((a) => a.id === actionId)
    if (action) Object.assign(action, patch)
  }

  function removeAction(systemId: string, actionId: string) {
    const system = doc.value.systems.find((s) => s.id === systemId)
    if (!system) return

    const nodeId = `${systemId}-${actionId}`
    system.actions = system.actions.filter((a) => a.id !== actionId)
    system.graph.nodes = system.graph.nodes.filter((n) => n.id !== nodeId)
    system.graph.edges = system.graph.edges.filter((e) => e.source !== nodeId && e.target !== nodeId)

    const queryNode = system.graph.nodes.find((n) => n.type === 'query')
    const remainingActions = system.graph.nodes.filter((n) => n.type !== 'query')
    system.graph.edges = []
    if (queryNode && remainingActions.length > 0) {
      remainingActions.sort((a, b) => a.position.x - b.position.x)
      for (let i = 0; i < remainingActions.length; i++) {
        system.graph.edges.push({
          id: `${systemId}-edge-${i}`,
          source: i === 0 ? queryNode.id : remainingActions[i - 1]!.id,
          target: remainingActions[i]!.id,
        })
      }
    }
  }

  function exportJson(): string {
    return JSON.stringify(doc.value, null, 2)
  }

  function importJson(json: string) {
    const parsed = JSON.parse(json) as FlowDoc
    doc.value = parsed
    navigateToFlow()
  }

  function resetToSample() {
    doc.value = createSampleFlowDoc()
    navigateToFlow()
  }

  const selectedNode = computed(() => {
    if (!selectedNodeId.value) return null
    return currentGraph.value.nodes.find((n) => n.id === selectedNodeId.value) ?? null
  })

  const tagsByType = computed(() => {
    const groups: Record<TagType, TagDef[]> = {
      data: [],
      marker: [],
      state: [],
      relation: [],
      timer: [],
    }
    for (const tag of doc.value.tags) {
      groups[tag.type].push(tag)
    }
    return groups
  })

  return {
    doc,
    navigation,
    selectedNodeId,
    currentSystem,
    currentGraph,
    breadcrumb,
    selectedNode,
    tagsByType,
    getTagById,
    navigateToFlow,
    navigateToSystem,
    selectNode,
    updateGraphNodes,
    updateGraphEdges,
    addTag,
    updateTag,
    removeTag,
    addSystem,
    updateSystem,
    removeSystem,
    addAction,
    updateAction,
    removeAction,
    exportJson,
    importJson,
    resetToSample,
  }
})
