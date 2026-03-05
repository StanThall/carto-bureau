import { Router, Request, Response } from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { pool } from '../db'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

// GET /api/plans — assemble plans with their seats and notes
router.get('/', async (_req: Request, res: Response) => {
  const [plansRes, seatsRes, notesRes] = await Promise.all([
    pool.query('SELECT id, name, image_id FROM plans ORDER BY name'),
    pool.query('SELECT id, plan_id, x, y, person_id, label FROM seats'),
    pool.query('SELECT id, plan_id, x, y, content FROM notes'),
  ])

  const plans = plansRes.rows.map(p => ({
    id: p.id,
    name: p.name,
    imageId: p.image_id,
    seats: seatsRes.rows
      .filter(s => s.plan_id === p.id)
      .map(s => ({ id: s.id, x: s.x, y: s.y, personId: s.person_id ?? null, ...(s.label != null ? { label: s.label } : {}) })),
    notes: notesRes.rows
      .filter(n => n.plan_id === p.id)
      .map(n => ({ id: n.id, x: n.x, y: n.y, content: n.content })),
  }))

  res.json(plans)
})

// POST /api/plans — multipart: name (field) + image (file)
router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  const { name } = req.body as { name: string }
  const file = req.file
  if (!name || !file) {
    res.status(400).json({ error: 'name and image are required' })
    return
  }

  const imageId = uuidv4()
  const planId = uuidv4()

  await pool.query(
    'INSERT INTO images (id, data, mime_type) VALUES ($1, $2, $3)',
    [imageId, file.buffer, file.mimetype],
  )
  await pool.query(
    'INSERT INTO plans (id, name, image_id) VALUES ($1, $2, $3)',
    [planId, name, imageId],
  )

  res.status(201).json({ id: planId, name, imageId, seats: [], notes: [] })
})

// PUT /api/plans/:id — rename
router.put('/:id', async (req: Request, res: Response) => {
  const { name } = req.body as { name: string }
  await pool.query('UPDATE plans SET name = $1 WHERE id = $2', [name, req.params['id']])
  res.json({ ok: true })
})

// DELETE /api/plans/:id — cascade deletes seats/notes via FK, then deletes image
router.delete('/:id', async (req: Request, res: Response) => {
  const planRes = await pool.query('SELECT image_id FROM plans WHERE id = $1', [req.params['id']])
  const imageId = planRes.rows[0]?.image_id
  await pool.query('DELETE FROM plans WHERE id = $1', [req.params['id']])
  if (imageId) {
    await pool.query('DELETE FROM images WHERE id = $1', [imageId])
  }
  res.json({ ok: true })
})

// ---------------------------------------------------------------------------
// Seats
// ---------------------------------------------------------------------------

// POST /api/plans/:planId/seats
router.post('/:planId/seats', async (req: Request, res: Response) => {
  const { id, x, y } = req.body as { id: string; x: number; y: number }
  await pool.query(
    'INSERT INTO seats (id, plan_id, x, y, person_id) VALUES ($1, $2, $3, $4, NULL)',
    [id, req.params['planId'], x, y],
  )
  res.status(201).json({ id, x, y, personId: null })
})

// DELETE /api/plans/:planId/seats/:seatId
router.delete('/:planId/seats/:seatId', async (req: Request, res: Response) => {
  await pool.query('DELETE FROM seats WHERE id = $1 AND plan_id = $2', [
    req.params['seatId'],
    req.params['planId'],
  ])
  res.json({ ok: true })
})

// PUT /api/plans/:planId/seats/move — swap two seats atomically
router.put('/:planId/seats/move', async (req: Request, res: Response) => {
  const { fromSeatId, toSeatId } = req.body as { fromSeatId: string; toSeatId: string }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(
      'SELECT id, person_id FROM seats WHERE id = ANY($1) AND plan_id = $2',
      [[fromSeatId, toSeatId], req.params['planId']],
    )
    const from = result.rows.find(r => r.id === fromSeatId)
    const to = result.rows.find(r => r.id === toSeatId)
    if (!from || !to) { await client.query('ROLLBACK'); res.status(404).json({ error: 'seat not found' }); return }

    await client.query('UPDATE seats SET person_id = $1 WHERE id = $2', [to.person_id, fromSeatId])
    await client.query('UPDATE seats SET person_id = $1 WHERE id = $2', [from.person_id, toSeatId])
    await client.query('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

// PUT /api/plans/:planId/seats/:seatId — assign or unassign a person
router.put('/:planId/seats/:seatId', async (req: Request, res: Response) => {
  const { personId } = req.body as { personId: string | null }
  const planId = req.params['planId']
  const seatId = req.params['seatId']

  if (personId) {
    // Unassign from any other seat on this plan first
    await pool.query(
      'UPDATE seats SET person_id = NULL WHERE plan_id = $1 AND person_id = $2',
      [planId, personId],
    )
  }
  await pool.query('UPDATE seats SET person_id = $1 WHERE id = $2 AND plan_id = $3', [
    personId ?? null,
    seatId,
    planId,
  ])
  res.json({ ok: true })
})

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

// POST /api/plans/:planId/notes
router.post('/:planId/notes', async (req: Request, res: Response) => {
  const { id, x, y } = req.body as { id: string; x: number; y: number }
  await pool.query(
    'INSERT INTO notes (id, plan_id, x, y, content) VALUES ($1, $2, $3, $4, $5)',
    [id, req.params['planId'], x, y, ''],
  )
  res.status(201).json({ id, x, y, content: '' })
})

// PUT /api/plans/:planId/notes/:noteId — update content and/or position
router.put('/:planId/notes/:noteId', async (req: Request, res: Response) => {
  const { content, x, y } = req.body as { content?: string; x?: number; y?: number }
  const noteId = req.params['noteId']
  const planId = req.params['planId']

  if (content !== undefined) {
    await pool.query('UPDATE notes SET content = $1 WHERE id = $2 AND plan_id = $3', [content, noteId, planId])
  }
  if (x !== undefined && y !== undefined) {
    await pool.query('UPDATE notes SET x = $1, y = $2 WHERE id = $3 AND plan_id = $4', [x, y, noteId, planId])
  }
  res.json({ ok: true })
})

// DELETE /api/plans/:planId/notes/:noteId
router.delete('/:planId/notes/:noteId', async (req: Request, res: Response) => {
  await pool.query('DELETE FROM notes WHERE id = $1 AND plan_id = $2', [
    req.params['noteId'],
    req.params['planId'],
  ])
  res.json({ ok: true })
})

export default router
