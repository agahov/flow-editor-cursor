<script setup lang="ts">
import { Plus, Trash2, ArrowRight, Workflow } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useEditorStore } from '@/stores/editor'

const store = useEditorStore()

function systemCount(processId: string): number {
  const process = store.doc.processes.find((p) => p.id === processId)
  if (!process) return 0
  return process.graph.nodes.filter((n) => n.type === 'system').length
}

function createProcess() {
  const id = store.addProcess()
  store.navigateToProcess(id)
}
</script>

<template>
  <div class="h-full w-full overflow-auto bg-muted/10 p-8">
    <div class="mx-auto max-w-5xl">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold">Processes</h2>
          <p class="text-sm text-muted-foreground">
            Groups of systems that work together over a set of components.
          </p>
        </div>
        <Button @click="createProcess">
          <Plus class="h-4 w-4" />
          New Process
        </Button>
      </div>

      <div
        v-if="store.doc.processes.length === 0"
        class="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground"
      >
        No processes yet. Create one to start grouping systems.
      </div>

      <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          v-for="process in store.doc.processes"
          :key="process.id"
          class="cursor-pointer transition-shadow hover:shadow-md"
          @click="store.navigateToProcess(process.id)"
        >
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <CardTitle class="flex items-center gap-2 text-sm">
                <Workflow class="h-4 w-4 text-primary" />
                {{ process.name }}
              </CardTitle>
              <Button
                size="icon"
                variant="ghost"
                class="h-7 w-7"
                @click.stop="store.removeProcess(process.id)"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="flex flex-wrap gap-1">
              <Badge
                v-for="tagId in process.components"
                :key="tagId"
                variant="outline"
                class="text-[10px]"
              >
                {{ store.getTagById(tagId)?.name ?? tagId }}
              </Badge>
              <span v-if="process.components.length === 0" class="text-xs text-muted-foreground">
                No declared components
              </span>
            </div>
            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <span>{{ systemCount(process.id) }} system(s)</span>
              <span class="flex items-center gap-1 text-primary">
                Open <ArrowRight class="h-3 w-3" />
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
