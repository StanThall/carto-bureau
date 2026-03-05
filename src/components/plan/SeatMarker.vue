<script setup lang="ts">
import type { Seat, Person } from '@/types'

const props = defineProps<{
  seat: Seat
  person: Person | null
  mode: string
}>()

const emit = defineEmits<{ click: []; delete: [] }>()

function onSeatDragStart(e: DragEvent) {
  if (!e.dataTransfer || !props.person) return
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('application/x-person-id', props.person.id)
  e.dataTransfer.setData('application/x-source', 'seat')
  e.dataTransfer.setData('application/x-seat-id', props.seat.id)
}

function initials(p: Person): string {
  return `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`.toUpperCase()
}

function teamBgColor(team: string): string {
  const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#f97316', '#ec4899']
  let hash = 0
  for (const c of team) hash = (hash * 31 + c.charCodeAt(0)) % colors.length
  return colors[hash] ?? (colors[0] as string)
}
</script>

<template>
  <div
    class="absolute z-10 -translate-x-1/2 -translate-y-1/2"
    :style="{ left: seat.x + '%', top: seat.y + '%' }"
    @click.stop="emit('click')"
  >
    <!-- Delete button (edit-seats mode) -->
    <button
      v-if="mode === 'edit-seats'"
      @click.stop="emit('delete')"
      class="absolute -top-2 -right-2 z-20 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] leading-none flex items-center justify-center hover:bg-red-600"
      title="Supprimer ce poste"
    >×</button>

    <!-- Empty seat -->
    <div
      v-if="!person"
      :class="[
        'w-5 h-5 rounded-full border-2 transition-colors',
        mode === 'edit-seats'
          ? 'border-indigo-400 bg-white hover:bg-indigo-50 cursor-pointer'
          : 'border-blue-400 bg-white/80 cursor-default',
      ]"
      :title="mode === 'edit-seats' ? 'Cliquer pour modifier le nom' : (seat.label ?? 'Poste libre')"
    />

    <!-- Occupied seat -->
    <div
      v-else
      :draggable="mode === 'assign-people'"
      @dragstart.stop="onSeatDragStart"
      :class="[
        'flex items-center gap-1 text-white text-xs px-2 py-1 rounded-full shadow-md font-medium whitespace-nowrap',
        mode === 'assign-people' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
      ]"
      :style="{ backgroundColor: teamBgColor(person.team) }"
      :title="`${person.firstName} ${person.lastName}${person.role ? ' — ' + person.role : ''}${seat.label ? '\n' + seat.label : ''}`"
    >
      <span class="font-bold">{{ initials(person) }}</span>
      <span class="max-w-24 truncate">{{ person.firstName }}</span>
    </div>

    <!-- Label -->
    <div
      v-if="seat.label"
      class="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 text-[10px] text-gray-500 bg-white/90 px-1 rounded whitespace-nowrap max-w-24 truncate pointer-events-none"
    >
      {{ seat.label }}
    </div>
  </div>
</template>
