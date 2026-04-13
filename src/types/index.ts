export type RobotStatus = 'ready-to-fly' | 'warning' | 'critical' | 'offline' | 'maintenance-due';
export type AlertSeverity = 'info' | 'warning' | 'error' | 'resolved';
export type MaintenanceStatus = 'open' | 'in-progress' | 'resolved' | 'archived';
export type MaintenanceSeverity = 'low' | 'medium' | 'high';

// define data structures and rules for alerts
export interface Robot{
    id: string;
    name: string;
    status: RobotStatus;
    battery: number;
    location: string;
    lastSeen: Date;
    currentTask: string;
    version: string;
    ipAddress: string;
    fullVersion: string;
    sessionCount: number;
    recentAlerts: Alert[];
    maintenanceHistory: MaintenanceNote[];
    lastLogRetrieval: Date;
    eventHistory: Alert[];
}

export interface Alert{
    id: string;
    robotId: string;
    robotName: string;
    category: string;
    severity: AlertSeverity;
    description: string;
    timestamp: Date;
    resolved: boolean;
    resolvedAt?: Date;
}

export interface MaintenanceNote {
    id: string;
    robotId: string;
    robotName: string;
    note: string;
    status: MaintenanceStatus;
    severity?: MaintenanceSeverity;
    timestamp: Date;
    problemCategory?: string;
}

export interface Fleet {
  id: string;
  name: string;
  droneIds: string[];
  lastModified: Date;
}

export interface Session {
  id: string;
  sessionNumber: string;
  date: Date;
  fleetId: string;
  selectedDroneIds: string[];
  totalDrones: number;
  readyToFly: number;
  warning: number;
  critical: number;
  offline: number;
  maintenanceDue: number;
  notes: string;
}

export interface CategoryUsage {
  category: string;
  count: number;
}

