<script setup lang="ts">
import { Handle, Position, type NodeProps } from '@vue-flow/core'
import { computed } from 'vue'
import { Eraser } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { useEditorStore } from '@/stores/editor'

const props = defineProps<NodeProps>()
const store = useEditorStore()

const action = computed(() => {
  const system = store.doc.systems.find((s) => s.id === props.data.systemId)
  return system?.actions.find((a) => a.id === props.data.actionId)
})

const tagNames = computed(() => {
  if (action.value?.kind !== 'removeTags') return []
  return action.value.tagIds.map((id) => store.getTagById(id)?.name ?? id)
})
</script>

<template>
  <div
    class="remove-tags-node min-w-[180px] rounded-lg border-2 border-red-400/50 bg-red-50 dark:bg-red-950/30 shadow-md"
    :class="{ 'ring-2 ring-red-500': selected }"
  >
    <Handle type="target" :position="Position.Left" class="!bg-red-500" />
    <Handle type="source" :position="Position.Right" class="!bg-red-500" />

    <div class="px-3 py-2 border-b border-red-200 dark:border-red-800 flex items-center gap-2">
      <Eraser class="h-4 w-4 text-red-600" />
      <span class="font-semibold text-sm text-red-900 dark:text-red-100">Remove Tags</span>
    </div>

    <div class="p-3">
      <div class="flex flex-wrap gap-1">
        <Badge v-for="(name, i) in tagNames" :key="i" variant="outline" class="text-[10px] border-red-300">
          -{{ name }}
        </Badge>
        <span v-if="tagNames.length === 0" class="text-xs text-muted-foreground">No tags</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.remove-tags-node :deep(.vue-flow__handle) {
  width: 10px;
  height: 10px;
}
</style>
