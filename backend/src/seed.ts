import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  // Create the fleet
  const fleet = await prisma.fleet.create({
    data: {
      name: 'DSTA x HQARMYINT Fleet',
      droneIds: '',
    }
  })
  console.log(`Created fleet: ${fleet.name} (${fleet.id})`)

  // Read CSV
  const csvPath = path.join(__dirname, '../prisma/drones.csv')
  const csv = fs.readFileSync(csvPath, 'utf-8')
  const lines = csv.split(/\r?\n/)

  // First 3 lines are empty/headers — skip them
  const dataLines = lines.slice(3)
  console.log('Total lines:', lines.length)
  console.log('First data line:', JSON.stringify(dataLines[0]))

  const droneIds: string[] = []
  const counts = { ready: 0, reqAttention: 0, oos: 0 }
  const checkedDates: number[] = []

  for (const line of dataLines) {
    const cols = line.split(',')
    const sn = cols[1]?.trim()
    const name = cols[2]?.trim()
    const ipAddress = cols[3]?.trim() || ''
    const status = cols[4]?.trim() || 'UNKNOWN'
    const reason = cols[5]?.trim() || ''
    const dateStr = cols[6]?.trim()
    const location = cols[7]?.trim() || ''
    const ownedBy = cols[8]?.trim() || ''
    const remarks = cols[9]?.trim() || ''

    // Skip empty rows
    if (!name || !sn) continue

    // Parse date (format: DD/MM/YYYY)
    let lastChecked = new Date()
    if (dateStr && dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/')
      const parsed = new Date(`${year}-${month}-${day}`)
      if (!isNaN(parsed.getTime())) lastChecked = parsed
    }
    checkedDates.push(lastChecked.getTime())

    // Track status counts for session snapshot
    const s = status.trim().toUpperCase()
    if (s === 'WORKING') counts.ready++
    else if (s === 'OOS') counts.oos++
    else counts.reqAttention++

    const robot = await prisma.robot.create({
      data: {
        name,
        ipAddress,
        status,
        reason,
        lastChecked,
        location,
        ownedBy,
        remarks,
        fleetId: fleet.id,
      }
    })
    droneIds.push(robot.id)
    console.log(`Added drone: ${name} (${status})`)

    if (reason) {
      await prisma.maintenanceNote.create({
        data: {
          robotId: robot.id,
          note: reason,
          status: 'open',
          severity: status === 'HW FAULT' ? 'high' : status === 'SW FAULT' ? 'medium' : 'low',
          problemCategory: status,
        }
      })
    }
  }

  // Update fleet with all drone IDs
  await prisma.fleet.update({
    where: { id: fleet.id },
    data: { droneIds: droneIds.join(',') }
  })

  const sessionDate = checkedDates.length > 0 ? new Date(Math.max(...checkedDates)) : new Date()
  const sessionNumber = `${sessionDate.toISOString().split('T')[0]}-IMPORT`

  await prisma.session.create({
    data: {
      sessionNumber,
      date: sessionDate,
      fleetId: fleet.id,
      selectedDroneIds: droneIds.join(','),
      totalDrones: droneIds.length,
      ready: counts.ready,
      reqAttention: counts.reqAttention,
      oos: counts.oos,
      notes: `CSV import — ${droneIds.length} drones loaded`,
    }
  })

  console.log(`\nDone! Seeded ${droneIds.length} drones and created session "${sessionNumber}".`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
