<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { X, Plus, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { nanoid } from 'nanoid'
import type { FieldKind, TagDef, TagField, TagType } from '@/types/tags'
import { TAG_TYPE_LABELS } from '@/types/tags'

const props = defineProps<{ open: boolean; tag: TagDef | null }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; save: [tag: TagDef] }>()

const name = ref('')
const type = ref<TagType>('data')
const stateGroup = ref('')
const duration = ref(1000)
const fields = ref<TagField[]>([])

const tagTypes = Object.keys(TAG_TYPE_LABELS) as TagType[]
const fieldKinds: FieldKind[] = ['number', 'string', 'bool', 'vec2']

const isEditing = computed(() => !!props.tag?.id)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    if (props.tag) {
      name.value = props.tag.name
      type.value = props.tag.type
      stateGroup.value = props.tag.stateGroup ?? ''
      duration.value = props.tag.duration ?? 1000
      fields.value = props.tag.fields ? props.tag.fields.map((f) => ({ ...f })) : []
    } else {
      name.value = ''
      type.value = 'data'
      stateGroup.value = ''
      duration.value = 1000
      fields.value = [{ name: 'value', kind: 'number' }]
    }
  },
)

watch(type, (newType) => {
  if (newType === 'data' && fields.value.length === 0) {
    fields.value = [{ name: 'value', kind: 'number' }]
  }
})

function addField() {
  fields.value.push({ name: 'field', kind: 'number' })
}

function removeField(index: number) {
  fields.value.splice(index, 1)
}

function save() {
  if (!name.value.trim()) return

  const tag: TagDef = {
    id: props.tag?.id ?? nanoid(),
    name: name.value.trim(),
    type: type.value,
  }

  if (type.value === 'data') tag.fields = fields.value.filter((f) => f.name.trim())
  if (type.value === 'state') tag.stateGroup = stateGroup.value.trim() || 'default'
  if (type.value === 'timer') tag.duration = duration.value

  emit('save', tag)
  emit('update:open', false)
}

function close() {
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <template #title>{{ isEditing ? 'Edit Tag' : 'Create Tag' }}</template>
    <template #description>Define a tag with its type and schema.</template>

    <div class="space-y-4 py-2">
      <div class="space-y-2">
        <Label for="tag-name">Name</Label>
        <Input id="tag-name" v-model="name" placeholder="e.g. health" />
      </div>

      <div class="space-y-2">
        <Label for="tag-type">Type</Label>
        <Select id="tag-type" v-model="type">
          <option v-for="t in tagTypes" :key="t" :value="t">{{ TAG_TYPE_LABELS[t] }}</option>
        </Select>
      </div>

      <div v-if="type === 'state'" class="space-y-2">
        <Label for="state-group">State Group</Label>
        <Input id="state-group" v-model="stateGroup" placeholder="e.g. movement" />
      </div>

      <div v-if="type === 'timer'" class="space-y-2">
        <Label for="duration">Default Duration (ms)</Label>
        <Input id="duration" type="number" :model-value="String(duration)" @update:model-value="duration = Number($event) || 0" />
      </div>

      <div v-if="type === 'data'" class="space-y-2">
        <div class="flex items-center justify-between">
          <Label>Fields</Label>
          <Button size="sm" variant="outline" @click="addField">
            <Plus class="h-3 w-3" />
            Field
          </Button>
        </div>
        <div v-for="(field, i) in fields" :key="i" class="flex gap-2 items-center">
          <Input v-model="field.name" placeholder="name" class="flex-1" />
          <Select v-model="field.kind" class="w-28">
            <option v-for="k in fieldKinds" :key="k" :value="k">{{ k }}</option>
          </Select>
          <Button size="icon" variant="ghost" @click="removeField(i)">
            <Trash2 class="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <Button variant="outline" @click="close">Cancel</Button>
        <Button @click="save">{{ isEditing ? 'Save' : 'Create' }}</Button>
      </div>
    </div>

    <template #close>
      <Button size="icon" variant="ghost" @click="close">
        <X class="h-4 w-4" />
      </Button>
    </template>
  </Dialog>
</template>
