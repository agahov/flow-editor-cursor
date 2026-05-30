<script setup lang="ts">
import { ref } from 'vue'
import { ChevronRight, Download, Upload, Plus, RotateCcw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useEditorStore } from '@/stores/editor'

const store = useEditorStore()
const fileInput = ref<HTMLInputElement | null>(null)

function navigate(item: { level: 'flow' | 'system'; systemId: string | null }) {
  if (item.level === 'flow') store.navigateToFlow()
  else if (item.systemId) store.navigateToSystem(item.systemId)
}

function exportJson() {
  const blob = new Blob([store.exportJson()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${store.doc.name.replace(/\s+/g, '-').toLowerCase()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function triggerImport() {
  fileInput.value?.click()
}

function onImport(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      store.importJson(reader.result as string)
    } catch {
      alert('Invalid JSON file')
    }
  }
  reader.readAsText(file)
  ;(event.target as HTMLInputElement).value = ''
}
</script>

<template>
  <header class="h-12 border-b flex items-center px-4 gap-3 bg-background shrink-0">
    <h1 class="text-sm font-semibold shrink-0">Tag Flow Editor</h1>
    <Separator orientation="vertical" class="h-6" />

    <nav class="flex items-center gap-1 text-sm min-w-0">
      <template v-for="(item, i) in store.breadcrumb" :key="i">
        <ChevronRight v-if="i > 0" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <button
          class="hover:underline truncate max-w-[160px]"
          :class="i === store.breadcrumb.length - 1 ? 'font-medium' : 'text-muted-foreground'"
          @click="navigate(item)"
        >
          {{ item.label }}
        </button>
      </template>
    </nav>

    <div class="ml-auto flex items-center gap-2 shrink-0">
      <Button
        v-if="store.navigation.level === 'flow'"
        size="sm"
        variant="outline"
        @click="store.addSystem()"
      >
        <Plus class="h-3.5 w-3.5" />
        System
      </Button>

      <Button size="sm" variant="outline" @click="exportJson">
        <Download class="h-3.5 w-3.5" />
        Export
      </Button>
      <Button size="sm" variant="outline" @click="triggerImport">
        <Upload class="h-3.5 w-3.5" />
        Import
      </Button>
      <Button size="sm" variant="ghost" title="Reset to sample" @click="store.resetToSample()">
        <RotateCcw class="h-3.5 w-3.5" />
      </Button>
      <input ref="fileInput" type="file" accept=".json" class="hidden" @change="onImport" />
    </div>
  </header>
</template>
