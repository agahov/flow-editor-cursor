<script setup lang="ts">
import { computed, ref } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import { useEditorStore } from '@/stores/editor'
import type { System } from '@/types/systems'
import type { TagDef } from '@/types/tags'
import { TAG_TYPE_COLORS, TAG_TYPE_LABELS } from '@/types/tags'

const store = useEditorStore()

const hoveredSystemId = ref<string | null>(null)
const hoveredTagId = ref<string | null>(null)

/** Systems in execution order, derived from the current process graph (topological), with position tie-break. */
const orderedSystems = computed<System[]>(() => {
  const flow = store.currentProcess?.graph ?? { nodes: [], edges: [] }
  const nodeToSystem = new Map<string, string>()
  const yOf = new Map<string, number>()
  for (const node of flow.nodes) {
    if (node.type === 'system' && node.data.systemId) {
      nodeToSystem.set(node.id, node.data.systemId)
      yOf.set(node.id, node.position.y)
    }
  }

  const systemNodeIds = [...nodeToSystem.keys()]
  const inDegree = new Map<string, number>(systemNodeIds.map((id) => [id, 0]))
  const adj = new Map<string, string[]>(systemNodeIds.map((id) => [id, []]))
  for (const edge of flow.edges) {
    if (!nodeToSystem.has(edge.source) || !nodeToSystem.has(edge.target)) continue
    adj.get(edge.source)!.push(edge.target)
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
  }

  const byY = (a: string, b: string) => (yOf.get(a) ?? 0) - (yOf.get(b) ?? 0)
  const ready = systemNodeIds.filter((id) => (inDegree.get(id) ?? 0) === 0).sort(byY)
  const orderedNodeIds: string[] = []
  const seen = new Set<string>()
  while (ready.length) {
    const id = ready.shift()!
    if (seen.has(id)) continue
    seen.add(id)
    orderedNodeIds.push(id)
    for (const next of (adj.get(id) ?? []).sort(byY)) {
      inDegree.set(next, (inDegree.get(next) ?? 1) - 1)
      if ((inDegree.get(next) ?? 0) === 0) ready.push(next)
    }
    ready.sort(byY)
  }
  // Any leftover (cycles) appended by position.
  for (const id of systemNodeIds.sort(byY)) if (!seen.has(id)) orderedNodeIds.push(id)

  const systemsById = new Map(store.doc.systems.map((s) => [s.id, s]))
  return orderedNodeIds
    .map((nodeId) => systemsById.get(nodeToSystem.get(nodeId)!))
    .filter((s): s is System => Boolean(s))
})

type CellInfo = { read: boolean; absent: boolean; add: boolean }

function cellFor(system: System, tagId: string): CellInfo {
  const read = system.query.conditions.some((c) => c.tagId === tagId && c.mode === 'has')
  const absent = system.query.conditions.some((c) => c.tagId === tagId && c.mode === 'absent')
  const add = system.actions.some((a) => a.kind === 'addTags' && a.tags.some((t) => t.tagId === tagId))
  return { read, absent, add }
}

/** One lane per tag referenced anywhere in the flow, ordered by tag type then name. */
const lanes = computed(() => {
  const usedTagIds = new Set<string>()
  for (const system of orderedSystems.value) {
    for (const c of system.query.conditions) usedTagIds.add(c.tagId)
    for (const a of system.actions) {
      if (a.kind === 'addTags') for (const t of a.tags) usedTagIds.add(t.tagId)
    }
  }

  const tags = store.doc.tags
    .filter((t) => usedTagIds.has(t.id))
    .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))

  return tags.map((tag) => {
    // First system (in order) that produces this tag, if any.
    const producedByIndex = orderedSystems.value.findIndex((s) => cellFor(s, tag.id).add)
    return { tag, producedByIndex }
  })
})

function isWarning(systemIndex: number, lane: { tag: TagDef; producedByIndex: number }): boolean {
  // A system reads a tag before any system in the flow produces it → ordering smell.
  if (lane.producedByIndex < 0) return false
  const info = cellFor(orderedSystems.value[systemIndex]!, lane.tag.id)
  return info.read && systemIndex < lane.producedByIndex
}

const gridTemplateColumns = computed(
  () => `220px repeat(${orderedSystems.value.length}, minmax(120px, 1fr))`,
)

function dimSystem(systemId: string): boolean {
  return hoveredSystemId.value !== null && hoveredSystemId.value !== systemId
}

function dimTag(tagId: string): boolean {
  return hoveredTagId.value !== null && hoveredTagId.value !== tagId
}

function tagDotColor(type: TagDef['type']): string {
  const map: Record<TagDef['type'], string> = {
    data: 'bg-blue-500',
    marker: 'bg-gray-500',
    state: 'bg-purple-500',
    relation: 'bg-amber-500',
    timer: 'bg-green-500',
  }
  return map[type]
}
</script>

