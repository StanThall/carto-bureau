export type WorkMode = 'onsite' | 'remote' | 'hybrid'

export interface Person {
  id: string
  firstName: string
  lastName: string
  team: string
  role: string
  workMode: WorkMode
}
