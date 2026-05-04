import {Router} from 'express';
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const router = Router()

router.get('/', async (_req, res) => {
  const fleets = await prisma.fleet.findMany()
  res.json(fleets)
})

router.post('/', async (req, res) => {
  const fleet = await prisma.fleet.create({
    data: {
      name: req.body.name,
      droneIds: req.body.droneIds ?? '',
    }
  })
  res.json(fleet)
})

router.delete('/:id', async (req, res) => {
    await prisma.fleet.delete({
        where:{id:req.params.id}
    })
  res.json({ ok: true })
})

router.patch('/:id', async (req, res) => {
  const fleet = await prisma.fleet.update({
    where: { id: req.params.id },
    data: { name: req.body.name },
  })
  res.json(fleet)
})

router.get('/:id', async (req, res) => {
  const fleet = await prisma.fleet.findUnique({
    where: { id: req.params.id }
  })
  res.json(fleet)
})

export default router