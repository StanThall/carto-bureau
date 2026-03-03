<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Plan, Person } from '@/types'
import { usePlansStore } from '@/stores/plansStore'
import { usePeopleStore } from '@/stores/peopleStore'
import { useImageStorage } from '@/composables/useImageStorage'
import { useFloorPlan } from '@/composables/useFloorPlan'
import SeatMarker from './SeatMarker.vue'
import NoteOverlay from './NoteOverlay.vue'

const props = defineProps<{
  plan: Plan
  mode: string
  addingNote: boolean
}>()

const emit = defineEmits<{ 'note-added': [] }>()

const plansStore = usePlansStore()
const peopleStore = usePeopleStore()
const canvasRef = ref<HTMLElement | null>(null)

const { objectUrl, loadImage } = useImageStorage()
const { toPercent } = useFloorPlan(canvasRef)

watch(() => props.plan.imageId, (id) => { if (id) loadImage(id) }, { immediate: true })

const cursor = computed((): string => {
  if (props.addingNote) return 'cursor-crosshair'
  if (props.mode === 'edit-seats') return 'cursor-cell'
  return 'cursor-default'
})

function getPerson(personId: string | null): Person | null {
  if (!personId) return null
  return peopleStore.people.find((p: Person) => p.id === personId) ?? null
}

async function onCanvasClick(e: MouseEvent) {
  if (props.mode === 'edit-seats') {
    const { x, y } = toPercent(e)
    await plansStore.addSeat(props.plan.id, x, y)
  } else if (props.addingNote) {
    const { x, y } = toPercent(e)
    await plansStore.addNote(props.plan.id, x, y)
    emit('note-added')
  }
}

async function onSeatClick(seatId: string) {
  if (props.mode !== 'edit-seats') return
  const seat = props.plan.seats.find(s => s.id === seatId)
  if (!seat) return
  if (seat.personId) {
    if (!confirm('Ce poste est occupé. Supprimer quand même ?')) return
  }
  await plansStore.removeSeat(props.plan.id, seatId)
}

async function onDropOnSeat(seatId: string, e: DragEvent) {
  if (props.mode !== 'assign-people') return
  const personId = e.dataTransfer?.getData('application/x-person-id')
  const source = e.dataTransfer?.getData('application/x-source')
  const fromSeatId = e.dataTransfer?.getData('application/x-seat-id')
  if (!personId) return

  // Drag from another seat → move or swap in one atomic write
  if (source === 'seat' && fromSeatId && fromSeatId !== seatId) {
    await plansStore.moveBetweenSeats(props.plan.id, fromSeatId, seatId)
    return
  }

  // Drag from sidebar → assign (displaces whoever was on target seat)
  await plansStore.assignPerson(props.plan.id, seatId, personId)
}
</script>

<template>
  <div
    ref="canvasRef"
    data-canvas
    class="relative inline-block select-none"
    :class="cursor"
    @click.self="onCanvasClick"
    @dragover.prevent
    @drop.prevent
  >
    <img
      v-if="objectUrl"
      :src="objectUrl"
      class="block max-w-full pointer-events-none"
      draggable="false"
      alt="Floor plan"
    />

    <SeatMarker
      v-for="seat in plan.seats"
      :key="seat.id"
      :seat="seat"
      :person="getPerson(seat.personId)"
      :mode="mode"
      @click="onSeatClick(seat.id)"
      @dragover.prevent
      @drop.stop.prevent="onDropOnSeat(seat.id, $event)"
    />

    <NoteOverlay
      v-for="note in plan.notes"
      :key="note.id"
      :note="note"
      :plan-id="plan.id"
    />

    <!-- Edit mode hint -->
    <div
      v-if="mode === 'edit-seats'"
      class="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none"
    >
      Clic pour ajouter un poste · Clic sur un poste pour le supprimer
    </div>

    <!-- Add note hint -->
    <div
      v-if="addingNote"
      class="absolute bottom-3 left-1/2 -translate-x-1/2 bg-blue-600/90 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none"
    >
      Cliquer sur le plan pour placer la note
    </div>
  </div>
</template>
