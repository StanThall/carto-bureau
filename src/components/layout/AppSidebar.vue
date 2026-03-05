<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePeopleStore } from '@/stores/peopleStore'
import { usePlansStore } from '@/stores/plansStore'
import PersonCard from '@/components/people/PersonCard.vue'
import PeopleFilter from '@/components/people/PeopleFilter.vue'
import PeopleImporter from '@/components/people/PeopleImporter.vue'
import type { Person } from '@/types'

defineProps<{ mode: string }>()

declare const __APP_VERSION__: string

const peopleStore = usePeopleStore()
const plansStore = usePlansStore()
const isDragOver = ref(false)

const filterTeam = ref('')
const filterRole = ref('')
const search = ref('')

const assignedIds = computed((): Set<string> => {
  const plan = plansStore.activePlan
  if (!plan) return new Set<string>()
  return new Set(
    plan.seats
      .map(s => s.personId)
      .filter((id): id is string => id !== null)
  )
})

function matchesFilter(p: Person): boolean {
  if (filterTeam.value && p.team !== filterTeam.value) return false
  if (filterRole.value && p.role !== filterRole.value) return false
  if (search.value) {
    const q = search.value.toLowerCase()
    if (
      !p.firstName.toLowerCase().includes(q) &&
      !p.lastName.toLowerCase().includes(q) &&
      !p.team.toLowerCase().includes(q) &&
      !p.role.toLowerCase().includes(q)
    ) return false
  }
  return true
}

const unassignedOnsite = computed((): Person[] =>
  peopleStore.assignableWorkers.filter((p: Person) => !assignedIds.value.has(p.id) && matchesFilter(p))
)

const assignedOnsite = computed((): Person[] =>
  peopleStore.assignableWorkers.filter((p: Person) => assignedIds.value.has(p.id) && matchesFilter(p))
)

const remoteFiltered = computed((): Person[] =>
  peopleStore.remoteWorkers.filter((p: Person) => matchesFilter(p))
)

function onDragOver() {
  isDragOver.value = true
}

async function onDrop(e: DragEvent) {
  isDragOver.value = false
  const source = e.dataTransfer?.getData('application/x-source')
  if (source !== 'seat') return
  const seatId = e.dataTransfer?.getData('application/x-seat-id')
  if (!seatId || !plansStore.activePlan) return
  await plansStore.unassignFromSeat(plansStore.activePlan.id, seatId)
}
</script>

<template>
  <aside
    class="w-72 border-l bg-gray-50 flex flex-col h-full overflow-hidden shrink-0 transition-colors"
    :class="isDragOver ? 'bg-blue-50 border-blue-400' : ''"
    @dragover.prevent="onDragOver"
    @dragleave="isDragOver = false"
    @drop.prevent="onDrop"
  >
    <PeopleImporter />
    <PeopleFilter
      v-model:filterTeam="filterTeam"
      v-model:filterRole="filterRole"
      v-model:search="search"
    />

    <div class="flex-1 overflow-y-auto">
      <!-- Unassigned people -->
      <div class="p-3">
        <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Non assignés ({{ unassignedOnsite.length }})
        </h3>
        <div class="space-y-1.5">
          <PersonCard
            v-for="person in unassignedOnsite"
            :key="person.id"
            :person="person"
            :draggable="mode === 'assign-people'"
          />
          <p v-if="unassignedOnsite.length === 0 && peopleStore.assignableWorkers.length > 0" class="text-xs text-gray-400 italic text-center py-2">
            Tous assignés
          </p>
          <p v-if="peopleStore.people.length === 0" class="text-xs text-gray-400 italic text-center py-2">
            Importer une liste de personnes
          </p>
        </div>
      </div>

      <!-- Assigned people (collapsible) -->
      <details v-if="assignedOnsite.length > 0" class="px-3 pb-3">
        <summary class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 cursor-pointer select-none">
          Assignés ({{ assignedOnsite.length }})
        </summary>
        <div class="space-y-1.5 mt-2">
          <PersonCard
            v-for="person in assignedOnsite"
            :key="person.id"
            :person="person"
            :draggable="false"
          />
        </div>
      </details>

      <!-- Remote workers -->
      <details v-if="remoteFiltered.length > 0" class="px-3 pb-3 border-t pt-3">
        <summary class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 cursor-pointer select-none flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Télétravail ({{ remoteFiltered.length }})
        </summary>
        <div class="space-y-1.5 mt-2">
          <PersonCard
            v-for="person in remoteFiltered"
            :key="person.id"
            :person="person"
            :draggable="false"
          />
        </div>
      </details>
    </div>

    <!-- Footer -->
    <div
      class="border-t p-3 text-xs text-center transition-colors"
      :class="isDragOver ? 'text-blue-600 bg-blue-50' : 'text-gray-400'"
    >
      <template v-if="isDragOver">Déposer ici pour désassigner</template>
      <template v-else>{{ peopleStore.people.length }} personnes · {{ assignedIds.size }} assignées</template>
      <div class="mt-1 text-gray-300">v{{ __APP_VERSION__ }}</div>
    </div>
  </aside>
</template>
