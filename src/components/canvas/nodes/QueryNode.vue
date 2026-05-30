<script setup lang="ts">
import { Handle, Position, type NodeProps } from '@vue-flow/core'
import { computed } from 'vue'
import { Filter } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { useEditorStore } from '@/stores/editor'

const props = defineProps<NodeProps>()
const store = useEditorStore()

const system = computed(() =>
  store.doc.systems.find((s) => s.id === props.data.systemId),
)

const conditions = computed(() =>
  (system.value?.query.conditions ?? []).map((c) => {
    const tag = store.getTagById(c.tagId)
    return { ...c, name: tag?.name ?? c.tagId }
  }),
)
</script>

<template>
  <div
    class="query-node min-w-[200px] rounded-lg border-2 border-blue-400/50 bg-blue-50 dark:bg-blue-950/30 shadow-md"
    :class="{ 'ring-2 ring-blue-500': selected }"
  >
    <Handle type="source" :position="Position.Right" class="!bg-blue-500" />

    <div class="px-3 py-2 border-b border-blue-200 dark:border-blue-800 flex items-center gap-2">
      <Filter class="h-4 w-4 text-blue-600" />
      <span class="font-semibold text-sm text-blue-900 dark:text-blue-100">Query</span>
    </div>

    <div class="p-3">
      <div class="flex flex-wrap gap-1">
        <Badge
          v-for="(cond, i) in conditions"
          :key="i"
          variant="outline"
          class="text-[10px] border-blue-300"
        >
          {{ cond.mode === 'absent' ? 'NOT ' : '' }}{{ cond.name }}
        </Badge>
        <span v-if="conditions.length === 0" class="text-xs text-muted-foreground">
          Select to edit conditions
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.query-node :deep(.vue-flow__handle) {
  width: 10px;
  height: 10px;
}
</style>
