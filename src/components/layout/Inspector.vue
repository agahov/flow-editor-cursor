<script setup lang="ts">
import { computed } from 'vue'
import { Plus, Trash2, AlertTriangle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useEditorStore } from '@/stores/editor'
import { computeProcessFlow } from '@/lib/data-flow'
import type { Condition, ConditionMode, System } from '@/types/systems'
import type { TagField } from '@/types/tags'
import { TAG_TYPE_LABELS } from '@/types/tags'

const store = useEditorStore()
const modes: ConditionMode[] = ['has', 'absent']

const level = computed(() => store.navigation.level)
const selectedNode = computed(() => store.selectedNode)
const system = computed(() => store.currentSystem)

const processFlow = computed(() =>
  level.value === 'process' && store.currentProcess
    ? computeProcessFlow(store.currentProcess, store.doc.systems, store.doc.tags)
    : null,
)

// --- Process-level: the selected system reference node ------------------
const selectedProcessSystem = computed<System | null>(() => {
  if (level.value !== 'process' || selectedNode.value?.type !== 'system') return null
  return store.doc.systems.find((s) => s.id === selectedNode.value!.data.systemId) ?? null
})

const selectedOutputSet = computed<string[]>(() => {
  if (!selectedNode.value || !processFlow.value) return []
  return processFlow.value.outputSetByNode.get(selectedNode.value.id) ?? []
})

const selectedWarnings = computed<string[]>(() => {
  if (!selectedNode.value || !processFlow.value) return []
  return processFlow.value.warningsByNode.get(selectedNode.value.id) ?? []
})

// --- System-level selection helpers ------------------------------------
const selectedAction = computed(() => {
  if (!system.value || !selectedNode.value?.data.actionId) return null
  return system.value.actions.find((a) => a.id === selectedNode.value!.data.actionId) ?? null
})

const isQueryNode = computed(() => level.value === 'system' && selectedNode.value?.type === 'query')

// --- Process settings ---------------------------------------------------
const memberTagIds = computed<string[]>(() => {
  const process = store.currentProcess
  if (!process) return []
  const ids = new Set<string>()
  for (const node of process.graph.nodes) {
    const sys = store.doc.systems.find((s) => s.id === node.data.systemId)
    if (!sys) continue
    for (const c of sys.query.conditions) ids.add(c.tagId)
    for (const a of sys.actions) {
      if (a.kind === 'addTags') for (const t of a.tags) ids.add(t.tagId)
      else if (a.kind === 'removeTags') for (const id of a.tagIds) ids.add(id)
      else if (a.kind === 'changeComp') for (const ch of a.changes) ids.add(ch.tagId)
    }
  }
  return [...ids]
})

function toggleProcessComponent(tagId: string) {
  const process = store.currentProcess
  if (!process) return
  const components = process.components.includes(tagId)
    ? process.components.filter((id) => id !== tagId)
    : [...process.components, tagId]
  store.updateProcess(process.id, { components })
}

function addAllMemberComponents() {
  const process = store.currentProcess
  if (!process) return
  const components = [...new Set([...process.components, ...memberTagIds.value])]
  store.updateProcess(process.id, { components })
}

// --- Output pins --------------------------------------------------------
function togglePinTag(pinId: string, tagId: string) {
  const sys = selectedProcessSystem.value
  if (!sys) return
  const pin = sys.outputs.find((p) => p.id === pinId)
  if (!pin) return
  const tagIds = pin.tagIds.includes(tagId)
    ? pin.tagIds.filter((id) => id !== tagId)
    : [...pin.tagIds, tagId]
  store.updateOutputPin(sys.id, pinId, { tagIds })
}

// --- Query (system level) ----------------------------------------------
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
  const conditions = system.value.query.conditions.map((c, i) => (i === index ? { ...c, ...patch } : c))
  store.updateSystem(system.value.id, { query: { conditions } })
}

function removeCondition(index: number) {
  if (!system.value) return
  const conditions = system.value.query.conditions.filter((_, i) => i !== index)
  store.updateSystem(system.value.id, { query: { conditions } })
}

// --- Command editors (system level) ------------------------------------
function fieldsOf(tagId: string): TagField[] {
  return store.getTagById(tagId)?.fields ?? []
}

function valueFor(values: Record<string, unknown> | undefined, field: string): string {
  return String(values?.[field] ?? '')
}

