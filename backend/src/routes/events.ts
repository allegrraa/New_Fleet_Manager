import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const router = Router()

router.post('/by-robots', async (req, res) => {
  const { robotIds } = req.body as { robotIds: string[] }
  const events = await prisma.event.findMany({
    where: { robotId: { in: robotIds } },
    orderBy: { timestamp: 'desc' },
  })
  res.json(events)
})

router.post('/', async (req, res) => {
  const event = await prisma.event.create({
    data: {
      robotId: req.body.robotId,
      category: req.body.category,
      severity: req.body.severity,
      description: req.body.description,
      resolved: req.body.resolved ?? false,
      sessionId: req.body.sessionId ?? '',
    },
  })
  res.json(event)
})

router.patch('/:id', async (req, res) => {
  const data: Record<string, unknown> = {}
  if (req.body.category !== undefined) data.category = req.body.category
  if (req.body.severity !== undefined) data.severity = req.body.severity
  if (req.body.description !== undefined) data.description = req.body.description
  if (req.body.resolved !== undefined) data.resolved = req.body.resolved

  const event = await prisma.event.update({
    where: { id: req.params.id },
    data,
  })
  res.json(event)
})

router.delete('/:id', async (req, res) => {
  await prisma.event.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
