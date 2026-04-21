/*
 * data/mockData.ts
 *
 * Static mock data used throughout the application in place of a real backend.
 * All data is hard-coded — nothing here is persisted between page reloads
 * (fleet list is the exception: it is persisted to localStorage by FleetSelection.tsx).
 *
 * Exported constants:
 *   mockFleets           — two pre-built fleets (one with drones, one empty)
 *   mockRobots           — five drone objects covering every possible RobotStatus
 *   mockAlerts           — four alert events across different drones and categories
 *   mockMaintenanceNotes — three maintenance tickets at various lifecycle stages
 *   alertCategories      — master list of alert category names for dropdowns
 *   commonProblemDescriptions — preset problem descriptions for the add-event form
 *   mockSessions         — two historical flight sessions for fleet "1"
 *
 * When adding new drones for testing, give them an id starting with "RBT-"
 * to stay consistent with the existing naming convention.
 */

import type { Robot, Alert, MaintenanceNote, Fleet, Session } from '../types';

// Two sample fleets. Only fleet "1" has drones and sessions; fleet "2" is intentionally
// empty so the UI's "no drones" empty-state can be tested.
export const mockFleets: Fleet[] = [
  {
    id: '1',
    name: 'Warehouse Alpha Fleet',
    // References drone ids RBT-001 through RBT-010; only RBT-001..005 exist in mockRobots.
    droneIds: ['RBT-001', 'RBT-002', 'RBT-003', 'RBT-004', 'RBT-005', 'RBT-006', 'RBT-007', 'RBT-008', 'RBT-009', 'RBT-010'],
    lastModified: new Date('2026-04-08T10:30:00'),
  },
  {
    id: '2',
    name: 'Distribution Center Fleet',
    droneIds: [],  // Empty fleet — demonstrates the "add your first drone" empty state
    lastModified: new Date('2026-04-07T16:45:00'),
  },
];

// Five drones, each demonstrating a different RobotStatus value so every status
// badge and filter can be exercised without needing real hardware.
export const mockRobots: Robot[] = [
  {
    id: 'RBT-001',
    name: 'Alpha01',
    status: 'critical',
    battery: 25,
    location: 'Zone A-3',
    lastSeen: new Date('2026-04-08T11:45:00'),
    currentTask: 'Idle - Battery Critical',
    version: 'v2.4.1',
    ipAddress: '192.168.1.101',
    fullVersion: 'v2.4.1-build.2847',
    sessionCount: 1247,
    recentAlerts: [
        {  id: "ALT-101",
            robotId: "RBT-001",
            robotName: "Alpha01",
            category: "Battery",
            severity: "error",
            description: "Battery critically low",
            timestamp: new Date(),
            resolved: false

        }
    ],
    maintenanceHistory: [],
    lastLogRetrieval: new Date('2026-04-08T11:30:00'),
    eventHistory: [
        {   id: "ALT-102",
            robotId: "RBT-001",
            robotName: "Alpha01",
            category: "Navigation",
            severity: "warning",
            description: "GPS signal lost",
            timestamp: new Date(),
            resolved: false
        }
    ],
  }, 
  {
    id: 'RBT-002',
    name: 'Beta02',
    status: 'warning',
    battery: 60,
    location: 'Zone B-1',
    lastSeen: new Date('2026-04-08T12:00:00'),
    currentTask: 'Navigating to charging station',
    version: 'v2.4.1',
    ipAddress: '192.168.1.102',
    fullVersion: 'v2.4.1-build.2847',
    sessionCount: 987,
    recentAlerts: [],
    maintenanceHistory: [],
    lastLogRetrieval: new Date('2026-04-08T11:30:00'),
    eventHistory: [],
  },
  {
    id: 'RBT-003',
    name: 'COBRA03',
    status: 'ready-to-fly', 
    battery: 95,
    location: 'Zone C-2',
    lastSeen: new Date('2026-04-08T12:15:00'),
    currentTask: 'Performing routine patrol',
    version: 'v2.4.1',
    ipAddress: '192.168.1.103',
    fullVersion: 'v2.4.1-build.2847',
    sessionCount: 1562,
    recentAlerts: [],
    maintenanceHistory: [],
    lastLogRetrieval: new Date('2026-04-08T11:30:00'),
    eventHistory: [],
  },
  {
    id: 'RBT-004',
    name: 'LYNX04',
    status: 'offline',
    battery: 0,
    location: 'Zone D-4',
    lastSeen: new Date('2026-04-08T10:00:00'),
    currentTask: 'Offline - Power Failure',
    version: 'v2.4.1',
    ipAddress: '192.168.1.104',
    fullVersion: 'v2.4.1-build.2847',
    sessionCount: 0,
    recentAlerts: [],
    maintenanceHistory: [],
    lastLogRetrieval: new Date('2026-04-08T11:30:00'),
    eventHistory: [],

  },
  {
    id: 'RBT-005',
    name: 'Delta05',
    status: 'maintenance-due',  
    battery: 40,
    location: 'Zone E-5',
    lastSeen: new Date('2026-04-08T12:30:00'),
    currentTask: 'Idle - Maintenance Due',
    version: 'v2.4.1',
    ipAddress: '192.168.1.105',
    fullVersion: 'v2.4.1-build.2847',
    sessionCount: 432,
    recentAlerts: [],
    maintenanceHistory: [],
    lastLogRetrieval: new Date('2026-04-08T11:30:00'),
    eventHistory: [],
  },
];

