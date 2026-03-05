import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { Plan, Seat, Note } from '@/types'

export interface PersonPlace {
  planId: string
  planName: string
  seatLabel?: string
}

export interface AssignmentChange {
  personId: string
  from: PersonPlace | null  // null = was unassigned
  to: PersonPlace | null    // null = now unassigned
}

export interface SaveResult {
  changes: AssignmentChange[]
  oldByPerson: Map<string, PersonPlace>  // for Excel export
  newByPerson: Map<string, PersonPlace>
}

export const usePlansStore = defineStore('plans', () => {
  const plans = ref<Plan[]>([])
  const activePlanId = ref<string | null>(null)

  const activePlan = computed((): Plan | null =>
    plans.value.find((p: Plan) => p.id === activePlanId.value) ?? null
  )

  // -------------------------------------------------------------------------
  // Draft mode: assignment actions only update local state; save/revert commit
  // -------------------------------------------------------------------------
  const draftMode = ref(false)

  // seatId → personId | null  (plain Map, not reactive — only read in actions)
  const savedAssignments = new Map<string, string | null>()

  function captureAssignments() {
    savedAssignments.clear()
    for (const plan of plans.value) {
      for (const seat of plan.seats) {
        savedAssignments.set(seat.id, seat.personId)
      }
    }
  }

  function buildPersonMaps(): { oldByPerson: Map<string, PersonPlace>; newByPerson: Map<string, PersonPlace> } {
    const oldByPerson = new Map<string, PersonPlace>()
    const newByPerson = new Map<string, PersonPlace>()
    for (const plan of plans.value) {
      for (const seat of plan.seats) {
        const savedPersonId = savedAssignments.get(seat.id) ?? null
        if (savedPersonId) oldByPerson.set(savedPersonId, { planId: plan.id, planName: plan.name, seatLabel: seat.label })
        if (seat.personId) newByPerson.set(seat.personId, { planId: plan.id, planName: plan.name, seatLabel: seat.label })
      }
    }
    return { oldByPerson, newByPerson }
  }

  function computeChanges(
    oldByPerson: Map<string, PersonPlace>,
    newByPerson: Map<string, PersonPlace>,
  ): AssignmentChange[] {
    const changes: AssignmentChange[] = []
    const allIds = new Set([...oldByPerson.keys(), ...newByPerson.keys()])
    for (const personId of allIds) {
      const from = oldByPerson.get(personId) ?? null
      const to = newByPerson.get(personId) ?? null
      if (from?.planId !== to?.planId) {
        changes.push({ personId, from, to })
      }
    }
    return changes
  }

  /** Enter assign mode: capture current state as the revert baseline. */
  function enterAssignMode() {
    captureAssignments()
    draftMode.value = true
  }

  /** Leave assign mode (switching to another mode): auto-revert unsaved changes. */
  function leaveAssignMode() {
    for (const plan of plans.value) {
      for (const seat of plan.seats) {
        const saved = savedAssignments.get(seat.id)
        if (saved !== undefined && seat.personId !== saved) seat.personId = saved
      }
    }
    draftMode.value = false
  }

  /** Cancel button: revert to saved state, stay in assign mode. */
  function revertAssignments() {
    for (const plan of plans.value) {
      for (const seat of plan.seats) {
        const saved = savedAssignments.get(seat.id)
        if (saved !== undefined) seat.personId = saved
      }
    }
    captureAssignments() // re-baseline (no-op content-wise)
  }

  /** Save button: persist diff to API, update baseline, return changes for the summary. */
  async function saveAssignments(): Promise<SaveResult> {
    const { oldByPerson, newByPerson } = buildPersonMaps()
    const changes = computeChanges(oldByPerson, newByPerson)

    // Persist each changed seat (sequential to avoid race conditions on unassign logic)
    for (const plan of plans.value) {
      for (const seat of plan.seats) {
        const savedPersonId = savedAssignments.get(seat.id) ?? null
        if (seat.personId !== savedPersonId) {
          await fetch(`/api/plans/${plan.id}/seats/${seat.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ personId: seat.personId }),
          })
        }
      }
    }

    captureAssignments() // update baseline to current state
    // draftMode stays true — user remains in assign mode
    return { changes, oldByPerson, newByPerson }
  }

  // -------------------------------------------------------------------------
  // Core actions
  // -------------------------------------------------------------------------

  async function loadPlans() {
    const res = await fetch('/api/plans')
    plans.value = await res.json() as Plan[]
    if (plans.value.length > 0 && !activePlanId.value) {
      activePlanId.value = plans.value[0]?.id ?? null
    }
    captureAssignments()
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

  async function addSeat(planId: string, x: number, y: number): Promise<string | undefined> {
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return
    const seat: Seat = { id: uuidv4(), x, y, personId: null }
    plan.seats.push(seat)
    // New seat: add to snapshot so revert doesn't touch it
    savedAssignments.set(seat.id, null)
    await fetch(`/api/plans/${planId}/seats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: seat.id, x, y }),
    })
    return seat.id
  }

  async function updateSeatLabel(planId: string, seatId: string, label: string) {
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return
    const seat = plan.seats.find((s: Seat) => s.id === seatId)
    if (!seat) return
    seat.label = label || undefined
    await fetch(`/api/plans/${planId}/seats/${seatId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: label || null }),
    })
  }

  async function removeSeat(planId: string, seatId: string) {
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return
    plan.seats = plan.seats.filter((s: Seat) => s.id !== seatId)
    savedAssignments.delete(seatId)
    await fetch(`/api/plans/${planId}/seats/${seatId}`, { method: 'DELETE' })
  }

  async function assignPerson(planId: string, seatId: string, personId: string | null) {
    const plan = plans.value.find((p: Plan) => p.id === planId)
    if (!plan) return
    plan.seats.forEach((s: Seat) => { if (s.personId === personId) s.personId = null })
    const seat = plan.seats.find((s: Seat) => s.id === seatId)
    if (!seat) return
    seat.personId = personId
    if (draftMode.value) return
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
    const temp = fromSeat.personId
    fromSeat.personId = toSeat.personId
    toSeat.personId = temp
    if (draftMode.value) return
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
    if (draftMode.value) return
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

  function freeSeatsByPersonIds(personIds: string[]) {
    const idSet = new Set(personIds)
    for (const plan of plans.value) {
      for (const seat of plan.seats) {
        if (seat.personId && idSet.has(seat.personId)) {
          seat.personId = null
        }
      }
    }
  }

  return {
    plans,
    activePlanId,
    activePlan,
    draftMode,
    loadPlans,
    addPlan,
    deletePlan,
    renamePlan,
    addSeat,
    updateSeatLabel,
    removeSeat,
    assignPerson,
    moveBetweenSeats,
    unassignFromSeat,
    addNote,
    updateNote,
    moveNote,
    deleteNote,
    freeSeatsByPersonIds,
    enterAssignMode,
    leaveAssignMode,
    revertAssignments,
    saveAssignments,
  }
})
