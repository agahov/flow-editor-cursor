<script setup lang="ts">
import { MessageSquare, Tags, Eraser, Pencil } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import TagCatalog from '@/components/tags/TagCatalog.vue'
import SystemList from '@/components/layout/SystemList.vue'
import { useEditorStore } from '@/stores/editor'
import type { ActionKind } from '@/types/systems'

const store = useEditorStore()

function add(kind: ActionKind) {
  if (store.navigation.systemId) store.addAction(store.navigation.systemId, kind)
}
</script>

<template>
  <aside class="w-64 border-r bg-muted/20 flex flex-col shrink-0 h-full overflow-hidden">
    <div class="flex-1 min-h-0 overflow-hidden">
      <TagCatalog />
    </div>

    <Separator v-if="store.navigation.level === 'system'" />

    <div v-if="store.navigation.level === 'system'" class="p-4 space-y-3 shrink-0">
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add Command</p>
      <div class="flex flex-col gap-2">
        <Button size="sm" variant="outline" class="justify-start" @click="add('addTags')">
          <Tags class="h-3.5 w-3.5" />
          Add Tag
        </Button>
        <Button size="sm" variant="outline" class="justify-start" @click="add('removeTags')">
          <Eraser class="h-3.5 w-3.5" />
          Remove Tag
        </Button>
        <Button size="sm" variant="outline" class="justify-start" @click="add('changeComp')">
          <Pencil class="h-3.5 w-3.5" />
          Change Component
        </Button>
        <Button size="sm" variant="outline" class="justify-start" @click="add('text')">
          <MessageSquare class="h-3.5 w-3.5" />
          Text Note
        </Button>
      </div>
    </div>

    <template v-else-if="store.navigation.level === 'process'">
      <Separator />
      <div class="flex-1 min-h-0 overflow-y-auto">
        <SystemList />
        <div class="p-4 pt-0">
          <p class="text-xs text-muted-foreground">
            Double-click a system to edit its query and commands. Drag from an output pin to an
            input to wire a flow.
          </p>
        </div>
      </div>
    </template>

    <div v-else class="p-4 shrink-0">
      <p class="text-xs text-muted-foreground">Open a process to edit its systems and flows.</p>
    </div>
  </aside>
</template>