// Pre-seeded alert events used by the Events tab and the active-alerts banner
// in the Overview tab. Each alert maps to a drone via robotId.
export const mockAlerts: Alert[]=[
    { 
    id: "ALT-101",
    robotId: "RBT-001",
    robotName: "Alpha01",
    category: 'Battery',
    severity: 'error',
    description: "Battery critically low - immediate action required",
    timestamp: new Date('2026-04-08T11:45:00'),
    resolved: false


},
{
    id: "ALT-102",
    robotId: "RBT-002",
    robotName: "Beta02",
    category: 'Navigation',
    severity: 'warning',
    description: "GPS signal lost",
    timestamp: new Date('2026-04-08T12:00:00'),
    resolved: false
},
{
    id: "ALT-103",
    robotId: "RBT-003",
    robotName: "COBRA03",
    category: 'Software',
    severity: 'warning',
    description: 'Outdated software version detected',
    timestamp: new Date('2026-04-08T12:15:00'),
    resolved: false
},
{
    id: "ALT-104",
    robotId: "RBT-004",
    robotName: "LYNX04",
    category: 'Maintenance',
    severity: 'warning',
    description: 'Broken propeller detected',
    timestamp: new Date('2026-04-08T10:00:00'),
    resolved: false
}
];

// Sample maintenance tickets illustrating the three main lifecycle stages
// (open → in-progress → resolved). Used by the drone detail view.
export const mockMaintenanceNotes: MaintenanceNote[] = [
    {
        id: 'MNT-001',
        robotId: 'RBT-001',
        robotName: 'Alpha01',
        note: 'Navigation sensor calibration required. Scheduled for tomorrow',
        status: 'open',
        timestamp: new Date('2026-04-08T11:00:00')
    },
    {
        id: 'MNT-002',
        robotId: 'RBT-002',
        robotName: 'Beta02',
        note: 'Battery replacement completed. Testing in progress.',
        status: 'in-progress',
        severity: 'medium',
        timestamp: new Date('2026-04-08T12:30:00')
    },
    {
        id: 'MNT-003',
        robotId: 'RBT-003',
        robotName: 'COBRA03',
        note: 'Software update required.',
        status: 'open',
        timestamp: new Date('2026-04-08T11:30:00')
    }
];
// Master list of alert category names populated into the "Add Event" dropdown.
// A custom category typed by the user gets auto-promoted into this list after
// being used 10 times (see trackCategoryUsage in Events.tsx).
export const alertCategories = [
    'Battery',
    'Navigation',
    'Software',
    'Maintenance',
    'Hardware',
    'Communication',
    'Sensor',
    'Performance',
    'Security',
];

// Pre-set problem description options for the "Add Event" form.
// Like alertCategories, custom descriptions are promoted here after 10 uses.
export const commonProblemDescriptions = [
    'Premature Return',
    'GPS loss',
    'Low Battery Warning',
    'Propeller Damage',
    'Sensor Malfunction',
    'Software Crash',
    'Communication Failure',
    'Motor Malfunction',   
    'Flight Path Deviation',
];
// Two historical flight sessions for fleet "1". The status counts (readyToFly,
// warning, etc.) are snapshots captured at session creation time and do not
// change as drone statuses evolve afterwards.
export const mockSessions: Session[] = [
    {
        id: 'S001',
        sessionNumber: '2026-04-10-A',
        date: new Date('2026-04-10T09:00:00'),
        fleetId: '1',
        selectedDroneIds: ['RBT-001', 'RBT-002', 'RBT-003', 'RBT-004', 'RBT-006', 'RBT-007'],
        totalDrones: 6,
        readyToFly: 4,
        warning: 1,
        critical: 1,
        offline: 0,
        maintenanceDue: 0,
        notes: 'Standard flight check with 6 drones.'
    },
    {
        id: 'S002',
        sessionNumber: '2026-04-11-B',
        date: new Date('2026-04-11T09:00:00'),
        fleetId: '1',
        selectedDroneIds: ['RBT-002', 'RBT-003', 'RBT-004', 'RBT-005', 'RBT-006', 'RBT-007', 'RBT-008', 'RBT-009', 'RBT-010'],
        totalDrones: 9,
        readyToFly: 6,
        warning: 2,
        critical: 1,
        offline: 0,
        maintenanceDue: 0,
        notes: 'Standard flight check with 9 drones.'
    },
];

