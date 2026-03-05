import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { read, utils } from 'xlsx'
import Papa from 'papaparse'
import type { Person, WorkMode } from '@/types'

type RawRow = Record<string, string>

function normalizeWorkMode(value: string | undefined): WorkMode {
  if (!value) return 'onsite'
  const v = value.toLowerCase().trim()
  if (v === 'remote' || v === 'télétravail' || v === 'teletravail' || v === 'distanciel') return 'remote'
  if (v === 'hybrid' || v === 'hybride') return 'hybrid'
  return 'onsite'
}

// Normalize a string for column matching: strip diacritics, trim, lowercase
// This handles NFD/NFC differences between Excel files and source code literals
function norm(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

function col(row: RawRow, ...keys: string[]): string {
  const normalizedKeys = keys.map(norm)
  for (const [rawKey, value] of Object.entries(row)) {
    const normalizedCol = norm(rawKey)
    if (normalizedKeys.includes(normalizedCol) && value) return value.trim()
  }
  return ''
}

function rowToPerson(row: RawRow): Person {
  return {
    id: uuidv4(),
    firstName: col(row, 'firstName', 'firstname', 'first name', 'prénom', 'prenom'),
    lastName: col(row, 'lastName', 'lastname', 'last name', 'nom'),
    team: col(row, 'team', 'équipe', 'equipe', 'service', 'department', 'département'),
    role: col(row, 'role', 'rôle', 'poste', 'fonction', 'title', 'job title'),
    workMode: normalizeWorkMode(col(row, 'workMode', 'work mode', 'télétravail', 'teletravail', 'mode') || undefined),
  }
}

export const usePeopleStore = defineStore('people', () => {
  const people = ref<Person[]>([])

  const remoteWorkers = computed((): Person[] => people.value.filter((p: Person) => p.workMode === 'remote'))
  const assignableWorkers = computed((): Person[] => people.value.filter((p: Person) => p.workMode !== 'remote'))

  async function loadPeople() {
    const res = await fetch('/api/people')
    people.value = await res.json() as Person[]
  }

  async function importFromFile(file: File): Promise<number> {
    const rows = file.name.toLowerCase().endsWith('.csv')
      ? await parseCSV(file)
      : await parseXLSX(file)

    const newPeople = rows.map(rowToPerson)
    await fetch('/api/people/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPeople),
    })
    people.value.push(...newPeople)
    return newPeople.length
  }

  async function parseCSV(file: File): Promise<RawRow[]> {
    return new Promise((resolve, reject) => {
      Papa.parse<RawRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: result => resolve(result.data),
        error: reject,
      })
    })
  }

  async function parseXLSX(file: File): Promise<RawRow[]> {
    const buffer = await file.arrayBuffer()
    const wb = read(buffer)
    const sheetName = wb.SheetNames[0]
    if (!sheetName) return []
    const ws = wb.Sheets[sheetName]
    if (!ws) return []
    return utils.sheet_to_json<RawRow>(ws, { defval: '' })
  }

  async function deletePerson(personId: string) {
    await fetch(`/api/people/${personId}`, { method: 'DELETE' })
    people.value = people.value.filter((p: Person) => p.id !== personId)
  }

  async function clearAll() {
    await fetch('/api/people', { method: 'DELETE' })
    people.value = []
  }

  return {
    people,
    remoteWorkers,
    assignableWorkers,
    loadPeople,
    importFromFile,
    deletePerson,
    clearAll,
  }
})
