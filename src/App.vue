<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import Inspector from '@/components/layout/Inspector.vue'
import FlowCanvas from '@/components/canvas/FlowCanvas.vue'
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <AppHeader />
    <div class="flex flex-1 min-h-0">
      <Sidebar />
      <main class="flex-1 min-w-0 relative">
        <FlowCanvas />
      </main>
      <Inspector />
    </div>
  </div>
</template>
