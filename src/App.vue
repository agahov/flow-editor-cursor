<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import Inspector from '@/components/layout/Inspector.vue'
import ProcessList from '@/components/layout/ProcessList.vue'
import FlowCanvas from '@/components/canvas/FlowCanvas.vue'
import FlowLaneView from '@/components/canvas/FlowLaneView.vue'
import { useEditorStore } from '@/stores/editor'

const store = useEditorStore()
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <AppHeader />
    <div class="flex flex-1 min-h-0">
      <Sidebar />
      <main class="flex-1 min-w-0 relative">
        <ProcessList v-if="store.navigation.level === 'processes'" />
        <FlowLaneView
          v-else-if="store.navigation.level === 'process' && store.flowView === 'lanes'"
        />
        <FlowCanvas v-else />
      </main>
      <Inspector />
    </div>
  </div>
</template>
