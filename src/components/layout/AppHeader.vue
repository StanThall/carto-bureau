<script setup lang="ts">
import { ref } from 'vue'
import { usePlansStore } from '@/stores/plansStore'
import AddPlanModal from '@/components/modals/AddPlanModal.vue'

type Mode = 'view' | 'edit-seats' | 'assign-people'

const props = defineProps<{ mode: Mode; addingNote: boolean; saving?: boolean }>()
const emit = defineEmits<{
  'update:mode': [mode: Mode]
  'update:addingNote': [v: boolean]
  'save-assignments': []
  'cancel-assignments': []
}>()

const plansStore = usePlansStore()
const showAddPlan = ref(false)

function setMode(m: Mode) { emit('update:mode', m) }
</script>

<template>
  <header class="bg-white border-b px-4 py-3 flex items-center gap-3 shrink-0">
    <!-- Logo -->
    <div class="flex items-center gap-2 font-bold text-blue-700 text-lg shrink-0">
      <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      Carto Bureau
    </div>

    <div class="w-px h-5 bg-gray-200" />

    <!-- New plan button -->
    <button
      @click="showAddPlan = true"
      class="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Nouveau plan
    </button>

    <!-- Save / Cancel (assign mode only) -->
    <template v-if="mode === 'assign-people'">
      <button
        @click="emit('cancel-assignments')"
        :disabled="saving"
        class="px-3 py-1.5 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50"
      >
        Annuler
      </button>
      <button
        @click="emit('save-assignments')"
        :disabled="saving"
        class="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        <svg v-if="saving" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        {{ saving ? 'Sauvegarde…' : 'Sauvegarder' }}
      </button>
    </template>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Mode toggle -->
    <div v-if="plansStore.plans.length > 0" class="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      <button
        @click="setMode('view')"
        :class="['px-3 py-1.5 text-sm rounded-md transition-colors', mode === 'view' ? 'bg-white shadow text-gray-800 font-medium' : 'text-gray-500 hover:text-gray-700']"
      >
        Vue
      </button>
      <button
        @click="setMode('edit-seats')"
        :class="['px-3 py-1.5 text-sm rounded-md transition-colors', mode === 'edit-seats' ? 'bg-white shadow text-gray-800 font-medium' : 'text-gray-500 hover:text-gray-700']"
      >
        Placer postes
      </button>
      <button
        @click="setMode('assign-people')"
        :class="['px-3 py-1.5 text-sm rounded-md transition-colors', mode === 'assign-people' ? 'bg-white shadow text-gray-800 font-medium' : 'text-gray-500 hover:text-gray-700']"
      >
        Assigner
      </button>
    </div>

    <!-- Add note button -->
    <button
      v-if="plansStore.plans.length > 0 && mode !== 'edit-seats'"
      @click="emit('update:addingNote', !addingNote)"
      :class="[
        'flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border transition-colors',
        addingNote
          ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
          : 'border-gray-300 text-gray-700 hover:bg-gray-50',
      ]"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      {{ addingNote ? 'Annuler note' : 'Note' }}
    </button>
  </header>

  <AddPlanModal v-if="showAddPlan" @close="showAddPlan = false" />
</template>
