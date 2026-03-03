<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Note } from '@/types'
import { usePlansStore } from '@/stores/plansStore'
import TiptapEditor from '@/components/notes/TiptapEditor.vue'

const props = defineProps<{ note: Note; planId: string }>()
const plansStore = usePlansStore()

const isEditing = ref(props.note.content === '')
const localContent = ref(props.note.content)

// Drag state (Pointer Events API)
const isDragging = ref(false)
const localX = ref(props.note.x)
const localY = ref(props.note.y)
let startClientX = 0
let startClientY = 0
let startNoteX = 0
let startNoteY = 0
const overlayEl = ref<HTMLElement | null>(null)

function getCanvas(): HTMLElement | null {
  return document.querySelector('[data-canvas]') as HTMLElement | null
}

function onPointerDown(e: PointerEvent) {
  if (isEditing.value) return
  e.preventDefault()
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  isDragging.value = true
  startClientX = e.clientX
  startClientY = e.clientY
  startNoteX = localX.value
  startNoteY = localY.value
}

function onPointerMove(e: PointerEvent) {
  if (!isDragging.value) return
  const canvas = getCanvas()
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const dx = ((e.clientX - startClientX) / rect.width) * 100
  const dy = ((e.clientY - startClientY) / rect.height) * 100
  localX.value = Math.max(0, Math.min(99, startNoteX + dx))
  localY.value = Math.max(0, Math.min(99, startNoteY + dy))
}

async function onPointerUp() {
  if (!isDragging.value) return
  isDragging.value = false
  await plansStore.moveNote(props.planId, props.note.id, localX.value, localY.value)
}

async function saveNote() {
  const isEmpty = !localContent.value || localContent.value === '<p></p>'
  if (isEmpty) {
    await plansStore.deleteNote(props.planId, props.note.id)
    return
  }
  // Exit edit mode immediately (synchronous) so the UI feels instant
  isEditing.value = false
  await plansStore.updateNote(props.planId, props.note.id, localContent.value)
}

async function cancelEdit() {
  // New note with no saved content yet → delete it entirely
  if (!props.note.content || props.note.content === '<p></p>') {
    await plansStore.deleteNote(props.planId, props.note.id)
    return
  }
  // Existing note → revert local changes and close editor
  localContent.value = props.note.content
  isEditing.value = false
}

async function deleteNote() {
  await plansStore.deleteNote(props.planId, props.note.id)
}

onMounted(() => {
  if (isEditing.value) {
    setTimeout(() => overlayEl.value?.querySelector<HTMLElement>('.ProseMirror')?.focus(), 50)
  }
})
</script>

<template>
  <div
    ref="overlayEl"
    class="absolute z-20 group"
    :style="{ left: localX + '%', top: localY + '%' }"
    :class="isDragging ? 'cursor-grabbing' : ''"
  >
    <!-- Collapsed view (rendered HTML) -->
    <div
      v-if="!isEditing"
      class="relative max-w-xs bg-yellow-50 border border-yellow-300 rounded-lg shadow-md overflow-hidden"
    >
      <!-- Drag handle -->
      <div
        class="absolute top-0 left-0 right-0 h-5 cursor-grab active:cursor-grabbing bg-yellow-200/50 hover:bg-yellow-200 flex items-center justify-between px-2"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
      >
        <svg class="w-3 h-3 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 11-4 0 2 2 0 014 0zM7 8a2 2 0 11-4 0 2 2 0 014 0zM7 14a2 2 0 11-4 0 2 2 0 014 0zM13 2a2 2 0 11-4 0 2 2 0 014 0zM13 8a2 2 0 11-4 0 2 2 0 014 0zM13 14a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button @click.stop="isEditing = true" class="text-yellow-700 hover:text-yellow-900 text-xs" title="Modifier">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button @click.stop="deleteNote" class="text-red-400 hover:text-red-600 text-xs" title="Supprimer">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div
        class="prose prose-sm max-w-none p-2 pt-6 text-gray-800"
        v-html="note.content"
        @dblclick="isEditing = true"
      />
    </div>

    <!-- Editing view -->
    <div v-else class="relative w-72">
      <TiptapEditor v-model="localContent" />
      <div class="flex justify-end gap-2 mt-1">
        <button
          @click="saveNote"
          class="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow"
        >
          Enregistrer
        </button>
        <button
          @click="cancelEdit"
          class="px-3 py-1 text-xs bg-white border rounded-lg text-gray-600 hover:bg-gray-50 shadow"
        >
          Annuler
        </button>
      </div>
    </div>
  </div>
</template>
