import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'
import { computed, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { createSampleFlowDoc } from '@/lib/sample-data'
import type {
  GraphEdge,
  GraphNode,
  FlowDoc,
  NavigationLevel,
  NavigationState,
  Process,
} from '@/types/flow'
import type { Action, ActionKind, OutputPin, System } from '@/types/systems'
import type { TagDef, TagType } from '@/types/tags'

const STORAGE_KEY = 'tag-flow-editor-doc'

function defaultOutputPin(label = 'output'): OutputPin {
  return { id: nanoid(), label, tagIds: [] }
}

/** Bring older / partial docs up to the current Process-centric shape. */
function migrateDoc(raw: any): FlowDoc {
  if (!raw || typeof raw !== 'object') return createSampleFlowDoc()

  const systems: System[] = (raw.systems ?? []).map((s: any) => ({
    ...s,
    outputs: Array.isArray(s.outputs) && s.outputs.length > 0 ? s.outputs : [defaultOutputPin()],
  }))

  let processes: Process[] = Array.isArray(raw.processes) ? raw.processes : []
  if (processes.length === 0 && raw.flow) {
    processes = [{ id: nanoid(), name: 'Main', components: [], graph: raw.flow }]
  }
  for (const p of processes) {
    if (!Array.isArray(p.components)) p.components = []
    if (!p.graph) p.graph = { nodes: [], edges: [] }
  }

  return {
    id: raw.id ?? nanoid(),
    name: raw.name ?? 'Untitled',
    tags: raw.tags ?? [],
    systems,
    processes,
  }
}

function loadFromStorage(): FlowDoc | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return migrateDoc(JSON.parse(raw))
  } catch {
    return null
  }
}

function saveToStorage(doc: FlowDoc) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(doc))
}

function actionNodeType(kind: ActionKind): string {
  switch (kind) {
    case 'text':
      return 'textAction'
    case 'addTags':
      return 'addTagsAction'
    case 'removeTags':
      return 'removeTagsAction'
    case 'changeComp':
      return 'changeCompAction'
  }
}

function createAction(kind: ActionKind): Action {
  switch (kind) {
    case 'text':
      return { id: nanoid(), kind: 'text', message: 'New message' }
    case 'addTags':
      return { id: nanoid(), kind: 'addTags', tags: [] }
    case 'removeTags':
      return { id: nanoid(), kind: 'removeTags', tagIds: [] }
    case 'changeComp':
      return { id: nanoid(), kind: 'changeComp', changes: [] }
  }
}

