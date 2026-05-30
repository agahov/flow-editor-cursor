<script setup lang="ts">
import { Handle, Position, type NodeProps } from '@vue-flow/core'
import { computed } from 'vue'
import { MessageSquare } from 'lucide-vue-next'
import { useEditorStore } from '@/stores/editor'

const props = defineProps<NodeProps>()
const store = useEditorStore()

const action = computed(() => {
  const system = store.doc.systems.find((s) => s.id === props.data.systemId)
  return system?.actions.find((a) => a.id === props.data.actionId)
})

const message = computed(() =>
  action.value?.kind === 'text' ? action.value.message : '',
)
</script>

<template>
  <div
    class="text-action-node min-w-[180px] rounded-lg border-2 border-emerald-400/50 bg-emerald-50 dark:bg-emerald-950/30 shadow-md"
    :class="{ 'ring-2 ring-emerald-500': selected }"
  >
    <Handle type="target" :position="Position.Left" class="!bg-emerald-500" />
    <Handle type="source" :position="Position.Right" class="!bg-emerald-500" />

    <div class="px-3 py-2 border-b border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
      <MessageSquare class="h-4 w-4 text-emerald-600" />
      <span class="font-semibold text-sm text-emerald-900 dark:text-emerald-100">Text</span>
    </div>

    <div class="p-3">
      <p class="text-xs text-muted-foreground truncate max-w-[160px]">
        {{ message || 'Empty message' }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.text-action-node :deep(.vue-flow__handle) {
  width: 10px;
  height: 10px;
}
</style>
