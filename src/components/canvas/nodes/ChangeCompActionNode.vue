<script setup lang="ts">
import { Handle, Position, type NodeProps } from '@vue-flow/core'
import { computed } from 'vue'
import { Pencil } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { useEditorStore } from '@/stores/editor'

const props = defineProps<NodeProps>()
const store = useEditorStore()

const action = computed(() => {
  const system = store.doc.systems.find((s) => s.id === props.data.systemId)
  return system?.actions.find((a) => a.id === props.data.actionId)
})

const tagNames = computed(() => {
  if (action.value?.kind !== 'changeComp') return []
  return action.value.changes.map((c) => store.getTagById(c.tagId)?.name ?? c.tagId)
})
</script>

<template>
  <div
    class="change-comp-node min-w-[180px] rounded-lg border-2 border-green-400/50 bg-green-50 dark:bg-green-950/30 shadow-md"
    :class="{ 'ring-2 ring-green-500': selected }"
  >
    <Handle type="target" :position="Position.Left" class="!bg-green-500" />
    <Handle type="source" :position="Position.Right" class="!bg-green-500" />

    <div class="px-3 py-2 border-b border-green-200 dark:border-green-800 flex items-center gap-2">
      <Pencil class="h-4 w-4 text-green-600" />
      <span class="font-semibold text-sm text-green-900 dark:text-green-100">Change Comp</span>
    </div>

    <div class="p-3">
      <div class="flex flex-wrap gap-1">
        <Badge v-for="(name, i) in tagNames" :key="i" variant="outline" class="text-[10px] border-green-300">
          ~{{ name }}
        </Badge>
        <span v-if="tagNames.length === 0" class="text-xs text-muted-foreground">No components</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.change-comp-node :deep(.vue-flow__handle) {
  width: 10px;
  height: 10px;
}
</style>
