<script setup lang="ts">
import { computed } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useEditorStore } from '@/stores/editor'
import type { Condition, ConditionMode } from '@/types/systems'
import { TAG_TYPE_LABELS } from '@/types/tags'

const store = useEditorStore()

const selectedNode = computed(() => store.selectedNode)
const system = computed(() => store.currentSystem)

const isFlowSystemNode = computed(
  () => store.navigation.level === 'flow' && selectedNode.value?.type === 'system',
)

const isQueryNode = computed(
  () => store.navigation.level === 'system' && selectedNode.value?.type === 'query',
)

const isTextAction = computed(
  () => store.navigation.level === 'system' && selectedNode.value?.type === 'textAction',
)

const isAddTagsAction = computed(
  () => store.navigation.level === 'system' && selectedNode.value?.type === 'addTagsAction',
)

const selectedSystem = computed(() => {
  if (isFlowSystemNode.value && selectedNode.value?.data.systemId) {
    return store.doc.systems.find((s) => s.id === selectedNode.value!.data.systemId)
  }
  return system.value
})

const selectedAction = computed(() => {
  if (!system.value || !selectedNode.value?.data.actionId) return null
  return system.value.actions.find((a) => a.id === selectedNode.value!.data.actionId)
})

function updateSystemName(name: string) {
  if (!selectedSystem.value) return
  store.updateSystem(selectedSystem.value.id, { name })
}

function addCondition() {
  if (!system.value || store.doc.tags.length === 0) return
  const conditions: Condition[] = [
    ...system.value.query.conditions,
    { tagId: store.doc.tags[0]!.id, mode: 'has' },
  ]
  store.updateSystem(system.value.id, { query: { conditions } })
}

function updateCondition(index: number, patch: Partial<Condition>) {
  if (!system.value) return
  const conditions = system.value.query.conditions.map((c, i) =>
    i === index ? { ...c, ...patch } : c,
  )
  store.updateSystem(system.value.id, { query: { conditions } })
}

function removeCondition(index: number) {
  if (!system.value) return
  const conditions = system.value.query.conditions.filter((_, i) => i !== index)
  store.updateSystem(system.value.id, { query: { conditions } })
}

function updateTextMessage(message: string) {
  if (!system.value || !selectedAction.value) return
  store.updateAction(system.value.id, selectedAction.value.id, { message })
}

function addTagToAction() {
  if (!system.value || !selectedAction.value || selectedAction.value.kind !== 'addTags') return
  if (store.doc.tags.length === 0) return
  const tags = [...selectedAction.value.tags, { tagId: store.doc.tags[0]!.id }]
  store.updateAction(system.value.id, selectedAction.value.id, { tags })
}

function updateActionTag(index: number, tagId: string) {
  if (!system.value || !selectedAction.value || selectedAction.value.kind !== 'addTags') return
  const tags = selectedAction.value.tags.map((t, i) => (i === index ? { ...t, tagId } : t))
  store.updateAction(system.value.id, selectedAction.value.id, { tags })
}

function removeActionTag(index: number) {
  if (!system.value || !selectedAction.value || selectedAction.value.kind !== 'addTags') return
  const tags = selectedAction.value.tags.filter((_, i) => i !== index)
  store.updateAction(system.value.id, selectedAction.value.id, { tags })
}

function deleteSelectedAction() {
  if (!system.value || !selectedAction.value) return
  store.removeAction(system.value.id, selectedAction.value.id)
}

const modes: ConditionMode[] = ['has', 'absent']
</script>

