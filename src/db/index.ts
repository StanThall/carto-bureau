import Dexie, { type Table } from 'dexie'
import type { Plan, Person } from '@/types'

export interface ImageRecord {
  id: string
  blob: Blob
}

export class CartoDB extends Dexie {
  plans!: Table<Plan>
  people!: Table<Person>
  images!: Table<ImageRecord>

  constructor() {
    super('carto-bureau')
    this.version(1).stores({
      plans: 'id, name',
      people: 'id, team, role, workMode',
      images: 'id',
    })
  }
}

export const db = new CartoDB()
