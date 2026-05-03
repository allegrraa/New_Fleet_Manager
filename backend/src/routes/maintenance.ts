import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const router = Router()

// Fetch notes for a list of robot IDs (used by the session maintenance panel)
router.post('/by-robots', async (req, res) => {
  const { robotIds } = req.body as { robotIds: string[] }
  const notes = await prisma.maintenanceNote.findMany({
    where: { robotId: { in: robotIds } },
    orderBy: { timestamp: 'desc' },
  })
  res.json(notes)
})

router.post('/', async (req, res) => {
  const note = await prisma.maintenanceNote.create({
    data: {
      robotId: req.body.robotId,
      note: req.body.note,
      status: req.body.status,
      severity: req.body.severity ?? 'on-site',
      problemCategory: req.body.problemCategory ?? '',
    },
  })
  res.json(note)
})

router.patch('/:id', async (req, res) => {
  const data: Record<string, unknown> = {}
  if (req.body.note !== undefined) data.note = req.body.note
  if (req.body.status !== undefined) data.status = req.body.status
  if (req.body.severity !== undefined) data.severity = req.body.severity
  if (req.body.problemCategory !== undefined) data.problemCategory = req.body.problemCategory

  const note = await prisma.maintenanceNote.update({
    where: { id: req.params.id },
    data,
  })
  res.json(note)
})

router.delete('/:id', async (req, res) => {
  await prisma.maintenanceNote.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
