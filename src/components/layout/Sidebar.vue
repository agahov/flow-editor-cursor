<script setup lang="ts">
import { MessageSquare, Tags } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import TagCatalog from '@/components/tags/TagCatalog.vue'
import { useEditorStore } from '@/stores/editor'

const store = useEditorStore()

function addTextAction() {
  if (store.navigation.systemId) store.addAction(store.navigation.systemId, 'text')
}

function addTagsAction() {
  if (store.navigation.systemId) store.addAction(store.navigation.systemId, 'addTags')
}
</script>

<template>
  <aside class="w-64 border-r bg-muted/20 flex flex-col shrink-0 h-full overflow-hidden">
    <TagCatalog />

    <Separator v-if="store.navigation.level === 'system'" />

    <div v-if="store.navigation.level === 'system'" class="p-4 space-y-3">
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add Action</p>
      <div class="flex flex-col gap-2">
        <Button size="sm" variant="outline" class="justify-start" @click="addTextAction">
          <MessageSquare class="h-3.5 w-3.5" />
          Text Action
        </Button>
        <Button size="sm" variant="outline" class="justify-start" @click="addTagsAction">
          <Tags class="h-3.5 w-3.5" />
          Add Tags Action
        </Button>
      </div>
    </div>

    <div v-else class="p-4">
      <p class="text-xs text-muted-foreground">
        Double-click a system node to edit its query and actions.
      </p>
    </div>
  </aside>
</template>
