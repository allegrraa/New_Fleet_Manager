/*
 * types/index.ts
 *
 * Central TypeScript type definitions shared across the entire application.
 * Keeping all domain types in one file makes it easy to understand the data
 * model at a glance and prevents import cycles.
 *
 * Domain overview:
 *   Fleet      — a named group of drones managed together.
 *   Robot      — a single drone unit with live status, battery, and history.
 *   Alert      — an event/incident raised against a specific drone.
 *   MaintenanceNote — a logged maintenance ticket for a drone.
 *   Session    — a pre-flight check snapshot: which drones were included and
 *                what their statuses were at that moment.
 *   CategoryUsage  — used internally by Events.tsx to promote frequently-used
 *                    custom categories into the permanent dropdown list.
 */

/* ── Status / severity union types ─────────────────────────────────────────── */

// All possible operational states a drone can be in.
export type RobotStatus = 'ready-to-fly' | 'warning' | 'critical' | 'offline' | 'maintenance-due';

// Severity levels for alert events.
export type AlertSeverity = 'info' | 'warning' | 'error' | 'resolved';

// Lifecycle states for a maintenance ticket.
export type MaintenanceStatus = 'open' | 'in-progress' | 'resolved' | 'archived';

// How urgent a maintenance problem is.
export type MaintenanceSeverity = 'on-site' | 'office' | 'origin-country';

/* ── Core domain interfaces ─────────────────────────────────────────────────── */

// Represents one physical drone unit.
export interface Robot{
    id: string;          // Unique identifier, e.g. "RBT-001"
    name: string;        // Human-readable callsign, e.g. "Alpha01"
    status: RobotStatus;
    battery: number;     // Charge level 0–100 (percentage)
    location: string;    // Zone label, e.g. "Zone A-3"
    lastSeen: Date;
    currentTask: string; // Free-text description of what the drone is doing
    version: string;     // Short firmware version string, e.g. "v2.4.1"
    ipAddress: string;
    fullVersion: string; // Full build string, e.g. "v2.4.1-build.2847"
    sessionCount: number;         // Total number of flight sessions completed
    recentAlerts: Alert[];        // Alerts active during the most recent session
    maintenanceHistory: MaintenanceNote[];
    lastLogRetrieval: Date;
    eventHistory: Alert[];        // All historical alert events for this drone
}

// Represents a single alert/event raised against a drone during a session.
export interface Alert{
    id: string;
    robotId: string;    // Foreign key → Robot.id
    robotName: string;  // Denormalised for display without a join
    category: string;   // e.g. "Battery", "Navigation", "Software"
    severity: AlertSeverity;
    description: string;
    timestamp: Date;
    resolved: boolean;
    resolvedAt?: Date;  // Only set when resolved === true
}

// A maintenance ticket logged by an operator for a specific drone.
export interface MaintenanceNote {
    id: string;
    robotId: string;
    robotName: string;
    note: string;
    status: MaintenanceStatus;
    severity?: MaintenanceSeverity; // Optional — not all notes have a severity rating
    timestamp: Date;
    problemCategory?: string;       // Optional free-text category tag
}

// A named group of drones. Fleet membership is defined by droneIds.
export interface Fleet {
  id: string;
  name: string;
  droneIds: string[];  // Array of Robot.id values belonging to this fleet
  lastModified: Date;
}

// A pre-flight check session — a point-in-time snapshot of selected drone statuses.
// The status counts (readyToFly, warning, etc.) are stored directly on the Session
// so historical records remain accurate even if drone statuses change later.
export interface Session {
  id: string;
  sessionNumber: string;          // Human-readable identifier, e.g. "2026-04-10-A"
  date: Date;
  fleetId: string;                // Foreign key → Fleet.id
  selectedDroneIds: string[];     // Subset of fleet drones included in this session
  totalDrones: number;
  readyToFly: number;
  warning: number;
  critical: number;
  offline: number;
  maintenanceDue: number;
  notes: string;
}

// A fix guide entry in the fixes wiki.
export interface Fix {
  id: string;
  title: string;
  category: string;
  description: string;
  symptoms: string[];
  solution: string;
  pdfUrl?: string;
  pdfName?: string;
  createdAt: Date;
}

// Tracks how many times a custom alert category / description has been used,
// so the system can automatically promote it to the permanent dropdown after 10 uses.
export interface CategoryUsage {
  category: string;  // Re-used for both category names and description strings
  count: number;
}

