import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { Plan, Seat, Note } from '@/types'

export const usePlansStore = defineStore('plans', () => {
  const plans = ref<Plan[]>([])
  const activePlanId = ref<string | null>(null)

  const activePlan = computed((): Plan | null =>
    plans.value.find((p: Plan) => p.id === activePlanId.value) ?? null
  )

  async function loadPlans() {
    const res = await fetch('/api/plans')
    plans.value = await res.json() as Plan[]
    if (plans.value.length > 0 && !activePlanId.value) {
      activePlanId.value = plans.value[0]?.id ?? null
    }
  }

  async function addPlan(name: string, imageBlob: Blob): Promise<string> {
    const form = new FormData()
    form.append('name', name)
    form.append('image', imageBlob)
    const res = await fetch('/api/plans', { method: 'POST', body: form })
    const plan = await res.json() as Plan
    plans.value.push(plan)
    activePlanId.value = plan.id
    return plan.id
  }

  async function deletePlan(planId: string) {
    await fetch(`/api/plans/${planId}`, { method: 'DELETE' })
    plans.value = plans.value.filter((p: Plan) => p.id !== planId)
    if (activePlanId.value === planId) {
      activePlanId.value = plans.value[0]?.id ?? null
    }
  }

  async function renamePlan(planId: string, name: string) {
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return
    plan.name = name
    await fetch(`/api/plans/${planId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
  }

  async function addSeat(planId: string, x: number, y: number) {
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return
    const seat: Seat = { id: uuidv4(), x, y, personId: null }
    plan.seats.push(seat)
    await fetch(`/api/plans/${planId}/seats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: seat.id, x, y }),
    })
  }

  async function removeSeat(planId: string, seatId: string) {
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return
    plan.seats = plan.seats.filter((s: Seat) => s.id !== seatId)
    await fetch(`/api/plans/${planId}/seats/${seatId}`, { method: 'DELETE' })
  }

  async function assignPerson(planId: string, seatId: string, personId: string | null) {
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return
    // Unassign locally from any other seat first
    plan.seats.forEach((s: Seat) => { if (s.personId === personId) s.personId = null })
    const seat = plan.seats.find((s: Seat) => s.id === seatId)
    if (!seat) return
    seat.personId = personId
    await fetch(`/api/plans/${planId}/seats/${seatId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId }),
    })
  }

  async function moveBetweenSeats(planId: string, fromSeatId: string, toSeatId: string) {
    if (fromSeatId === toSeatId) return
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return
    const fromSeat = plan.seats.find((s: Seat) => s.id === fromSeatId)
    const toSeat = plan.seats.find((s: Seat) => s.id === toSeatId)
    if (!fromSeat || !toSeat) return
    // Swap locally
    const temp = fromSeat.personId
    fromSeat.personId = toSeat.personId
    toSeat.personId = temp
    await fetch(`/api/plans/${planId}/seats/move`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromSeatId, toSeatId }),
    })
  }

  async function unassignFromSeat(planId: string, seatId: string) {
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return
    const seat = plan.seats.find((s: Seat) => s.id === seatId)
    if (!seat) return
    seat.personId = null
    await fetch(`/api/plans/${planId}/seats/${seatId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: null }),
    })
  }

  async function addNote(planId: string, x: number, y: number): Promise<string> {
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return ''
    const note: Note = { id: uuidv4(), x, y, content: '' }
    plan.notes.push(note)
    await fetch(`/api/plans/${planId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: note.id, x, y }),
    })
    return note.id
  }

  async function updateNote(planId: string, noteId: string, content: string) {
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return
    const note = plan.notes.find((n: Note) => n.id === noteId)
    if (!note) return
    note.content = content
    await fetch(`/api/plans/${planId}/notes/${noteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
  }

  async function moveNote(planId: string, noteId: string, x: number, y: number) {
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return
    const note = plan.notes.find((n: Note) => n.id === noteId)
    if (!note) return
    note.x = x
    note.y = y
    await fetch(`/api/plans/${planId}/notes/${noteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x, y }),
    })
  }

  async function deleteNote(planId: string, noteId: string) {
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return
    plan.notes = plan.notes.filter((n: Note) => n.id !== noteId)
    await fetch(`/api/plans/${planId}/notes/${noteId}`, { method: 'DELETE' })
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
