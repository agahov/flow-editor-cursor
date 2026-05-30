<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { cn } from '@/lib/utils'

defineProps<{ class?: string; open?: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
</script>

<template>
  <DialogRoot :open="open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/50" />
      <DialogContent
        :class="
          cn(
            'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg sm:rounded-lg',
            $props.class,
          )
        "
      >
        <DialogTitle v-if="$slots.title" class="text-lg font-semibold">
          <slot name="title" />
        </DialogTitle>
        <DialogDescription v-if="$slots.description" class="text-sm text-muted-foreground">
          <slot name="description" />
        </DialogDescription>
        <slot />
        <DialogClose
          v-if="$slots.close"
          class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
        >
          <slot name="close" />
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
