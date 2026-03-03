<script setup lang="ts">
import { ref } from 'vue'
import { usePlansStore } from '@/stores/plansStore'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import FloorPlanCanvas from '@/components/plan/FloorPlanCanvas.vue'

type Mode = 'view' | 'edit-seats' | 'assign-people'

const plansStore = usePlansStore()

const mode = ref<Mode>('view')
const addingNote = ref(false)

function onNoteAdded() {
  addingNote.value = false
}
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden bg-gray-100">
    <AppHeader
      v-model:mode="mode"
      v-model:addingNote="addingNote"
    />

    <div class="flex flex-1 overflow-hidden">
      <main class="flex-1 overflow-auto p-6 flex items-start justify-center">
        <template v-if="plansStore.activePlan">
          <FloorPlanCanvas
            :plan="plansStore.activePlan"
            :mode="mode"
            :adding-note="addingNote"
            @note-added="onNoteAdded"
          />
        </template>
        <div v-else class="flex flex-col items-center justify-center h-full text-center text-gray-400 pt-24">
          <svg class="w-16 h-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p class="text-lg font-medium text-gray-500 mb-2">Aucun plan de bureau</p>
          <p class="text-sm text-gray-400">Créez votre premier plan en cliquant sur "Nouveau plan"</p>
        </div>
      </main>

      <AppSidebar :mode="mode" />
    </div>
  </div>
</template>
