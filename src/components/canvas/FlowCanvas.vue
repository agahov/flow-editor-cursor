<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { VueFlow, type Connection, type Node, type Edge, type NodeChange, type EdgeChange } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'
import { useEditorStore } from '@/stores/editor'
import { computeProcessFlow } from '@/lib/data-flow'
import SystemNode from './nodes/SystemNode.vue'
import QueryNode from './nodes/QueryNode.vue'
import TextActionNode from './nodes/TextActionNode.vue'
import AddTagsActionNode from './nodes/AddTagsActionNode.vue'
import RemoveTagsActionNode from './nodes/RemoveTagsActionNode.vue'
import ChangeCompActionNode from './nodes/ChangeCompActionNode.vue'
import DataFlowEdge from './edges/DataFlowEdge.vue'

const store = useEditorStore()

const isProcessLevel = computed(() => store.navigation.level === 'process')

const flowResult = computed(() =>
  isProcessLevel.value && store.currentProcess
    ? computeProcessFlow(store.currentProcess, store.doc.systems, store.doc.tags)
    : null,
)

const nodes = computed<Node[]>(() => store.currentGraph.nodes)

const edges = computed<Edge[]>(() =>
  store.currentGraph.edges.map((e) => {
    if (isProcessLevel.value) {
      return {
        ...e,
        type: 'dataFlow',
        data: {
          flow: flowResult.value?.edgeFlows.get(e.id),
          processComponents: store.currentProcess?.components ?? [],
          showAll: store.showAllComponents,
        },
      }
    }
    return { ...e, style: { strokeWidth: 2 } }
  }),
)

const flowKey = computed(
  () => `${store.navigation.level}-${store.navigation.processId}-${store.navigation.systemId}`,
)

function onConnect(connection: Connection) {
  if (!connection.source || !connection.target) return
  const nextEdges = [...store.currentGraph.edges]
  const exists = nextEdges.some(
    (e) =>
      e.source === connection.source &&
      e.target === connection.target &&
      e.sourceHandle === (connection.sourceHandle ?? undefined),
  )
  if (exists) return
  nextEdges.push({
    id: `edge-${connection.source}-${connection.sourceHandle ?? 'out'}-${connection.target}`,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle ?? undefined,
    targetHandle: connection.targetHandle ?? undefined,
    type: isProcessLevel.value ? 'dataFlow' : undefined,
  })
  store.updateGraphEdges(nextEdges)
}

const isDragging = ref(false)

function onNodeDragStart() {
  isDragging.value = true
}

function onNodeDragStop({ nodes: draggedNodes }: { nodes: Node[] }) {
  isDragging.value = false
  const moved = new Map(draggedNodes.map((n) => [n.id, n.position]))
  const updated = store.currentGraph.nodes.map((n) =>
    moved.has(n.id) ? { ...n, position: moved.get(n.id)! } : n,
  )
  store.updateGraphNodes(updated)
}

function onNodesChange(changes: NodeChange[]) {
  for (const change of changes) {
    if (change.type === 'select') store.selectNode(change.selected ? change.id : null)
    if (change.type === 'remove') handleNodeRemove(change.id)
  }
}

function onEdgesChange(changes: EdgeChange[]) {
  let nextEdges = [...store.currentGraph.edges]
  for (const change of changes) {
    if (change.type === 'remove') nextEdges = nextEdges.filter((e) => e.id !== change.id)
  }
  store.updateGraphEdges(nextEdges)
}

function handleNodeRemove(nodeId: string) {
  if (isProcessLevel.value) {
    const node = store.currentGraph.nodes.find((n) => n.id === nodeId)
    if (node?.data.systemId && store.navigation.processId) {
      store.removeSystemFromProcess(store.navigation.processId, node.data.systemId)
    }
    return
  }
  const node = store.currentGraph.nodes.find((n) => n.id === nodeId)
  if (!node || !store.navigation.systemId) return
  if (node.type === 'query') return
  if (node.data.actionId) store.removeAction(store.navigation.systemId, node.data.actionId)
}

function onNodeDoubleClick(event: { node: Node }) {
  if (isProcessLevel.value && event.node.type === 'system') {
    const systemId = event.node.data.systemId
    if (systemId) store.navigateToSystem(systemId)
  }
}

function onPaneClick() {
  store.selectNode(null)
}

watch(
  () => store.navigation,
  () => {
    store.selectNode(null)
  },
  { deep: true },
)
</script>

<template>
  <div class="h-full w-full">
    <VueFlow
      :key="flowKey"
      :nodes="nodes"
      :edges="edges"
      :default-viewport="{ zoom: 1 }"
      :min-zoom="0.2"
      :max-zoom="2"
      fit-view-on-init
      @connect="onConnect"
      @node-drag-start="onNodeDragStart"
      @node-drag-stop="onNodeDragStop"
      @nodes-change="onNodesChange"
      @edges-change="onEdgesChange"
      @node-double-click="onNodeDoubleClick"
      @pane-click="onPaneClick"
    >
      <Background pattern-color="#aaa" :gap="16" />
      <Controls />
      <MiniMap v-if="!isDragging" />

      <template #node-system="nodeProps">
        <SystemNode v-bind="nodeProps" />
      </template>
      <template #node-query="nodeProps">
        <QueryNode v-bind="nodeProps" />
      </template>
      <template #node-textAction="nodeProps">
        <TextActionNode v-bind="nodeProps" />
      </template>
      <template #node-addTagsAction="nodeProps">
        <AddTagsActionNode v-bind="nodeProps" />
      </template>
      <template #node-removeTagsAction="nodeProps">
        <RemoveTagsActionNode v-bind="nodeProps" />
      </template>
      <template #node-changeCompAction="nodeProps">
        <ChangeCompActionNode v-bind="nodeProps" />
      </template>

      <template #edge-dataFlow="edgeProps">
        <DataFlowEdge v-bind="edgeProps" />
      </template>
    </VueFlow>
  </div>
</template>
