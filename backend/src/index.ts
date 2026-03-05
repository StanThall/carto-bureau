import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { pool, initDb } from './db'
import plansRouter from './routes/plans'
import peopleRouter from './routes/people'

const app = express()
const PORT = process.env['PORT'] ?? 3000

app.use(cors())
app.use(express.json())

// Serve images directly from the DB
app.get('/api/images/:id', async (req: Request, res: Response) => {
  const result = await pool.query('SELECT data, mime_type FROM images WHERE id = $1', [req.params['id']])
  const row = result.rows[0]
  if (!row) { res.status(404).end(); return }
  res.setHeader('Content-Type', row.mime_type)
  res.send(row.data)
})

app.use('/api/plans', plansRouter)
app.use('/api/people', peopleRouter)

// Global error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Backend listening on :${PORT}`))
  })
  .catch(err => {
    console.error('Failed to initialize database', err)
    process.exit(1)
  })
