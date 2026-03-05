<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { utils, write } from 'xlsx'
import { usePlansStore, type SaveResult, type AssignmentChange } from '@/stores/plansStore'
import { usePeopleStore } from '@/stores/peopleStore'
import type { Plan } from '@/types'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import FloorPlanCanvas from '@/components/plan/FloorPlanCanvas.vue'

type Mode = 'view' | 'edit-seats' | 'assign-people'

const plansStore = usePlansStore()
const peopleStore = usePeopleStore()

const mode = ref<Mode>('view')
const addingNote = ref(false)
const saving = ref(false)
const saveResult = ref<SaveResult | null>(null)

const sortedPlans = computed((): Plan[] =>
  [...plansStore.plans].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
)

// Enter / leave assign draft mode when mode changes
watch(mode, (newMode, oldMode) => {
  if (newMode === 'assign-people') {
    plansStore.enterAssignMode()
  } else if (oldMode === 'assign-people') {
    plansStore.leaveAssignMode() // auto-reverts unsaved changes
  }
})

function onNoteAdded() { addingNote.value = false }

// ---- Assign mode: save & cancel ----

async function handleSaveAssignments() {
  saving.value = true
  try {
    saveResult.value = await plansStore.saveAssignments()
  } finally {
    saving.value = false
  }
}

function handleCancelAssignments() {
  plansStore.revertAssignments()
}

// ---- Summary modal helpers ----

const arrivals = computed((): AssignmentChange[] =>
  (saveResult.value?.changes ?? []).filter(c => !c.from && c.to)
)
const moves = computed((): AssignmentChange[] =>
  (saveResult.value?.changes ?? []).filter(c => c.from && c.to)
)
const departures = computed((): AssignmentChange[] =>
  (saveResult.value?.changes ?? []).filter(c => c.from && !c.to)
)

function personName(id: string): string {
  const p = peopleStore.people.find(p => p.id === id)
  return p ? `${p.firstName} ${p.lastName}` : id
}

function workModeLabel(wm: string): string {
  if (wm === 'remote') return 'Télétravail'
  if (wm === 'hybrid') return 'Hybride'
  return 'Présentiel'
}

// ---- Excel export ----

