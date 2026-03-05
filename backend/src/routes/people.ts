import { Router, Request, Response } from 'express'
import { pool } from '../db'

interface PersonRow {
  id: string
  first_name: string
  last_name: string
  team: string
  role: string
  work_mode: string
}

interface PersonBody {
  id: string
  firstName: string
  lastName: string
  team: string
  role: string
  workMode: string
}

const norm = (s: string) => s.toLowerCase().trim()
const matchKey = (fn: string, ln: string) => `${norm(fn)}|${norm(ln)}`

const router = Router()

// GET /api/people
router.get('/', async (_req: Request, res: Response) => {
  const result = await pool.query<PersonRow>(
    'SELECT id, first_name, last_name, team, role, work_mode FROM people ORDER BY last_name, first_name',
  )
  res.json(result.rows.map(r => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    team: r.team,
    role: r.role,
    workMode: r.work_mode,
  })))
})

// PUT /api/people — sync: insert newcomers, delete people absent from the list
// Match is done by (first_name, last_name) — existing people are left untouched
// Returns { added: number, deleted: string[] } (deleted = removed person IDs)
router.put('/', async (req: Request, res: Response) => {
  const incoming = req.body as PersonBody[]
  if (!Array.isArray(incoming)) {
    res.status(400).json({ error: 'Expected array' })
    return
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const current = await client.query<PersonRow>(
      'SELECT id, first_name, last_name FROM people',
    )

    const currentMap = new Map(
      current.rows.map(r => [matchKey(r.first_name, r.last_name), r.id]),
    )
    const incomingKeys = new Set(incoming.map(p => matchKey(p.firstName, p.lastName)))

    // People in DB but absent from the new file → delete (FK ON DELETE SET NULL frees their seats)
    const toDelete = current.rows
      .filter(r => !incomingKeys.has(matchKey(r.first_name, r.last_name)))
      .map(r => r.id)

    if (toDelete.length > 0) {
      await client.query('DELETE FROM people WHERE id = ANY($1)', [toDelete])
    }

    // People in new file but absent from DB → insert
    const toInsert = incoming.filter(p => !currentMap.has(matchKey(p.firstName, p.lastName)))

    for (const p of toInsert) {
      await client.query(
        'INSERT INTO people (id, first_name, last_name, team, role, work_mode) VALUES ($1, $2, $3, $4, $5, $6)',
        [p.id, p.firstName, p.lastName, p.team, p.role, p.workMode],
      )
    }

    await client.query('COMMIT')
    res.json({ added: toInsert.length, deleted: toDelete })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

// DELETE /api/people/:id
router.delete('/:id', async (req: Request, res: Response) => {
  await pool.query('DELETE FROM people WHERE id = $1', [req.params['id']])
  res.json({ ok: true })
})

// DELETE /api/people — clear all
router.delete('/', async (_req: Request, res: Response) => {
  await pool.query('TRUNCATE TABLE people CASCADE')
  res.json({ ok: true })
})

export default router