<template>
  <aside class="w-72 border-l bg-muted/20 flex flex-col shrink-0 h-full overflow-y-auto">
    <Card class="border-0 shadow-none rounded-none">
      <CardHeader class="pb-3">
        <CardTitle class="text-sm">Inspector</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <p v-if="!selectedNode" class="text-sm text-muted-foreground">
          Select a node to edit its properties.
        </p>

        <!-- Flow level: System node -->
        <template v-if="isFlowSystemNode && selectedSystem">
          <div class="space-y-2">
            <Label for="system-name">System Name</Label>
            <Input
              id="system-name"
              :model-value="selectedSystem.name"
              @update:model-value="(v) => updateSystemName(String(v))"
            />
          </div>
          <Separator />
          <div>
            <p class="text-xs text-muted-foreground mb-2">Query preview</p>
            <div class="flex flex-wrap gap-1">
              <Badge
                v-for="(c, i) in selectedSystem.query.conditions"
                :key="i"
                variant="outline"
                class="text-[10px]"
              >
                {{ c.mode === 'absent' ? '!' : '' }}{{ store.getTagById(c.tagId)?.name ?? c.tagId }}
              </Badge>
            </div>
          </div>
          <div>
            <p class="text-xs text-muted-foreground mb-2">Actions ({{ selectedSystem.actions.length }})</p>
            <ul class="text-xs space-y-1">
              <li v-for="action in selectedSystem.actions" :key="action.id">
                {{ action.kind === 'text' ? `Text: "${action.message}"` : `Add Tags (${action.tags.length})` }}
              </li>
            </ul>
          </div>
        </template>

        <!-- System level: Query node -->
        <template v-if="isQueryNode && system">
          <div class="flex items-center justify-between">
            <Label>Query Conditions</Label>
            <Button size="sm" variant="outline" @click="addCondition">
              <Plus class="h-3 w-3" />
            </Button>
          </div>
          <div v-if="system.query.conditions.length === 0" class="text-xs text-muted-foreground">
            No conditions. Add tags to match entities.
          </div>
          <div
            v-for="(cond, i) in system.query.conditions"
            :key="i"
            class="space-y-2 rounded-md border p-2"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium">Condition {{ i + 1 }}</span>
              <Button size="icon" variant="ghost" class="h-6 w-6" @click="removeCondition(i)">
                <Trash2 class="h-3 w-3" />
              </Button>
            </div>
            <Select
              :model-value="cond.tagId"
              @update:model-value="(v) => updateCondition(i, { tagId: String(v) })"
            >
              <option v-for="tag in store.doc.tags" :key="tag.id" :value="tag.id">
                {{ tag.name }} ({{ TAG_TYPE_LABELS[tag.type] }})
              </option>
            </Select>
            <Select
              :model-value="cond.mode"
              @update:model-value="(v) => updateCondition(i, { mode: v as ConditionMode })"
            >
              <option v-for="m in modes" :key="m" :value="m">{{ m }}</option>
            </Select>
          </div>
        </template>

        <!-- System level: Text action -->
        <template v-if="isTextAction && selectedAction?.kind === 'text'">
          <div class="space-y-2">
            <Label for="text-message">Message</Label>
            <Input
              id="text-message"
              :model-value="selectedAction.message"
              @update:model-value="(v) => updateTextMessage(String(v))"
            />
          </div>
          <Button size="sm" variant="destructive" @click="deleteSelectedAction">
            <Trash2 class="h-3 w-3" />
            Delete Action
          </Button>
        </template>

        <!-- System level: Add Tags action -->
        <template v-if="isAddTagsAction && selectedAction?.kind === 'addTags'">
          <div class="flex items-center justify-between">
            <Label>Tags to Add</Label>
            <Button size="sm" variant="outline" @click="addTagToAction">
              <Plus class="h-3 w-3" />
            </Button>
          </div>
          <div v-if="selectedAction.tags.length === 0" class="text-xs text-muted-foreground">
            No tags selected.
          </div>
          <div
            v-for="(entry, i) in selectedAction.tags"
            :key="i"
            class="flex gap-2 items-center"
          >
            <Select
              class="flex-1"
              :model-value="entry.tagId"
              @update:model-value="(v) => updateActionTag(i, String(v))"
            >
              <option v-for="tag in store.doc.tags" :key="tag.id" :value="tag.id">
                {{ tag.name }}
              </option>
            </Select>
            <Button size="icon" variant="ghost" @click="removeActionTag(i)">
              <Trash2 class="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button size="sm" variant="destructive" @click="deleteSelectedAction">
            <Trash2 class="h-3 w-3" />
            Delete Action
          </Button>
        </template>
      </CardContent>
    </Card>
  </aside>
</template>
