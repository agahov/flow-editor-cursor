<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus, Pencil, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEditorStore } from '@/stores/editor'
import { TAG_TYPE_COLORS, TAG_TYPE_LABELS, type TagDef, type TagType } from '@/types/tags'
import TagEditor from './TagEditor.vue'

const store = useEditorStore()
const editorOpen = ref(false)
const editingTag = ref<TagDef | null>(null)

const tagTypes = Object.keys(TAG_TYPE_LABELS) as TagType[]

function openCreate() {
  editingTag.value = null
  editorOpen.value = true
}

function openEdit(tag: TagDef) {
  editingTag.value = { ...tag, fields: tag.fields ? [...tag.fields] : undefined }
  editorOpen.value = true
}

function onSave(tag: TagDef) {
  if (editingTag.value?.id) {
    store.updateTag(editingTag.value.id, tag)
  } else {
    store.addTag(tag)
  }
  editorOpen.value = false
}

function onDelete(tagId: string) {
  if (confirm('Delete this tag?')) store.removeTag(tagId)
}

const totalTags = computed(() => store.doc.tags.length)
</script>

<template>
  <Card class="border-0 shadow-none rounded-none h-full flex flex-col">
    <CardHeader class="pb-3 shrink-0">
      <div class="flex items-center justify-between">
        <CardTitle class="text-sm">Tags ({{ totalTags }})</CardTitle>
        <Button size="sm" variant="outline" @click="openCreate">
          <Plus class="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </CardHeader>
    <CardContent class="space-y-4 overflow-y-auto flex-1 min-h-0">
      <div v-for="type in tagTypes" :key="type">
        <p class="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          {{ TAG_TYPE_LABELS[type] }}
        </p>
        <div v-if="store.tagsByType[type].length === 0" class="text-xs text-muted-foreground mb-3">
          No tags
        </div>
        <div v-else class="space-y-1.5 mb-3">
          <div
            v-for="tag in store.tagsByType[type]"
            :key="tag.id"
            class="flex items-center justify-between rounded-md border px-2 py-1.5 hover:bg-muted/50 group"
          >
            <div class="flex items-center gap-2 min-w-0">
              <Badge :class="TAG_TYPE_COLORS[type]" variant="outline" class="text-[10px] shrink-0">
                {{ TAG_TYPE_LABELS[type] }}
              </Badge>
              <span class="text-sm truncate">{{ tag.name }}</span>
            </div>
            <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="ghost" class="h-7 w-7" @click="openEdit(tag)">
                <Pencil class="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" class="h-7 w-7" @click="onDelete(tag.id)">
                <Trash2 class="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>

  <TagEditor v-model:open="editorOpen" :tag="editingTag" @save="onSave" />
</template>
