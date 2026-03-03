import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/db'
import type { Plan, Seat, Note } from '@/types'

// Strip Vue reactive Proxy before storing in IndexedDB.
// structuredClone (used internally by Dexie/IndexedDB) can silently drop
// nested arrays when the object is a Vue reactive Proxy.
function rawPlan(plan: Plan): Plan {
  return {
    id: plan.id,
    name: plan.name,
    imageId: plan.imageId,
    seats: plan.seats.map((s: Seat): Seat => ({
      id: s.id,
      x: s.x,
      y: s.y,
      personId: s.personId,
      ...(s.label !== undefined ? { label: s.label } : {}),
    })),
    notes: plan.notes.map((n: Note): Note => ({
      id: n.id,
      x: n.x,
      y: n.y,
      content: n.content,
    })),
  }
}

export const usePlansStore = defineStore('plans', () => {
  const plans = ref<Plan[]>([])
  const activePlanId = ref<string | null>(null)

  const activePlan = computed((): Plan | null =>
    plans.value.find((p: Plan) => p.id === activePlanId.value) ?? null
  )

  async function loadPlans() {
    plans.value = await db.plans.toArray()
    if (plans.value.length > 0 && !activePlanId.value) {
      activePlanId.value = plans.value[0]?.id ?? null
    }
  }

  async function addPlan(name: string, imageBlob: Blob): Promise<string> {
    const imageId = uuidv4()
    const plan: Plan = { id: uuidv4(), name, imageId, seats: [], notes: [] }
    await db.images.add({ id: imageId, blob: imageBlob })
    await db.plans.add(rawPlan(plan))
    plans.value.push(plan)
    activePlanId.value = plan.id
    return plan.id
  }

  async function deletePlan(planId: string) {
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return
    await db.images.delete(plan.imageId)
    await db.plans.delete(planId)
    plans.value = plans.value.filter((p: Plan) => p.id !== planId)
    if (activePlanId.value === planId) {
      activePlanId.value = plans.value[0]?.id ?? null
    }
  }

  async function renamePlan(planId: string, name: string) {
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return
    plan.name = name
    await db.plans.put(rawPlan(plan))
  }

  async function addSeat(planId: string, x: number, y: number) {
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return
    const seat: Seat = { id: uuidv4(), x, y, personId: null }
    plan.seats.push(seat)
    await db.plans.put(rawPlan(plan))
  }

  async function removeSeat(planId: string, seatId: string) {
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return
    plan.seats = plan.seats.filter((s: Seat) => s.id !== seatId)
    await db.plans.put(rawPlan(plan))
  }

  async function assignPerson(planId: string, seatId: string, personId: string | null) {
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return
    // Unassign this person from any other seat first
    plan.seats.forEach((s: Seat) => { if (s.personId === personId) s.personId = null })
    const seat = plan.seats.find((s: Seat) => s.id === seatId)
    if (!seat) return
    seat.personId = personId
    await db.plans.put(rawPlan(plan))
  }

  // Move a person from one seat to another in a single DB write.
  // If the target seat is already occupied, the two people are swapped.
  async function moveBetweenSeats(planId: string, fromSeatId: string, toSeatId: string) {
    if (fromSeatId === toSeatId) return
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return
    const fromSeat = plan.seats.find((s: Seat) => s.id === fromSeatId)
    const toSeat = plan.seats.find((s: Seat) => s.id === toSeatId)
    if (!fromSeat || !toSeat) return

    // Swap the two personIds (temp variable avoids destructuring issues with Proxies)
    const temp = fromSeat.personId
    fromSeat.personId = toSeat.personId
    toSeat.personId = temp

    await db.plans.put(rawPlan(plan))
  }

  async function unassignFromSeat(planId: string, seatId: string) {
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return
    const seat = plan.seats.find((s: Seat) => s.id === seatId)
    if (!seat) return
    seat.personId = null
    await db.plans.put(rawPlan(plan))
  }

  async function addNote(planId: string, x: number, y: number): Promise<string> {
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return ''
    const note: Note = { id: uuidv4(), x, y, content: '' }
    plan.notes.push(note)
    await db.plans.put(rawPlan(plan))
    return note.id
  }

  async function updateNote(planId: string, noteId: string, content: string) {
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return
    const note = plan.notes.find((n: Note) => n.id === noteId)
    if (!note) return
    note.content = content
    await db.plans.put(rawPlan(plan))
  }

  async function moveNote(planId: string, noteId: string, x: number, y: number) {
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return
    const note = plan.notes.find((n: Note) => n.id === noteId)
    if (!note) return
    note.x = x
    note.y = y
    await db.plans.put(rawPlan(plan))
  }

  async function deleteNote(planId: string, noteId: string) {
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return
    plan.notes = plan.notes.filter((n: Note) => n.id !== noteId)
    await db.plans.put(rawPlan(plan))
  }

  return {
    plans,
    activePlanId,
    activePlan,
    loadPlans,
    addPlan,
    deletePlan,
    renamePlan,
    addSeat,
    removeSeat,
    assignPerson,
    moveBetweenSeats,
    unassignFromSeat,
    addNote,
    updateNote,
    moveNote,
    deleteNote,
  }
})
