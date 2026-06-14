<script setup lang="ts">
import { computed } from 'vue'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@vue-flow/core'
import { AlertTriangle } from 'lucide-vue-next'
import type { EdgeFlow, Strand } from '@/types/data-flow'
import { STRAND_STATUS_STROKE, STRAND_STATUS_BADGE } from '@/types/data-flow'

const props = defineProps<EdgeProps>()

interface DataFlowEdgeData {
  flow?: EdgeFlow
  processComponents?: string[]
  showAll?: boolean
}

const edgeData = computed(() => (props.data ?? {}) as DataFlowEdgeData)
const strands = computed<Strand[]>(() => edgeData.value.flow?.strands ?? [])
const warnings = computed<string[]>(() => edgeData.value.flow?.warnings ?? [])

function isDim(strand: Strand): boolean {
  if (edgeData.value.showAll) return false
  const comps = edgeData.value.processComponents ?? []
  if (comps.length === 0) return false
  return !comps.includes(strand.tagId)
}

const baseline = computed(
  () =>
    getSmoothStepPath({
      sourceX: props.sourceX,
      sourceY: props.sourceY,
      sourcePosition: props.sourcePosition,
      targetX: props.targetX,
      targetY: props.targetY,
      targetPosition: props.targetPosition,
    })[0],
)

const GAP = 5

const strandPaths = computed(() =>
  strands.value.map((strand, i) => {
    const offset = (i - (strands.value.length - 1) / 2) * GAP
    const [path] = getSmoothStepPath({
      sourceX: props.sourceX + offset,
      sourceY: props.sourceY,
      sourcePosition: props.sourcePosition,
      targetX: props.targetX + offset,
      targetY: props.targetY,
      targetPosition: props.targetPosition,
    })
    return { strand, path }
  }),
)

const labelPos = computed(() => {
  const [, x, y] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  })
  return { x, y }
})

// Components worth labelling: anything that changed.
const labelStrands = computed(() =>
  strands.value.filter(
    (s) => s.status === 'added' || s.status === 'deleted' || s.status === 'updated',
  ),
)
</script>

<template>
  <!-- gray channel -->
  <BaseEdge :path="baseline" :style="{ stroke: '#9ca3af', strokeWidth: 12, opacity: 0.25 }" />

  <!-- one colored string per component -->
  <path
    v-for="(item, i) in strandPaths"
    :key="i"
    :d="item.path"
    fill="none"
    :stroke="STRAND_STATUS_STROKE[item.strand.status]"
    :stroke-width="item.strand.status === 'unchanged' ? 1.5 : 2.5"
    :stroke-dasharray="item.strand.status === 'deleted' ? '4 3' : undefined"
    :style="{ opacity: isDim(item.strand) ? 0.15 : 0.95 }"
  />

  <EdgeLabelRenderer>
    <div
      class="nodrag nopan absolute flex flex-col items-center gap-1"
      :style="{ transform: `translate(-50%, -50%) translate(${labelPos.x}px, ${labelPos.y}px)` }"
    >
      <div v-if="labelStrands.length" class="flex flex-wrap justify-center gap-1">
        <span
          v-for="s in labelStrands"
          :key="s.tagId"
          class="rounded border px-1.5 py-0.5 text-[9px] font-medium shadow-sm"
          :class="[STRAND_STATUS_BADGE[s.status], { 'opacity-30': isDim(s) }]"
        >
          {{ s.name }}
        </span>
      </div>
      <div
        v-if="warnings.length"
        class="flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-800 shadow-sm"
        :title="warnings.join('\n')"
      >
        <AlertTriangle class="h-3 w-3" />
        {{ warnings.length }}
      </div>
    </div>
  </EdgeLabelRenderer>
</template>
