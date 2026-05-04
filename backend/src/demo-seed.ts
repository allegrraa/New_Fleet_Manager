import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {

  // ── Create the Demo Fleet ────────────────────────────────────────────────
  const fleet = await prisma.fleet.create({
    data: { name: 'Demo Fleet', droneIds: '' }
  })
  console.log(`Created fleet: ${fleet.name}`)

  // ── Create 8 drones with a mix of statuses ───────────────────────────────
  const droneData = [
    { name: 'ALPHA-01', ipAddress: '192.168.1.101', status: 'WORKING',  reason: '',                         location: 'Zone A', ownedBy: 'Unit 1', remarks: '' },
    { name: 'ALPHA-02', ipAddress: '192.168.1.102', status: 'WORKING',  reason: '',                         location: 'Zone A', ownedBy: 'Unit 1', remarks: '' },
    { name: 'BRAVO-01', ipAddress: '192.168.1.103', status: 'WORKING',  reason: '',                         location: 'Zone B', ownedBy: 'Unit 2', remarks: '' },
    { name: 'BRAVO-02', ipAddress: '192.168.1.104', status: 'HW FAULT', reason: 'Propeller blade cracked',  location: 'Zone B', ownedBy: 'Unit 2', remarks: 'Sent for repair' },
    { name: 'COBRA-01', ipAddress: '192.168.1.105', status: 'HW FAULT', reason: 'Motor overheating',        location: 'Zone C', ownedBy: 'Unit 3', remarks: '' },
    { name: 'COBRA-02', ipAddress: '192.168.1.106', status: 'SW FAULT', reason: 'GPS module not responding', location: 'Zone C', ownedBy: 'Unit 3', remarks: 'Pending software patch' },
    { name: 'DELTA-01', ipAddress: '192.168.1.107', status: 'WORKING',  reason: '',                         location: 'Zone D', ownedBy: 'Unit 4', remarks: '' },
    { name: 'DELTA-02', ipAddress: '192.168.1.108', status: 'OOS',      reason: 'Sent back to origin country for overhaul', location: 'Zone D', ownedBy: 'Unit 4', remarks: 'ETA 3 weeks' },
  ]

  const sessionDate = new Date('2026-04-14T08:30:00')
  const drones = []

  for (const d of droneData) {
    const robot = await prisma.robot.create({
      data: { ...d, lastChecked: sessionDate, fleetId: fleet.id }
    })
    drones.push(robot)
    console.log(`  Created drone: ${robot.name} (${robot.status})`)
  }

  // Update fleet with all drone IDs
  const allDroneIds = drones.map(d => d.id)
  await prisma.fleet.update({
    where: { id: fleet.id },
    data: { droneIds: allDroneIds.join(',') }
  })

  // ── Create maintenance notes for faulty drones ───────────────────────────
  const bravo02 = drones.find(d => d.name === 'BRAVO-02')!
  const cobra01 = drones.find(d => d.name === 'COBRA-01')!
  const cobra02 = drones.find(d => d.name === 'COBRA-02')!
  const delta02 = drones.find(d => d.name === 'DELTA-02')!

  await prisma.maintenanceNote.createMany({
    data: [
      {
        robotId: bravo02.id,
        note: 'Propeller blade cracked on right arm. Needs replacement before next flight.',
        status: 'in-progress',
        severity: 'on-site',
        problemCategory: 'Hardware',
      },
      {
        robotId: cobra01.id,
        note: 'Motor overheating after 10 mins of flight. Likely dust ingestion. Cleaning and inspection required.',
        status: 'open',
        severity: 'office',
        problemCategory: 'Hardware',
      },
      {
        robotId: cobra02.id,
        note: 'GPS module not responding after firmware update v2.4.1. Needs rollback or patch.',
        status: 'open',
        severity: 'office',
        problemCategory: 'Software',
      },
      {
        robotId: delta02.id,
        note: 'Full structural overhaul required. Sent back to manufacturer.',
        status: 'in-progress',
        severity: 'origin-country',
        problemCategory: 'Hardware',
      },
    ]
  })
  console.log('  Created maintenance notes')

  // ── Create Session 1 — full fleet check on 14 Apr ────────────────────────
  // Selects all 8 drones (the full pre-flight check)
  const session1 = await prisma.session.create({
    data: {
      sessionNumber: '2026-04-14-A',
      date: new Date('2026-04-14T08:30:00'),
      fleetId: fleet.id,
      selectedDroneIds: allDroneIds.join(','),
      totalDrones: 8,
      ready: 4,
      reqAttention: 3,
      oos: 1,
      notes: 'Full pre-flight check. BRAVO-02 and COBRA-01 flagged before takeoff.',
    }
  })
  console.log(`  Created session: ${session1.sessionNumber}`)

  // ── Create Session 2 — smaller flight with only 4 drones ────────────────
  // Only the working drones fly — ALPHA-01, ALPHA-02, BRAVO-01, DELTA-01
  const flyingDrones = drones.filter(d => ['ALPHA-01', 'ALPHA-02', 'BRAVO-01', 'DELTA-01'].includes(d.name))
  const flyingIds = flyingDrones.map(d => d.id)

  const session2 = await prisma.session.create({
    data: {
      sessionNumber: '2026-04-14-B',
      date: new Date('2026-04-14T14:00:00'),
      fleetId: fleet.id,
      selectedDroneIds: flyingIds.join(','),
      totalDrones: 4,
      ready: 4,
      reqAttention: 0,
      oos: 0,
      notes: 'Afternoon sortie. Only ready drones deployed. COBRA-02 stood down after GPS fault confirmed.',
    }
  })
  console.log(`  Created session: ${session2.sessionNumber}`)

  // ── Create events for Session 2 (things that happened during the flight) ──
  const alpha01 = drones.find(d => d.name === 'ALPHA-01')!
  const alpha02 = drones.find(d => d.name === 'ALPHA-02')!
  const bravo01 = drones.find(d => d.name === 'BRAVO-01')!
  const delta01 = drones.find(d => d.name === 'DELTA-01')!

  await prisma.event.createMany({
    data: [
      {
        robotId: alpha01.id,
        category: 'Battery',
        severity: 'warning',
        description: 'Low Battery Warning',
        resolved: true,
        sessionId: session2.id,
        timestamp: new Date('2026-04-14T15:10:00'),
      },
      {
        robotId: alpha02.id,
        category: 'Navigation',
        severity: 'warning',
        description: 'Flight Path Deviation',
        resolved: true,
        sessionId: session2.id,
        timestamp: new Date('2026-04-14T15:22:00'),
      },
      {
        robotId: bravo01.id,
        category: 'Communication',
        severity: 'error',
        description: 'Communication Failure',
        resolved: false,
        sessionId: session2.id,
        timestamp: new Date('2026-04-14T15:45:00'),
      },
      {
        robotId: delta01.id,
        category: 'Navigation',
        severity: 'info',
        description: 'GPS loss',
        resolved: false,
        sessionId: session2.id,
        timestamp: new Date('2026-04-14T16:05:00'),
      },
      {
        robotId: alpha01.id,
        category: 'Performance',
        severity: 'info',
        description: 'Premature Return',
        resolved: true,
        sessionId: session2.id,
        timestamp: new Date('2026-04-14T16:20:00'),
      },
    ]
  })
  console.log('  Created events')

  console.log(`
Done! Demo data seeded:
  Fleet:    Demo Fleet
  Drones:   8 (4 ready, 3 req attention, 1 OOS)
  Sessions: 2 (2026-04-14-A full check, 2026-04-14-B afternoon sortie with 4 drones)
  Events:   5 (across the afternoon session)
  Maintenance notes: 4
  `)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
