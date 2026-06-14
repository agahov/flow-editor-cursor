<script setup lang="ts">
import { Handle, Position, type NodeProps } from '@vue-flow/core'
import { computed } from 'vue'
import { ChevronRight, Search } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { useEditorStore } from '@/stores/editor'
import { ACTION_KIND_LABELS } from '@/types/systems'

const props = defineProps<NodeProps>()
const store = useEditorStore()

const system = computed(() => store.doc.systems.find((s) => s.id === props.data.systemId))

const queryTags = computed(() =>
  (system.value?.query.conditions ?? []).map((c) => {
    const tag = store.getTagById(c.tagId)
    return { name: tag?.name ?? c.tagId, mode: c.mode }
  }),
)

const actionSummary = computed(() =>
  (system.value?.actions ?? []).map((a) => ACTION_KIND_LABELS[a.kind]),
)

const outputs = computed(() => system.value?.outputs ?? [])

function pinLeft(index: number, total: number): string {
  return `${((index + 1) / (total + 1)) * 100}%`
}

function onDoubleClick() {
  if (props.data.systemId) store.navigateToSystem(props.data.systemId)
}
</script>

<template>
  <div
    class="system-node min-w-[240px] rounded-lg border-2 border-primary/30 bg-card shadow-md cursor-pointer select-none"
    :class="{ 'ring-2 ring-primary': props.selected }"
    @dblclick.stop="onDoubleClick"
  >
    <Handle id="in" type="target" :position="Position.Top" class="!bg-primary" />

    <div class="bg-primary/10 px-3 py-2 border-b flex items-center gap-2">
      <Search class="h-4 w-4 text-primary" />
      <span class="font-semibold text-sm">{{ system?.name ?? data.label }}</span>
    </div>

    <div class="p-3 space-y-2">
      <div>
        <p class="text-[10px] uppercase text-muted-foreground mb-1">Query</p>
        <div class="flex flex-wrap gap-1">
          <Badge v-for="(tag, i) in queryTags" :key="i" variant="outline" class="text-[10px]">
            {{ tag.mode === 'absent' ? '!' : '' }}{{ tag.name }}
          </Badge>
          <span v-if="queryTags.length === 0" class="text-xs text-muted-foreground">
            No conditions
          </span>
        </div>
      </div>

      <div>
        <p class="text-[10px] uppercase text-muted-foreground mb-1">Commands</p>
        <div class="flex flex-wrap gap-1">
          <Badge v-for="(action, i) in actionSummary" :key="i" variant="secondary" class="text-[10px]">
            {{ action }}
          </Badge>
          <span v-if="actionSummary.length === 0" class="text-xs text-muted-foreground">
            No commands
          </span>
        </div>
      </div>

      <div v-if="outputs.length > 1">
        <p class="text-[10px] uppercase text-muted-foreground mb-1">Outputs</p>
        <div class="flex flex-wrap gap-1">
          <Badge v-for="pin in outputs" :key="pin.id" variant="outline" class="text-[10px]">
            {{ pin.label }}
          </Badge>
        </div>
      </div>

      <p class="text-[10px] text-muted-foreground flex items-center gap-1 pt-1">
        <ChevronRight class="h-3 w-3" />
        Double-click to open
      </p>
    </div>

    <Handle
      v-for="(pin, i) in outputs"
      :key="pin.id"
      :id="`out-${pin.id}`"
      type="source"
      :position="Position.Bottom"
      class="!bg-primary"
      :style="{ left: pinLeft(i, outputs.length) }"
    />
  </div>
</template>

<style scoped>
.system-node :deep(.vue-flow__handle) {
  width: 10px;
  height: 10px;
}
</style>
