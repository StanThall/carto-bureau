<script setup lang="ts">
import { computed } from 'vue'
import { usePeopleStore } from '@/stores/peopleStore'
import type { Person } from '@/types'

defineProps<{
  filterTeam: string
  filterRole: string
  search: string
}>()

const emit = defineEmits<{
  'update:filterTeam': [v: string]
  'update:filterRole': [v: string]
  'update:search': [v: string]
}>()

const peopleStore = usePeopleStore()

const teams = computed((): string[] =>
  [...new Set(peopleStore.people.map((p: Person) => p.team).filter((t): t is string => Boolean(t)))].sort()
)
const roles = computed((): string[] =>
  [...new Set(peopleStore.people.map((p: Person) => p.role).filter((r): r is string => Boolean(r)))].sort()
)
</script>

<template>
  <div class="p-3 space-y-2 border-b">
    <input
      :value="search"
      @input="emit('update:search', ($event.target as HTMLInputElement).value)"
      type="text"
      placeholder="Rechercher..."
      class="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
    <div class="flex gap-2">
      <select
        :value="filterTeam"
        @change="emit('update:filterTeam', ($event.target as HTMLSelectElement).value)"
        class="flex-1 border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        <option value="">Toutes les équipes</option>
        <option v-for="t in teams" :key="t" :value="t">{{ t }}</option>
      </select>
      <select
        :value="filterRole"
        @change="emit('update:filterRole', ($event.target as HTMLSelectElement).value)"
        class="flex-1 border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        <option value="">Tous les rôles</option>
        <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
      </select>
    </div>
  </div>
</template>
