import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const router = Router()

router.get('/:fleetId', async (req, res) => {
  const robots = await prisma.robot.findMany({
    where: { fleetId: req.params.fleetId },
    include: { maintenanceNotes: true }
  })
  res.json(robots)
})

router.post('/', async (req, res) => {
  const robot = await prisma.robot.create({
    data: req.body
  })
  res.json(robot)
})

router.patch('/:id', async (req, res) => {
  const robot = await prisma.robot.update({
    where: { id: req.params.id },
    data: req.body
  })
  res.json(robot)
})
router.get('/single/:id', async (req, res) => {
  const robot = await prisma.robot.findUnique({
    where: { id: req.params.id },
    include: { maintenanceNotes: true }
  })
  res.json(robot)
})

export default router
