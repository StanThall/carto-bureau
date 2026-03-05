<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
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

// --- Snap grid ---
const gridStep = ref(1.5) // percent

function snap(v: number): number {
  return Math.round(v / gridStep.value) * gridStep.value
}

const hoverPos = ref<{ x: number; y: number } | null>(null)

function onMouseMove(e: MouseEvent) {
  if (props.mode !== 'edit-seats') { hoverPos.value = null; return }
  const { x, y } = toPercent(e)
  hoverPos.value = { x: snap(x), y: snap(y) }
}

function onMouseLeave() {
  hoverPos.value = null
}

// Alignment guides: seats sharing the same snapped X or Y as the hover position
const alignmentGuides = computed(() => {
  if (!hoverPos.value || props.mode !== 'edit-seats') return { xs: [] as number[], ys: [] as number[] }
  const xs = new Set<number>()
  const ys = new Set<number>()
  for (const seat of props.plan.seats) {
    if (Math.abs(seat.x - hoverPos.value.x) < 0.01) xs.add(seat.x)
    if (Math.abs(seat.y - hoverPos.value.y) < 0.01) ys.add(seat.y)
  }
  return { xs: [...xs], ys: [...ys] }
})
// -----------------

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
    const seatId = await plansStore.addSeat(props.plan.id, snap(x), snap(y))
    if (seatId) openLabelEditor(seatId)
  } else if (props.addingNote) {
    const { x, y } = toPercent(e)
    await plansStore.addNote(props.plan.id, x, y)
    emit('note-added')
  }
}

// ---- Label editing ----

const editingSeatId = ref<string | null>(null)
const editingLabel = ref('')
const labelInputRef = ref<HTMLInputElement | null>(null)

const editingSeat = computed(() =>
  editingSeatId.value
    ? props.plan.seats.find(s => s.id === editingSeatId.value) ?? null
    : null
)

function openLabelEditor(seatId: string) {
  const seat = props.plan.seats.find(s => s.id === seatId)
  if (!seat) return
  editingSeatId.value = seatId
  editingLabel.value = seat.label ?? ''
  nextTick(() => labelInputRef.value?.select())
}

async function confirmLabel() {
  if (!editingSeatId.value) return
  const seatId = editingSeatId.value
  editingSeatId.value = null
  await plansStore.updateSeatLabel(props.plan.id, seatId, editingLabel.value.trim())
}

function cancelLabel() {
  editingSeatId.value = null
}

function onSeatClick(seatId: string) {
  if (props.mode !== 'edit-seats') return
  openLabelEditor(seatId)
}

async function onSeatDelete(seatId: string) {
  if (props.mode !== 'edit-seats') return
  const seat = props.plan.seats.find(s => s.id === seatId)
  if (!seat) return
  if (seat.personId) {
    if (!confirm('Ce poste est occupé. Supprimer quand même ?')) return
  }
  if (editingSeatId.value === seatId) editingSeatId.value = null
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
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
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

    <!-- Snap grid overlay -->
    <div
      v-if="mode === 'edit-seats'"
      class="absolute inset-0 pointer-events-none"
      :style="{
        backgroundImage: 'linear-gradient(rgba(99,102,241,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.12) 1px, transparent 1px)',
        backgroundSize: `${gridStep}% ${gridStep}%`,
      }"
    />

    <!-- Alignment guides (dashed lines on shared X or Y with existing seats) -->
    <svg
      v-if="mode === 'edit-seats' && (alignmentGuides.xs.length || alignmentGuides.ys.length)"
      class="absolute inset-0 w-full h-full pointer-events-none"
    >
      <line
        v-for="x in alignmentGuides.xs"
        :key="'x' + x"
        :x1="x + '%'" :x2="x + '%'" y1="0%" y2="100%"
        stroke="rgba(99,102,241,0.75)" stroke-width="1" stroke-dasharray="4 3"
      />
      <line
        v-for="y in alignmentGuides.ys"
        :key="'y' + y"
        x1="0%" x2="100%" :y1="y + '%'" :y2="y + '%'"
        stroke="rgba(99,102,241,0.75)" stroke-width="1" stroke-dasharray="4 3"
      />
    </svg>

    <!-- Ghost dot at snapped hover position -->
    <div
      v-if="mode === 'edit-seats' && hoverPos"
      class="absolute w-4 h-4 rounded-full bg-indigo-400/40 ring-2 ring-indigo-500 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-[left,top] duration-75"
      :style="{ left: hoverPos.x + '%', top: hoverPos.y + '%' }"
    />

    <SeatMarker
      v-for="seat in plan.seats"
      :key="seat.id"
      :seat="seat"
      :person="getPerson(seat.personId)"
      :mode="mode"
      @click="onSeatClick(seat.id)"
      @delete="onSeatDelete(seat.id)"
      @dragover.prevent
      @drop.stop.prevent="onDropOnSeat(seat.id, $event)"
    />

    <!-- Floating label editor -->
    <div
      v-if="editingSeatId && editingSeat"
      class="absolute z-30 -translate-x-1/2"
      :style="{ left: editingSeat.x + '%', top: `calc(${editingSeat.y}% + 18px)` }"
    >
      <input
        ref="labelInputRef"
        v-model="editingLabel"
        class="w-32 text-xs px-2 py-1 border-2 border-indigo-500 rounded-lg shadow-lg focus:outline-none bg-white"
        placeholder="Nom du poste…"
        @keyup.enter="confirmLabel"
        @keyup.escape="cancelLabel"
        @blur="confirmLabel"
      />
    </div>

    <NoteOverlay
      v-for="note in plan.notes"
      :key="note.id"
      :note="note"
      :plan-id="plan.id"
    />

    <!-- Edit mode hint -->
    <div
      v-if="mode === 'edit-seats'"
      class="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none"
    >
      <span>Clic pour ajouter · Clic sur un poste pour nommer · × pour supprimer</span>
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