function deleteSelectedAction() {
  if (!system.value || !selectedAction.value) return
  store.removeAction(system.value.id, selectedAction.value.id)
}

// text
function updateTextMessage(message: string) {
  if (!system.value || !selectedAction.value) return
  store.updateAction(system.value.id, selectedAction.value.id, { message })
}

// addTags
function addTagEntry() {
  if (!system.value || selectedAction.value?.kind !== 'addTags' || store.doc.tags.length === 0) return
  const tags = [...selectedAction.value.tags, { tagId: store.doc.tags[0]!.id }]
  store.updateAction(system.value.id, selectedAction.value.id, { tags })
}
function updateAddTag(index: number, tagId: string) {
  if (!system.value || selectedAction.value?.kind !== 'addTags') return
  const tags = selectedAction.value.tags.map((t, i) => (i === index ? { tagId, values: {} } : t))
  store.updateAction(system.value.id, selectedAction.value.id, { tags })
}
function setAddTagValue(index: number, field: string, value: string) {
  if (!system.value || selectedAction.value?.kind !== 'addTags') return
  const tags = selectedAction.value.tags.map((t, i) =>
    i === index ? { ...t, values: { ...t.values, [field]: value } } : t,
  )
  store.updateAction(system.value.id, selectedAction.value.id, { tags })
}
function removeAddTag(index: number) {
  if (!system.value || selectedAction.value?.kind !== 'addTags') return
  const tags = selectedAction.value.tags.filter((_, i) => i !== index)
  store.updateAction(system.value.id, selectedAction.value.id, { tags })
}

// removeTags
function addRemoveTag() {
  if (!system.value || selectedAction.value?.kind !== 'removeTags' || store.doc.tags.length === 0) return
  const tagIds = [...selectedAction.value.tagIds, store.doc.tags[0]!.id]
  store.updateAction(system.value.id, selectedAction.value.id, { tagIds })
}
function updateRemoveTag(index: number, tagId: string) {
  if (!system.value || selectedAction.value?.kind !== 'removeTags') return
  const tagIds = selectedAction.value.tagIds.map((t, i) => (i === index ? tagId : t))
  store.updateAction(system.value.id, selectedAction.value.id, { tagIds })
}
function removeRemoveTag(index: number) {
  if (!system.value || selectedAction.value?.kind !== 'removeTags') return
  const tagIds = selectedAction.value.tagIds.filter((_, i) => i !== index)
  store.updateAction(system.value.id, selectedAction.value.id, { tagIds })
}

// changeComp
function addChange() {
  if (!system.value || selectedAction.value?.kind !== 'changeComp' || store.doc.tags.length === 0) return
  const changes = [...selectedAction.value.changes, { tagId: store.doc.tags[0]!.id, values: {} }]
  store.updateAction(system.value.id, selectedAction.value.id, { changes })
}
function updateChangeTag(index: number, tagId: string) {
  if (!system.value || selectedAction.value?.kind !== 'changeComp') return
  const changes = selectedAction.value.changes.map((c, i) => (i === index ? { tagId, values: {} } : c))
  store.updateAction(system.value.id, selectedAction.value.id, { changes })
}
function setChangeValue(index: number, field: string, value: string) {
  if (!system.value || selectedAction.value?.kind !== 'changeComp') return
  const changes = selectedAction.value.changes.map((c, i) =>
    i === index ? { ...c, values: { ...c.values, [field]: value } } : c,
  )
  store.updateAction(system.value.id, selectedAction.value.id, { changes })
}
function removeChange(index: number) {
  if (!system.value || selectedAction.value?.kind !== 'changeComp') return
  const changes = selectedAction.value.changes.filter((_, i) => i !== index)
  store.updateAction(system.value.id, selectedAction.value.id, { changes })
}

function tagName(tagId: string): string {
  return store.getTagById(tagId)?.name ?? tagId
}
</script>

