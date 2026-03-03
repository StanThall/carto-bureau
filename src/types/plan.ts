export interface Seat {
  id: string
  x: number // 0-100 (% of plan width)
  y: number // 0-100 (% of plan height)
  personId: string | null
  label?: string
}

export interface Note {
  id: string
  x: number // 0-100 (%)
  y: number // 0-100 (%)
  content: string // HTML from Tiptap
}

export interface Plan {
  id: string
  name: string
  imageId: string
  seats: Seat[]
  notes: Note[]
}
