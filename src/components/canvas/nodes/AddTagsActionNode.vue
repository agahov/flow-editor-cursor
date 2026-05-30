<script setup lang="ts">
import { Handle, Position, type NodeProps } from '@vue-flow/core'
import { computed } from 'vue'
import { Tags } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { useEditorStore } from '@/stores/editor'

const props = defineProps<NodeProps>()
const store = useEditorStore()

const action = computed(() => {
  const system = store.doc.systems.find((s) => s.id === props.data.systemId)
  return system?.actions.find((a) => a.id === props.data.actionId)
})

const tagNames = computed(() => {
  if (action.value?.kind !== 'addTags') return []
  return action.value.tags.map((t) => store.getTagById(t.tagId)?.name ?? t.tagId)
})
</script>

<template>
  <div
    class="add-tags-node min-w-[180px] rounded-lg border-2 border-orange-400/50 bg-orange-50 dark:bg-orange-950/30 shadow-md"
    :class="{ 'ring-2 ring-orange-500': selected }"
  >
    <Handle type="target" :position="Position.Left" class="!bg-orange-500" />
    <Handle type="source" :position="Position.Right" class="!bg-orange-500" />

    <div class="px-3 py-2 border-b border-orange-200 dark:border-orange-800 flex items-center gap-2">
      <Tags class="h-4 w-4 text-orange-600" />
      <span class="font-semibold text-sm text-orange-900 dark:text-orange-100">Add Tags</span>
    </div>

    <div class="p-3">
      <div class="flex flex-wrap gap-1">
        <Badge
          v-for="(name, i) in tagNames"
          :key="i"
          variant="outline"
          class="text-[10px] border-orange-300"
        >
          +{{ name }}
        </Badge>
        <span v-if="tagNames.length === 0" class="text-xs text-muted-foreground">No tags</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.add-tags-node :deep(.vue-flow__handle) {
  width: 10px;
  height: 10px;
}
</style>