<template>
  <aside class="w-72 border-l bg-muted/20 flex flex-col shrink-0 h-full overflow-y-auto">
    <Card class="border-0 shadow-none rounded-none">
      <CardHeader class="pb-3">
        <CardTitle class="text-sm">Inspector</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <!-- Processes list level -->
        <p v-if="level === 'processes'" class="text-sm text-muted-foreground">
          Select a process to open it, or create a new one.
        </p>

        <!-- Process level: process settings -->
        <template v-if="level === 'process' && store.currentProcess">
          <div class="space-y-2">
            <Label for="process-name">Process Name</Label>
            <Input
              id="process-name"
              :model-value="store.currentProcess.name"
              @update:model-value="(v) => store.updateProcess(store.currentProcess!.id, { name: String(v) })"
            />
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <Label>Components (lens)</Label>
              <Button size="sm" variant="ghost" class="h-7 text-[11px]" @click="addAllMemberComponents">
                Add used
              </Button>
            </div>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="tag in store.doc.tags"
                :key="tag.id"
                class="rounded border px-1.5 py-0.5 text-[10px] transition-colors"
                :class="
                  store.currentProcess.components.includes(tag.id)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'text-muted-foreground'
                "
                @click="toggleProcessComponent(tag.id)"
              >
                {{ tag.name }}
              </button>
            </div>
            <p class="mt-1 text-[10px] text-muted-foreground">
              Highlighted components stay sharp on flows; others dim unless "All" is on.
            </p>
          </div>
        </template>

        <!-- Process level: selected system node -->
        <template v-if="selectedProcessSystem">
          <Separator />
          <div class="space-y-2">
            <Label for="system-name">System Name</Label>
            <Input
              id="system-name"
              :model-value="selectedProcessSystem.name"
              @update:model-value="(v) => store.updateSystem(selectedProcessSystem!.id, { name: String(v) })"
            />
          </div>

          <div v-if="selectedWarnings.length" class="rounded-md border border-amber-300 bg-amber-50 p-2">
            <p class="flex items-center gap-1 text-[11px] font-medium text-amber-800">
              <AlertTriangle class="h-3.5 w-3.5" /> Validation
            </p>
            <ul class="mt-1 space-y-1 text-[10px] text-amber-700">
              <li v-for="(w, i) in selectedWarnings" :key="i">{{ w }}</li>
            </ul>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <Label>Output Pins</Label>
              <Button size="sm" variant="outline" class="h-7" @click="store.addOutputPin(selectedProcessSystem.id)">
                <Plus class="h-3 w-3" />
              </Button>
            </div>
            <div
              v-for="pin in selectedProcessSystem.outputs"
              :key="pin.id"
              class="mb-2 space-y-2 rounded-md border p-2"
            >
              <div class="flex items-center gap-2">
                <Input
                  class="h-8 flex-1"
                  :model-value="pin.label"
                  @update:model-value="(v) => store.updateOutputPin(selectedProcessSystem!.id, pin.id, { label: String(v) })"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  class="h-7 w-7"
                  @click="store.removeOutputPin(selectedProcessSystem!.id, pin.id)"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </Button>
              </div>
              <div class="flex flex-wrap gap-1">
                <button
                  v-for="tagId in selectedOutputSet"
                  :key="tagId"
                  class="rounded border px-1.5 py-0.5 text-[10px] transition-colors"
                  :class="
                    pin.tagIds.includes(tagId)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'text-muted-foreground'
                  "
                  @click="togglePinTag(pin.id, tagId)"
                >
                  {{ tagName(tagId) }}
                </button>
                <span v-if="selectedOutputSet.length === 0" class="text-[10px] text-muted-foreground">
                  No components produced yet
                </span>
              </div>
              <p v-if="pin.tagIds.length === 0" class="text-[10px] text-muted-foreground">
                Nothing selected: forwards the full output set.
              </p>
            </div>
          </div>
        </template>

        <!-- System level: query -->
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
          <div v-for="(cond, i) in system.query.conditions" :key="i" class="space-y-2 rounded-md border p-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium">Condition {{ i + 1 }}</span>
              <Button size="icon" variant="ghost" class="h-6 w-6" @click="removeCondition(i)">
                <Trash2 class="h-3 w-3" />
              </Button>
            </div>
            <Select :model-value="cond.tagId" @update:model-value="(v) => updateCondition(i, { tagId: String(v) })">
              <option v-for="tag in store.doc.tags" :key="tag.id" :value="tag.id">
                {{ tag.name }} ({{ TAG_TYPE_LABELS[tag.type] }})
              </option>
            </Select>
            <Select :model-value="cond.mode" @update:model-value="(v) => updateCondition(i, { mode: v as ConditionMode })">
              <option v-for="m in modes" :key="m" :value="m">{{ m }}</option>
            </Select>
          </div>
        </template>

        <!-- System level: text -->
        <template v-if="level === 'system' && selectedAction?.kind === 'text'">
          <div class="space-y-2">
            <Label for="text-message">Message</Label>
            <Input
              id="text-message"
              :model-value="selectedAction.message"
              @update:model-value="(v) => updateTextMessage(String(v))"
            />
          </div>
          <Button size="sm" variant="destructive" @click="deleteSelectedAction">
            <Trash2 class="h-3 w-3" /> Delete Command
          </Button>
        </template>

        <!-- System level: addTags -->
        <template v-if="level === 'system' && selectedAction?.kind === 'addTags'">
          <div class="flex items-center justify-between">
            <Label>Tags to Add</Label>
            <Button size="sm" variant="outline" @click="addTagEntry">
              <Plus class="h-3 w-3" />
            </Button>
          </div>
          <div v-for="(entry, i) in selectedAction.tags" :key="i" class="space-y-2 rounded-md border p-2">
            <div class="flex items-center gap-2">
              <Select class="flex-1" :model-value="entry.tagId" @update:model-value="(v) => updateAddTag(i, String(v))">
                <option v-for="tag in store.doc.tags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
              </Select>
              <Button size="icon" variant="ghost" @click="removeAddTag(i)">
                <Trash2 class="h-3.5 w-3.5" />
              </Button>
            </div>
            <div v-for="field in fieldsOf(entry.tagId)" :key="field.name" class="flex items-center gap-2">
              <span class="w-16 shrink-0 text-[10px] text-muted-foreground">{{ field.name }}</span>
              <Input
                class="h-8"
                :type="field.kind === 'number' ? 'number' : 'text'"
                :model-value="valueFor(entry.values, field.name)"
                @update:model-value="(v) => setAddTagValue(i, field.name, String(v))"
              />
            </div>
          </div>
          <Button size="sm" variant="destructive" @click="deleteSelectedAction">
            <Trash2 class="h-3 w-3" /> Delete Command
          </Button>
        </template>

        <!-- System level: removeTags -->
        <template v-if="level === 'system' && selectedAction?.kind === 'removeTags'">
          <div class="flex items-center justify-between">
            <Label>Tags to Remove</Label>
            <Button size="sm" variant="outline" @click="addRemoveTag">
              <Plus class="h-3 w-3" />
            </Button>
          </div>
          <div v-for="(tagId, i) in selectedAction.tagIds" :key="i" class="flex items-center gap-2">
            <Select class="flex-1" :model-value="tagId" @update:model-value="(v) => updateRemoveTag(i, String(v))">
              <option v-for="tag in store.doc.tags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
            </Select>
            <Button size="icon" variant="ghost" @click="removeRemoveTag(i)">
              <Trash2 class="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button size="sm" variant="destructive" @click="deleteSelectedAction">
            <Trash2 class="h-3 w-3" /> Delete Command
          </Button>
        </template>

        <!-- System level: changeComp -->
        <template v-if="level === 'system' && selectedAction?.kind === 'changeComp'">
          <div class="flex items-center justify-between">
            <Label>Components to Change</Label>
            <Button size="sm" variant="outline" @click="addChange">
              <Plus class="h-3 w-3" />
            </Button>
          </div>
          <div v-for="(change, i) in selectedAction.changes" :key="i" class="space-y-2 rounded-md border p-2">
            <div class="flex items-center gap-2">
              <Select class="flex-1" :model-value="change.tagId" @update:model-value="(v) => updateChangeTag(i, String(v))">
                <option v-for="tag in store.doc.tags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
              </Select>
              <Button size="icon" variant="ghost" @click="removeChange(i)">
                <Trash2 class="h-3.5 w-3.5" />
              </Button>
            </div>
            <div v-for="field in fieldsOf(change.tagId)" :key="field.name" class="flex items-center gap-2">
              <span class="w-16 shrink-0 text-[10px] text-muted-foreground">{{ field.name }}</span>
              <Input
                class="h-8"
                :type="field.kind === 'number' ? 'number' : 'text'"
                :model-value="valueFor(change.values, field.name)"
                @update:model-value="(v) => setChangeValue(i, field.name, String(v))"
              />
            </div>
          </div>
          <Button size="sm" variant="destructive" @click="deleteSelectedAction">
            <Trash2 class="h-3 w-3" /> Delete Command
          </Button>
        </template>

        <p
          v-if="level === 'system' && !selectedNode"
          class="text-sm text-muted-foreground"
        >
          Select the Query or a command node to edit it.
        </p>
      </CardContent>
    </Card>
  </aside>
</template>
