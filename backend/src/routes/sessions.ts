import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const router = Router()

router.get('/:fleetId', async (req, res) => {
  const sessions = await prisma.session.findMany({
    where: { fleetId: req.params.fleetId },
    orderBy: { date: 'desc' },
  })
  res.json(sessions)
})

router.post('/', async (req, res) => {
  const session = await prisma.session.create({
    data: {
      sessionNumber: req.body.sessionNumber,
      date: new Date(req.body.date),
      fleetId: req.body.fleetId,
      selectedDroneIds: req.body.selectedDroneIds ?? '',
      totalDrones: req.body.totalDrones ?? 0,
      ready: req.body.ready ?? 0,
      reqAttention: req.body.reqAttention ?? 0,
      oos: req.body.oos ?? 0,
      notes: req.body.notes ?? '',
    }
  })
  res.json(session)
})

router.patch('/:id', async (req, res) => {
  const session = await prisma.session.update({
    where: { id: req.params.id },
    data: { sessionNumber: req.body.sessionNumber },
  })
  res.json(session)
})

export default router
