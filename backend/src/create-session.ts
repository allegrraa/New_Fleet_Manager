import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function categorize(status: string): 'readyToFly' | 'warning' | 'critical' | 'maintenanceDue' {
  const s = status?.trim().toUpperCase()
  if (s === 'WORKING') return 'readyToFly'
  if (s === 'HW FAULT' || s === 'SW FAULT' || s === 'OOS') return 'critical'
  if (s === 'FAULTY') return 'warning'
  return 'maintenanceDue'
}

async function main() {
  const fleets = await prisma.fleet.findMany()
  if (fleets.length === 0) {
    console.log('No fleets found. Run seed first.')
    return
  }

  for (const fleet of fleets) {
    const robots = await prisma.robot.findMany({ where: { fleetId: fleet.id } })
    if (robots.length === 0) {
      console.log(`Fleet "${fleet.name}" has no drones — skipping`)
      continue
    }

    // Use the most recent lastChecked date across all drones as the session date
    const dates = robots.map(r => new Date(r.lastChecked)).filter(d => !isNaN(d.getTime()))
    const sessionDate = dates.length > 0
      ? new Date(Math.max(...dates.map(d => d.getTime())))
      : new Date('2026-04-16')

    const counts = { readyToFly: 0, warning: 0, critical: 0, offline: 0, maintenanceDue: 0 }
    for (const r of robots) {
      const cat = categorize(r.status)
      counts[cat]++
    }

    const dateStr = sessionDate.toISOString().split('T')[0]
    const sessionNumber = `${dateStr}-IMPORT`

    const session = await prisma.session.create({
      data: {
        sessionNumber,
        date: sessionDate,
        fleetId: fleet.id,
        selectedDroneIds: robots.map(r => r.id).join(','),
        totalDrones: robots.length,
        readyToFly: counts.readyToFly,
        warning: counts.warning,
        critical: counts.critical,
        offline: counts.offline,
        maintenanceDue: counts.maintenanceDue,
        notes: `CSV import — ${robots.length} drones loaded`,
      }
    })

    console.log(`Created session "${session.sessionNumber}" for fleet "${fleet.name}" (${robots.length} drones)`)
    console.log(`  Ready: ${counts.readyToFly}  Warning: ${counts.warning}  Critical: ${counts.critical}  Maint: ${counts.maintenanceDue}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
