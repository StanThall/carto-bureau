<script setup lang="ts">
import { ref } from 'vue'
import { usePlansStore } from '@/stores/plansStore'
import AddPlanModal from '@/components/modals/AddPlanModal.vue'

type Mode = 'view' | 'edit-seats' | 'assign-people'

const props = defineProps<{ mode: Mode; addingNote: boolean }>()
const emit = defineEmits<{
  'update:mode': [mode: Mode]
  'update:addingNote': [v: boolean]
}>()

const plansStore = usePlansStore()
const showAddPlan = ref(false)
const showRename = ref(false)
const renameValue = ref('')

function setMode(m: Mode) { emit('update:mode', m) }

function startRename() {
  if (!plansStore.activePlan) return
  renameValue.value = plansStore.activePlan.name
  showRename.value = true
}

async function confirmRename() {
  if (!plansStore.activePlan || !renameValue.value.trim()) return
  await plansStore.renamePlan(plansStore.activePlan.id, renameValue.value.trim())
  showRename.value = false
}

async function deletePlan() {
  if (!plansStore.activePlan) return
  if (!confirm(`Supprimer le plan "${plansStore.activePlan.name}" ?`)) return
  await plansStore.deletePlan(plansStore.activePlan.id)
}
</script>

<template>
  <header class="bg-white border-b px-4 py-3 flex items-center gap-4 shrink-0">
    <!-- Logo -->
    <div class="flex items-center gap-2 font-bold text-blue-700 text-lg shrink-0">
      <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      Carto Bureau
    </div>

    <!-- Plan selector -->
    <div class="flex items-center gap-2">
      <select
        :value="plansStore.activePlanId"
        @change="plansStore.activePlanId = ($event.target as HTMLSelectElement).value"
        class="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white max-w-48"
      >
        <option v-if="plansStore.plans.length === 0" value="" disabled>Aucun plan</option>
        <option v-for="plan in plansStore.plans" :key="plan.id" :value="plan.id">
          {{ plan.name }}
        </option>
      </select>

      <button
        @click="showAddPlan = true"
        class="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Nouveau plan
      </button>

      <template v-if="plansStore.activePlan">
        <button @click="startRename" class="p-1.5 text-gray-400 hover:text-gray-700 rounded" title="Renommer">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button @click="deletePlan" class="p-1.5 text-gray-400 hover:text-red-600 rounded" title="Supprimer le plan">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </template>
    </div>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Mode toggle -->
    <div v-if="plansStore.activePlan" class="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
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
      v-if="plansStore.activePlan && mode !== 'edit-seats'"
      @click="emit('update:addingNote', !addingNote)"
      :class="[
        'flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border transition-colors',
        addingNote
          ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
          : 'border-gray-300 text-gray-700 hover:bg-gray-50',
      ]"
      :title="addingNote ? 'Annuler le mode note (Échap)' : 'Ajouter une note'"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      {{ addingNote ? 'Annuler note' : 'Note' }}
    </button>
  </header>

  <!-- Rename modal -->
  <div v-if="showRename" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showRename = false">
    <div class="bg-white rounded-xl shadow-2xl w-80 p-6">
      <h3 class="font-semibold mb-3">Renommer le plan</h3>
      <input
        v-model="renameValue"
        class="w-full border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        @keyup.enter="confirmRename"
        autofocus
      />
      <div class="flex justify-end gap-2">
        <button @click="showRename = false" class="px-3 py-1.5 text-sm text-gray-600">Annuler</button>
        <button @click="confirmRename" class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg">Renommer</button>
      </div>
    </div>
  </div>

  <AddPlanModal v-if="showAddPlan" @close="showAddPlan = false" />
</template>