<template>
  <div class="h-full w-full overflow-auto bg-muted/10 p-6">
    <div v-if="orderedSystems.length === 0" class="text-sm text-muted-foreground">
      No systems in this flow yet. Add a system to see the component lanes.
    </div>
    <div v-else-if="lanes.length === 0" class="text-sm text-muted-foreground">
      Systems have no tag conditions or actions yet. Add query conditions or "Add Tags" actions to
      populate lanes.
    </div>

    <div v-else class="inline-block min-w-full">
      <!-- Header row: system names in execution order -->
      <div class="grid items-end gap-y-0" :style="{ gridTemplateColumns }">
        <div class="px-2 pb-3 text-[10px] uppercase tracking-wide text-muted-foreground">
          Component / System
        </div>
        <div
          v-for="(system, i) in orderedSystems"
          :key="system.id"
          class="px-2 pb-3 text-center transition-opacity"
          :class="{ 'opacity-30': dimSystem(system.id) }"
          @mouseenter="hoveredSystemId = system.id"
          @mouseleave="hoveredSystemId = null"
        >
          <button
            class="mx-auto flex max-w-full flex-col items-center gap-1"
            @click="store.navigateToSystem(system.id)"
          >
            <span
              class="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary"
            >
              {{ i + 1 }}
            </span>
            <span class="truncate text-xs font-medium hover:underline">{{ system.name }}</span>
          </button>
        </div>
      </div>

      <!-- Lane rows -->
      <div class="grid" :style="{ gridTemplateColumns }">
        <template v-for="lane in lanes" :key="lane.tag.id">
          <!-- Lane label -->
          <div
            class="flex items-center gap-2 border-t py-3 pr-2 transition-opacity"
            :class="{ 'opacity-30': dimTag(lane.tag.id) }"
            @mouseenter="hoveredTagId = lane.tag.id"
            @mouseleave="hoveredTagId = null"
          >
            <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="tagDotColor(lane.tag.type)" />
            <span class="truncate text-sm font-medium">{{ lane.tag.name }}</span>
            <span
              class="ml-auto rounded border px-1.5 py-0.5 text-[9px] uppercase"
              :class="TAG_TYPE_COLORS[lane.tag.type]"
            >
              {{ TAG_TYPE_LABELS[lane.tag.type] }}
            </span>
          </div>

          <!-- Intersection cells -->
          <div
            v-for="(system, i) in orderedSystems"
            :key="system.id + lane.tag.id"
            class="relative flex items-center justify-center border-t py-3 transition-opacity"
            :class="{ 'opacity-20': dimSystem(system.id) || dimTag(lane.tag.id) }"
            @mouseenter="hoveredSystemId = system.id"
            @mouseleave="hoveredSystemId = null"
          >
            <!-- the horizontal lane "string" -->
            <span
              class="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2"
              :class="i >= lane.producedByIndex && lane.producedByIndex >= 0 ? 'bg-foreground/25' : 'bg-foreground/10'"
            />

            <!-- glyphs -->
            <template v-for="info in [cellFor(system, lane.tag.id)]" :key="'g'">
              <div class="relative z-10 flex items-center gap-1">
                <span
                  v-if="info.add"
                  class="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[11px] font-bold text-white shadow"
                  title="Adds this component"
                >
                  +
                </span>
                <span
                  v-if="info.read"
                  class="h-3 w-3 rounded-full border-2 border-blue-500 bg-blue-500/30"
                  :title="'Reads this component' + (isWarning(i, lane) ? ' (read before it is produced)' : '')"
                />
                <span
                  v-if="info.absent"
                  class="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-amber-500 text-[9px] text-amber-600"
                  title="Requires this component to be absent"
                >
                  ⊘
                </span>
                <AlertTriangle
                  v-if="isWarning(i, lane)"
                  class="h-3.5 w-3.5 text-amber-500"
                  title="Ordering smell: this system reads the tag before any earlier system produces it"
                />
              </div>
            </template>
          </div>
        </template>
      </div>

      <!-- Legend -->
      <div class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
        <span class="font-medium text-foreground">Legend:</span>
        <span class="flex items-center gap-2">
          <span class="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[11px] font-bold text-white">+</span>
          adds component
        </span>
        <span class="flex items-center gap-2">
          <span class="h-3 w-3 rounded-full border-2 border-blue-500 bg-blue-500/30" />
          reads (query: has)
        </span>
        <span class="flex items-center gap-2">
          <span class="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-amber-500 text-[9px] text-amber-600">⊘</span>
          requires absent
        </span>
        <span class="flex items-center gap-2">
          <AlertTriangle class="h-3.5 w-3.5 text-amber-500" />
          read before produced
        </span>
      </div>
    </div>
  </div>
</template>