export const useEditorStore = defineStore('editor', () => {
  const doc = ref<FlowDoc>(loadFromStorage() ?? createSampleFlowDoc())
  const navigation = ref<NavigationState>({ level: 'processes', processId: null, systemId: null })
  const selectedNodeId = ref<string | null>(null)
  const flowView = ref<'graph' | 'lanes'>('graph')
  const showAllComponents = ref(false)

  const debouncedSave = useDebounceFn((value: FlowDoc) => saveToStorage(value), 400)

  watch(
    doc,
    (value) => {
      debouncedSave(value)
    },
    { deep: true },
  )

  const currentProcess = computed(() => {
    if (!navigation.value.processId) return null
    return doc.value.processes.find((p) => p.id === navigation.value.processId) ?? null
  })

  const currentSystem = computed(() => {
    if (!navigation.value.systemId) return null
    return doc.value.systems.find((s) => s.id === navigation.value.systemId) ?? null
  })

  const currentGraph = computed(() => {
    if (navigation.value.level === 'system') {
      return currentSystem.value?.graph ?? { nodes: [], edges: [] }
    }
    if (navigation.value.level === 'process') {
      return currentProcess.value?.graph ?? { nodes: [], edges: [] }
    }
    return { nodes: [], edges: [] }
  })

  const breadcrumb = computed(() => {
    const items: Array<{
      label: string
      level: NavigationLevel
      processId: string | null
      systemId: string | null
    }> = [{ label: doc.value.name, level: 'processes', processId: null, systemId: null }]

    if (currentProcess.value && navigation.value.level !== 'processes') {
      items.push({
        label: currentProcess.value.name,
        level: 'process',
        processId: currentProcess.value.id,
        systemId: null,
      })
    }
    if (navigation.value.level === 'system' && currentSystem.value) {
      items.push({
        label: currentSystem.value.name,
        level: 'system',
        processId: navigation.value.processId,
        systemId: currentSystem.value.id,
      })
    }
    return items
  })

  function getTagById(tagId: string): TagDef | undefined {
    return doc.value.tags.find((t) => t.id === tagId)
  }

  function navigateToProcesses() {
    navigation.value = { level: 'processes', processId: null, systemId: null }
    selectedNodeId.value = null
  }

  function navigateToProcess(processId: string) {
    navigation.value = { level: 'process', processId, systemId: null }
    selectedNodeId.value = null
  }

  function navigateToSystem(systemId: string) {
    navigation.value = {
      level: 'system',
      processId: navigation.value.processId,
      systemId,
    }
    selectedNodeId.value = null
  }

  function selectNode(nodeId: string | null) {
    selectedNodeId.value = nodeId
  }

  function updateGraphNodes(nodes: GraphNode[]) {
    if (navigation.value.level === 'system') {
      const system = currentSystem.value
      if (system) system.graph.nodes = nodes
      return
    }
    const process = currentProcess.value
    if (process) process.graph.nodes = nodes
  }

  function updateGraphEdges(edges: GraphEdge[]) {
    if (navigation.value.level === 'system') {
      const system = currentSystem.value
      if (system) system.graph.edges = edges
      return
    }
    const process = currentProcess.value
    if (process) process.graph.edges = edges
  }

  // -- Tags --------------------------------------------------------------

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
        if (action.kind === 'addTags') action.tags = action.tags.filter((t) => t.tagId !== tagId)
        else if (action.kind === 'removeTags')
          action.tagIds = action.tagIds.filter((id) => id !== tagId)
        else if (action.kind === 'changeComp')
          action.changes = action.changes.filter((c) => c.tagId !== tagId)
      }
      for (const pin of system.outputs) pin.tagIds = pin.tagIds.filter((id) => id !== tagId)
    }
    for (const process of doc.value.processes) {
      process.components = process.components.filter((id) => id !== tagId)
    }
  }

  // -- Processes ---------------------------------------------------------

  function addProcess(name = 'New Process'): string {
    const process: Process = { id: nanoid(), name, components: [], graph: { nodes: [], edges: [] } }
    doc.value.processes.push(process)
    return process.id
  }

  function updateProcess(processId: string, patch: Partial<Pick<Process, 'name' | 'components'>>) {
    const process = doc.value.processes.find((p) => p.id === processId)
    if (process) Object.assign(process, patch)
  }

  function removeProcess(processId: string) {
    doc.value.processes = doc.value.processes.filter((p) => p.id !== processId)
    if (navigation.value.processId === processId) navigateToProcesses()
  }

  // -- Systems -----------------------------------------------------------

  function createSystemDef(name: string): System {
    const systemId = nanoid()
    const queryNodeId = `${systemId}-query`
    const textAction: Action = { id: nanoid(), kind: 'text', message: 'Hello' }
    const actionNodeId = `${systemId}-${textAction.id}`
    return {
      id: systemId,
      name,
      query: { conditions: [] },
      actions: [textAction],
      outputs: [defaultOutputPin()],
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
  }

  function systemInProcess(processId: string, systemId: string): boolean {
    const process = doc.value.processes.find((p) => p.id === processId)
    if (!process) return false
    return process.graph.nodes.some((n) => n.type === 'system' && n.data.systemId === systemId)
  }

  /** Add a reference node for an already-existing system to the given process. */
  function addExistingSystemToProcess(processId: string, systemId: string) {
    const process = doc.value.processes.find((p) => p.id === processId)
    const system = doc.value.systems.find((s) => s.id === systemId)
    if (!process || !system) return
    if (systemInProcess(processId, systemId)) return

    const y = 80 + process.graph.nodes.length * 160
    process.graph.nodes.push({
      id: `${processId}-${systemId}`,
      type: 'system',
      position: { x: 120, y },
      data: { systemId, label: system.name },
    })
  }

  /** Create a new system and add a reference node to the given process. */
  function addSystemToProcess(processId: string, name = 'New System'): string {
    const process = doc.value.processes.find((p) => p.id === processId)
    if (!process) return ''
    const system = createSystemDef(name)
    doc.value.systems.push(system)

    const y = 80 + process.graph.nodes.length * 160
    process.graph.nodes.push({
      id: `${processId}-${system.id}`,
      type: 'system',
      position: { x: 120, y },
      data: { systemId: system.id, label: name },
    })
    return system.id
  }

  /** Remove a system's reference node from a process, keeping the system definition. */
  function removeSystemFromProcess(processId: string, systemId: string) {
    const process = doc.value.processes.find((p) => p.id === processId)
    if (!process) return
    const removedNodeIds = new Set(
      process.graph.nodes.filter((n) => n.data.systemId === systemId).map((n) => n.id),
    )
    process.graph.nodes = process.graph.nodes.filter((n) => n.data.systemId !== systemId)
    process.graph.edges = process.graph.edges.filter(
      (e) => !removedNodeIds.has(e.source) && !removedNodeIds.has(e.target),
    )
    if (navigation.value.level === 'system' && navigation.value.systemId === systemId) {
      navigateToProcess(processId)
    }
  }

  function updateSystem(systemId: string, patch: Partial<Pick<System, 'name' | 'query'>>) {
    const system = doc.value.systems.find((s) => s.id === systemId)
    if (system) Object.assign(system, patch)
    if (patch.name) {
      for (const process of doc.value.processes) {
        for (const node of process.graph.nodes) {
          if (node.data.systemId === systemId) node.data.label = patch.name
        }
      }
    }
  }

  function removeSystem(systemId: string) {
    doc.value.systems = doc.value.systems.filter((s) => s.id !== systemId)
    for (const process of doc.value.processes) {
      const removedNodeIds = new Set(
        process.graph.nodes.filter((n) => n.data.systemId === systemId).map((n) => n.id),
      )
      process.graph.nodes = process.graph.nodes.filter((n) => n.data.systemId !== systemId)
      process.graph.edges = process.graph.edges.filter(
        (e) => !removedNodeIds.has(e.source) && !removedNodeIds.has(e.target),
      )
    }
    if (navigation.value.systemId === systemId) {
      if (navigation.value.processId) navigateToProcess(navigation.value.processId)
      else navigateToProcesses()
    }
  }

  // -- Output pins -------------------------------------------------------

  function addOutputPin(systemId: string) {
    const system = doc.value.systems.find((s) => s.id === systemId)
    if (!system) return
    system.outputs.push(defaultOutputPin(`output ${system.outputs.length + 1}`))
  }

  function updateOutputPin(systemId: string, pinId: string, patch: Partial<OutputPin>) {
    const system = doc.value.systems.find((s) => s.id === systemId)
    const pin = system?.outputs.find((p) => p.id === pinId)
    if (pin) Object.assign(pin, patch)
  }

  function removeOutputPin(systemId: string, pinId: string) {
    const system = doc.value.systems.find((s) => s.id === systemId)
    if (!system) return
    system.outputs = system.outputs.filter((p) => p.id !== pinId)
    const handle = `out-${pinId}`
    for (const process of doc.value.processes) {
      process.graph.edges = process.graph.edges.filter((e) => e.sourceHandle !== handle)
    }
  }

  // -- Actions (inner system graph) -------------------------------------

  function addAction(systemId: string, kind: ActionKind) {
    const system = doc.value.systems.find((s) => s.id === systemId)
    if (!system) return

    const action = createAction(kind)
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
      type: actionNodeType(kind),
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

  // -- Import / export ---------------------------------------------------

  function exportJson(): string {
    return JSON.stringify(doc.value, null, 2)
  }

  function importJson(json: string) {
    doc.value = migrateDoc(JSON.parse(json))
    navigateToProcesses()
  }

  function resetToSample() {
    doc.value = createSampleFlowDoc()
    navigateToProcesses()
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
    for (const tag of doc.value.tags) groups[tag.type].push(tag)
    return groups
  })

  function setFlowView(view: 'graph' | 'lanes') {
    flowView.value = view
  }

  function setShowAllComponents(value: boolean) {
    showAllComponents.value = value
  }

  return {
    doc,
    navigation,
    selectedNodeId,
    flowView,
    showAllComponents,
    setFlowView,
    setShowAllComponents,
    currentProcess,
    currentSystem,
    currentGraph,
    breadcrumb,
    selectedNode,
    tagsByType,
    getTagById,
    navigateToProcesses,
    navigateToProcess,
    navigateToSystem,
    selectNode,
    updateGraphNodes,
    updateGraphEdges,
    addTag,
    updateTag,
    removeTag,
    addProcess,
    updateProcess,
    removeProcess,
    systemInProcess,
    addExistingSystemToProcess,
    addSystemToProcess,
    removeSystemFromProcess,
    updateSystem,
    removeSystem,
    addOutputPin,
    updateOutputPin,
    removeOutputPin,
    addAction,
    updateAction,
    removeAction,
    exportJson,
    importJson,
    resetToSample,
  }
})
