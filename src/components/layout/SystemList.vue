<script setup lang="ts">
import { computed } from 'vue'
import { Plus, Minus, Trash2, Boxes } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useEditorStore } from '@/stores/editor'

const store = useEditorStore()

const processId = computed(() => store.navigation.processId)

function isInProcess(systemId: string): boolean {
  return processId.value ? store.systemInProcess(processId.value, systemId) : false
}

function isSelected(systemId: string): boolean {
  return !!processId.value && store.selectedNodeId === `${processId.value}-${systemId}`
}

function addToProcess(systemId: string) {
  if (processId.value) store.addExistingSystemToProcess(processId.value, systemId)
}

function removeFromProcess(systemId: string) {
  if (processId.value) store.removeSystemFromProcess(processId.value, systemId)
}

function createSystem() {
  if (!processId.value) return
  const systemId = store.addSystemToProcess(processId.value)
  store.selectNode(`${processId.value}-${systemId}`)
}

function deleteSystem(systemId: string, name: string) {
  if (confirm(`Delete system "${name}" completely? This removes it from every process.`)) {
    store.removeSystem(systemId)
  }
}
</script>

<template>
  <div class="p-4 space-y-3">
    <div class="flex items-center justify-between">
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Systems ({{ store.doc.systems.length }})
      </p>
      <Button size="sm" variant="outline" @click="createSystem">
        <Plus class="h-3.5 w-3.5" />
        New
      </Button>
    </div>

    <p
      v-if="store.doc.systems.length === 0"
      class="text-xs text-muted-foreground"
    >
      No systems yet. Create one to add it to this process.
    </p>

    <div v-else class="space-y-1.5">
      <div
        v-for="system in store.doc.systems"
        :key="system.id"
        class="flex items-center justify-between rounded-md border px-2 py-1.5 hover:bg-muted/50 group"
        :class="[
          isInProcess(system.id) ? 'border-primary/40 bg-primary/5' : '',
          isSelected(system.id) ? 'ring-1 ring-primary' : '',
        ]"
      >
        <div class="flex items-center gap-2 min-w-0">
          <Boxes class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span class="text-sm truncate">{{ system.name }}</span>
          <Badge v-if="isInProcess(system.id)" variant="outline" class="text-[10px] shrink-0">
            in process
          </Badge>
        </div>
        <div class="flex gap-0.5 shrink-0">
          <Button
            v-if="isInProcess(system.id)"
            size="icon"
            variant="ghost"
            class="h-7 w-7"
            title="Remove from this process"
            @click="removeFromProcess(system.id)"
          >
            <Minus class="h-3.5 w-3.5" />
          </Button>
          <Button
            v-else
            size="icon"
            variant="ghost"
            class="h-7 w-7"
            title="Add to this process"
            @click="addToProcess(system.id)"
          >
            <Plus class="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            class="h-7 w-7 text-destructive"
            title="Delete system completely"
            @click="deleteSystem(system.id, system.name)"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
