<script setup lang="ts">
import type { Person } from '@/types'

const props = defineProps<{
  person: Person
  draggable?: boolean
  compact?: boolean
}>()

function onDragStart(e: DragEvent) {
  if (!e.dataTransfer) return
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('application/x-person-id', props.person.id)
  e.dataTransfer.setData('application/x-source', 'sidebar')
}

const palette = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
  'bg-red-100 text-red-700',
  'bg-indigo-100 text-indigo-700',
]

const teamColorCache: Record<string, string> = {}

function teamColor(team: string): string {
  if (!teamColorCache[team]) {
    let hash = 0
    for (const c of team) hash = (hash * 31 + c.charCodeAt(0)) % palette.length
    teamColorCache[team] = palette[hash] ?? (palette[0] as string)
  }
  return teamColorCache[team] ?? (palette[0] as string)
}

function initials(p: Person): string {
  return `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`.toUpperCase()
}
</script>

<template>
  <div
    :draggable="draggable !== false"
    @dragstart="onDragStart"
    :class="[
      'flex items-center gap-2 bg-white border rounded-lg select-none transition-shadow',
      compact ? 'px-2 py-1' : 'px-3 py-2',
      draggable !== false ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : 'cursor-default',
    ]"
  >
    <!-- Avatar -->
    <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
      {{ initials(person) }}
    </div>

    <!-- Info -->
    <div class="flex-1 min-w-0">
      <div class="text-sm font-medium text-gray-800 truncate">
        {{ person.firstName }} {{ person.lastName }}
      </div>
      <div v-if="!compact && (person.team || person.role)" class="flex items-center gap-1 mt-0.5">
        <span v-if="person.team" :class="['text-xs px-1.5 py-0.5 rounded-full font-medium', teamColor(person.team)]">
          {{ person.team }}
        </span>
        <span v-if="person.role" class="text-xs text-gray-500 truncate">{{ person.role }}</span>
      </div>
    </div>
  </div>
</template>
