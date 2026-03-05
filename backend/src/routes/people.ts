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

// POST /api/people/bulk — insert array of people (skip duplicates)
router.post('/bulk', async (req: Request, res: Response) => {
  const people = req.body as PersonBody[]
  if (!Array.isArray(people) || people.length === 0) {
    res.status(400).json({ error: 'Expected non-empty array' })
    return
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const p of people) {
      await client.query(
        `INSERT INTO people (id, first_name, last_name, team, role, work_mode)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.firstName, p.lastName, p.team, p.role, p.workMode],
      )
    }
    await client.query('COMMIT')
    res.status(201).json({ count: people.length })
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
