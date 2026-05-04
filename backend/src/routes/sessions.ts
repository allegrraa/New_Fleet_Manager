import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()    // connects to the database
const router = Router()              // creates a mini-server for session routes

// when React asks "give me all sessions for fleet X"
router.get('/:fleetId', async (req, res) => {
  const sessions = await prisma.session.findMany({
    where: { fleetId: req.params.fleetId }  // only return sessions for that fleet
  })
  res.json(sessions)  // send them back as JSON
})
router.post('/', async (req, res) => {
  const session = await prisma.session.create({
    data: {
      sessionNumber: req.body.sessionNumber,
      date: new Date(req.body.date),
      fleetId: req.body.fleetId,
      selectedDroneIds: req.body.selectedDroneIds ?? '',
      totalDrones: req.body.totalDrones,
      readyToFly: req.body.readyToFly,
      warning: req.body.warning,
      critical: req.body.critical,
      offline: req.body.offline,
      maintenanceDue: req.body.maintenanceDue,
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