function exportExcel() {
  if (!saveResult.value) return
  const { oldByPerson, newByPerson } = saveResult.value

  const changedIds = new Set(saveResult.value.changes.map(c => c.personId))
  const rows = peopleStore.people
    .filter(p => changedIds.has(p.id))
    .map(p => ({
      'Prénom': p.firstName,
      'Nom': p.lastName,
      'Équipe': p.team,
      'Rôle': p.role,
      'Mode': workModeLabel(p.workMode),
      'Ancien poste': oldByPerson.get(p.id)?.seatLabel ?? '',
      'Nouveau poste': newByPerson.get(p.id)?.seatLabel ?? '',
    }))

  const ws = utils.json_to_sheet(rows)
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Assignations')

  const buf = write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  const blob = new Blob([buf], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `assignations-${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ---- Per-plan rename ----

const renamingPlan = ref<Plan | null>(null)
const renameValue = ref('')

function startRename(plan: Plan) {
  renamingPlan.value = plan
  renameValue.value = plan.name
}

async function confirmRename() {
  if (!renamingPlan.value || !renameValue.value.trim()) return
  await plansStore.renamePlan(renamingPlan.value.id, renameValue.value.trim())
  renamingPlan.value = null
}

async function deletePlan(plan: Plan) {
  if (!confirm(`Supprimer le plan "${plan.name}" ?`)) return
  await plansStore.deletePlan(plan.id)
}
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden bg-gray-100">
    <AppHeader
      v-model:mode="mode"
      v-model:addingNote="addingNote"
      :saving="saving"
      @save-assignments="handleSaveAssignments"
      @cancel-assignments="handleCancelAssignments"
    />

    <div class="flex flex-1 overflow-hidden">
      <main class="flex-1 overflow-auto p-6 space-y-10">

        <section v-for="plan in sortedPlans" :key="plan.id">
          <div class="flex items-center gap-2 mb-3">
            <h2 class="text-base font-semibold text-gray-700">{{ plan.name }}</h2>
            <button @click="startRename(plan)" class="p-1 text-gray-300 hover:text-gray-600 rounded" title="Renommer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button @click="deletePlan(plan)" class="p-1 text-gray-300 hover:text-red-500 rounded" title="Supprimer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <FloorPlanCanvas
            :plan="plan"
            :mode="mode"
            :adding-note="addingNote"
            @note-added="onNoteAdded"
          />
        </section>

        <div v-if="sortedPlans.length === 0" class="flex flex-col items-center justify-center h-full text-center text-gray-400 pt-24">
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

  <!-- Rename modal -->
  <div v-if="renamingPlan" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="renamingPlan = null">
    <div class="bg-white rounded-xl shadow-2xl w-80 p-6">
      <h3 class="font-semibold mb-3">Renommer le plan</h3>
      <input
        v-model="renameValue"
        class="w-full border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        @keyup.enter="confirmRename"
        autofocus
      />
      <div class="flex justify-end gap-2">
        <button @click="renamingPlan = null" class="px-3 py-1.5 text-sm text-gray-600">Annuler</button>
        <button @click="confirmRename" class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg">Renommer</button>
      </div>
    </div>
  </div>

  <!-- Save summary modal -->
  <div v-if="saveResult" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="saveResult = null">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">

      <div class="px-6 py-4 border-b flex items-center justify-between shrink-0">
        <h2 class="text-lg font-semibold text-gray-800">Récapitulatif des changements</h2>
        <button @click="saveResult = null" class="text-gray-400 hover:text-gray-600">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-6 overflow-y-auto flex-1">
        <p v-if="saveResult.changes.length === 0" class="text-sm text-gray-500 text-center py-4">
          Aucun changement — les assignations sont identiques à la dernière sauvegarde.
        </p>

        <template v-else>
          <!-- Arrived -->
          <section v-if="arrivals.length > 0" class="mb-5">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-green-700 mb-2">
              Nouvelles assignations ({{ arrivals.length }})
            </h3>
            <ul class="space-y-1">
              <li v-for="c in arrivals" :key="c.personId" class="text-sm flex items-center gap-2">
                <span class="text-green-500">↳</span>
                <span class="font-medium">{{ personName(c.personId) }}</span>
                <span class="text-gray-400">→</span>
                <span>{{ c.to!.planName }}</span>
              </li>
            </ul>
          </section>

          <!-- Moved -->
          <section v-if="moves.length > 0" class="mb-5">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-2">
              Changements de place ({{ moves.length }})
            </h3>
            <ul class="space-y-1">
              <li v-for="c in moves" :key="c.personId" class="text-sm flex items-center gap-2">
                <span class="text-blue-500">⇄</span>
                <span class="font-medium">{{ personName(c.personId) }}</span>
                <span class="text-gray-400 line-through text-xs">{{ c.from!.planName }}</span>
                <span class="text-gray-400">→</span>
                <span>{{ c.to!.planName }}</span>
              </li>
            </ul>
          </section>

          <!-- Left -->
          <section v-if="departures.length > 0">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-red-700 mb-2">
              Désassignations ({{ departures.length }})
            </h3>
            <ul class="space-y-1">
              <li v-for="c in departures" :key="c.personId" class="text-sm flex items-center gap-2">
                <span class="text-red-400">↗</span>
                <span class="font-medium">{{ personName(c.personId) }}</span>
                <span class="text-gray-400 text-xs">quitte</span>
                <span>{{ c.from!.planName }}</span>
              </li>
            </ul>
          </section>
        </template>
      </div>

      <div class="px-6 py-4 border-t flex items-center justify-between shrink-0">
        <button
          @click="exportExcel"
          class="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Exporter Excel
        </button>
        <button
          @click="saveResult = null"
          class="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Fermer
        </button>
      </div>
    </div>
  </div>
</template>
