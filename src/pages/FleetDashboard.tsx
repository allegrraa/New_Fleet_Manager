/*
 * pages/FleetDashboard.tsx
 *
 * Per-fleet detail page — reached via /fleet/:fleetId.
 *
 * Responsibilities:
 *   - Show a status summary bar (ready / warning / critical / offline / maintenance counts).
 *   - List all drones currently in the fleet as compact cards with status badges.
 *   - Allow the user to add a new drone manually (inline form).
 *   - Allow the user to delete a drone from the fleet.
 *   - List historical flight sessions for the fleet.
 *   - Allow the user to add a plain session log entry (no drone selection).
 *   - Navigate to SessionSelection (/fleet/:fleetId/session/new) for a full session
 *     creation workflow with drone selection.
 *
 * Data sources:
 *   - Fleet object: read from localStorage (via loadFleets) or from React Router
 *     location.state when the page is navigated to programmatically.
 *   - Drones: filtered from mockRobots by fleet.droneIds, or passed via location.state
 *     for newly created fleets that haven't been persisted to mockData yet.
 *   - Sessions: filtered from mockSessions by fleetId (in-memory only; not persisted).
 */

import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Cpu, Plus, Calendar, FileText, TrendingUp, TrendingDown, ArrowRight, X, Trash2, Wrench } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import type { Fleet, Robot, RobotStatus, MaintenanceSeverity } from '../types';

function mapStatus(raw: string): RobotStatus {
  const s = raw?.trim().toUpperCase()
  if (s === 'WORKING') return 'ready-to-fly'
  if (s === 'HW FAULT' || s === 'SW FAULT') return 'critical'
  if (s === 'FAULTY') return 'warning'
  if (s === 'OOS') return 'critical'
  return 'maintenance-due'
}

function mapSeverity(raw: string): MaintenanceSeverity {
  if (raw === 'origin-country' || raw === 'high') return 'origin-country'
  if (raw === 'office' || raw === 'medium') return 'office'
  return 'on-site'
}

export function FleetDashboard() {
  const { fleetId } = useParams();
  const navigate = useNavigate();
  const [showAddDroneForm, setShowAddDroneForm] = useState(false);
  const [fleet, setFleet] = useState<Fleet | null>(null);
  const [fleetDrones, setFleetDrones] = useState<Robot[]>([]);
  const [fleetSessions, setFleetSessions] = useState<any[]>([]);
  const [newDrone, setNewDrone] = useState({
    id: '', name: '', status: 'ready-to-fly' as RobotStatus, battery: 100, location: '',
  });

  useEffect(() => {
    fetch(`http://localhost:3001/api/fleets/${fleetId}`)
      .then(res => res.json())
      .then(data => setFleet({ ...data, lastModified: new Date(data.lastModified) }))

    fetch(`http://localhost:3001/api/robots/${fleetId}`)
      .then(res => res.json())
      .then(data => setFleetDrones(data.map((r: any) => ({
        id: r.id,
        name: r.name,
        status: mapStatus(r.status),
        battery: 0,
        location: r.location,
        lastSeen: new Date(r.lastChecked),
        currentTask: r.reason || 'N/A',
        version: 'N/A',
        ipAddress: r.ipAddress || '',
        fullVersion: 'N/A',
        sessionCount: 0,
        recentAlerts: [],
        maintenanceHistory: (r.maintenanceNotes ?? []).map((n: any) => ({
          id: n.id,
          robotId: n.robotId,
          robotName: r.name,
          note: n.note,
          status: n.status,
          severity: mapSeverity(n.severity),
          timestamp: new Date(n.timestamp),
          problemCategory: n.problemCategory || undefined,
        })),
        lastLogRetrieval: new Date(r.lastChecked),
        eventHistory: [],
      }))))

    fetch(`http://localhost:3001/api/sessions/${fleetId}`)
      .then(res => res.json())
      .then(data => setFleetSessions(data.map((s: any) => ({
        ...s,
        date: new Date(s.date),
        selectedDroneIds: s.selectedDroneIds ? s.selectedDroneIds.split(',') : [],
      }))))
  }, [fleetId])

  if (!fleet) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-violet-400 mb-2">Loading...</h1>
        </div>
      </div>
    );
  }

  const severityOrder: Record<string, number> = {
    'critical': 0, 'warning': 1, 'offline': 2, 'maintenance-due': 3, 'ready-to-fly': 4
  }
  const sortedDrones = [...fleetDrones].sort((a, b) =>
    (severityOrder[a.status] ?? 5) - (severityOrder[b.status] ?? 5)
  )

  // Guard against division-by-zero when the fleet has no drones.
  const getPercentage = (value: number, total: number) =>
    total === 0 ? 0 : Math.round((value / total) * 100);

  const handleAddDrone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrone.id || !newDrone.name || !newDrone.location) return;

    const drone: Robot = {
      id: newDrone.id,
      name: newDrone.name,
      status: newDrone.status,
      battery: newDrone.battery,
      location: newDrone.location,
      lastSeen: new Date(),
      currentTask: 'Ready',
      version: 'v2.4.1',
      ipAddress: '192.168.1.999',
      fullVersion: 'v2.4.1-build.2847',
      sessionCount: 0,
      recentAlerts: [],
      maintenanceHistory: [],
      lastLogRetrieval: new Date(),
      eventHistory: [],
    };

    setFleetDrones([...fleetDrones, drone]);
    setNewDrone({
      id: '',
      name: '',
      status: 'ready-to-fly',
      battery: 100,
      location: '',
    });
    setShowAddDroneForm(false);
  };

  const handleDeleteSession = (sessionId: string) => {
    setFleetSessions(fleetSessions.filter(s => s.id !== sessionId));
  };

  const handleDeleteDrone = (droneId: string) => {
    setFleetDrones(fleetDrones.filter(d => d.id !== droneId));
  };

  // Aggregate counts used by the status summary bar at the top of the page.
  const statusCounts = {
    total: fleetDrones.length,
    readyToFly: fleetDrones.filter(r => r.status === 'ready-to-fly').length,
    warning: fleetDrones.filter(r => r.status === 'warning').length,
    critical: fleetDrones.filter(r => r.status === 'critical').length,
    offline: fleetDrones.filter(r => r.status === 'offline').length,
    maintenanceDue: fleetDrones.filter(r => r.status === 'maintenance-due').length,
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a12_1px,transparent_1px),linear-gradient(to_bottom,#0a0a12_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl"></div>

      <header className="border-b border-violet-500/10 bg-black/80 backdrop-blur-sm sticky top-0 z-40 relative">
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"></div>
        <div className="px-8 py-4 relative z-10">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="w-8 h-8 rounded border border-violet-500/20 flex items-center justify-center hover:bg-violet-500/10 hover:border-violet-500/40 transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-violet-400" />
            </Link>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center">
              <Cpu className="w-6 h-6 text-violet-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                  {fleet.name}
                </h1>
              </div>
              <p className="text-sm text-neutral-500 font-mono ml-5">Fleet Overview & Flight Logs</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-8 relative z-10">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-violet-400">Fleet Status</span>
              <span className="text-sm text-neutral-600 font-mono">({statusCounts.total} total drones)</span>
            </h2>
            <div className="grid grid-cols-5 gap-4">
              <div className="border border-green-500/20 bg-gradient-to-br from-black/40 to-green-950/10 rounded-lg p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-green-500/50 to-transparent"></div>
                <div className="text-xs text-neutral-600 mb-2 font-mono uppercase tracking-wider">Ready to Fly</div>
                <div className="text-3xl font-bold font-mono text-green-400">{statusCounts.readyToFly}</div>
                <div className="text-xs text-neutral-600 font-mono">{getPercentage(statusCounts.readyToFly, statusCounts.total)}%</div>
              </div>
              <div className="border border-orange-500/20 bg-gradient-to-br from-black/40 to-orange-950/10 rounded-lg p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>
                <div className="text-xs text-neutral-600 mb-2 font-mono uppercase tracking-wider">Warning</div>
                <div className="text-3xl font-bold font-mono text-orange-400">{statusCounts.warning}</div>
                <div className="text-xs text-neutral-600 font-mono">{getPercentage(statusCounts.warning, statusCounts.total)}%</div>
              </div>
              <div className="border border-red-500/20 bg-gradient-to-br from-black/40 to-red-950/10 rounded-lg p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent"></div>
                <div className="text-xs text-neutral-600 mb-2 font-mono uppercase tracking-wider">Critical</div>
                <div className="text-3xl font-bold font-mono text-red-400">{statusCounts.critical}</div>
                <div className="text-xs text-neutral-600 font-mono">{getPercentage(statusCounts.critical, statusCounts.total)}%</div>
              </div>
              <div className="border border-neutral-500/20 bg-gradient-to-br from-black/40 to-neutral-950/10 rounded-lg p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neutral-500/50 to-transparent"></div>
                <div className="text-xs text-neutral-600 mb-2 font-mono uppercase tracking-wider">Offline</div>
                <div className="text-3xl font-bold font-mono text-neutral-400">{statusCounts.offline}</div>
                <div className="text-xs text-neutral-600 font-mono">{getPercentage(statusCounts.offline, statusCounts.total)}%</div>
              </div>
              <div className="border border-purple-500/20 bg-gradient-to-br from-black/40 to-purple-950/10 rounded-lg p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
                <div className="text-xs text-neutral-600 mb-2 font-mono uppercase tracking-wider">Maintenance</div>
                <div className="text-3xl font-bold font-mono text-purple-400">{statusCounts.maintenanceDue}</div>
                <div className="text-xs text-neutral-600 font-mono">{getPercentage(statusCounts.maintenanceDue, statusCounts.total)}%</div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="text-violet-400">All Drones in Fleet</span>
                <span className="text-sm text-neutral-600 font-mono">({fleetDrones.length})</span>
              </h2>
              <button
                onClick={() => setShowAddDroneForm(true)}
                className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded text-sm font-medium transition-all shadow-lg shadow-violet-500/20 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Drone to Fleet
              </button>
            </div>

            {showAddDroneForm && (
              <div className="mb-6 border border-violet-500/30 bg-gradient-to-br from-violet-950/20 to-purple-950/20 backdrop-blur-sm rounded-lg p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-400/50 to-transparent"></div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></span>
                      Add New Drone
                    </h3>
                    <p className="text-sm text-neutral-400">Enter drone details to add to your fleet</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddDroneForm(false);
                      setNewDrone({ id: '', name: '', status: 'ready-to-fly', battery: 100, location: '' });
                    }}
                    className="w-8 h-8 rounded hover:bg-violet-500/10 flex items-center justify-center transition-colors border border-violet-500/20"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleAddDrone} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-violet-300">Drone ID</label>
                      <input
                        type="text"
                        value={newDrone.id}
                        onChange={(e) => setNewDrone({ ...newDrone, id: e.target.value })}
                        placeholder="e.g., RBT-011"
                        className="w-full bg-black/50 border border-violet-500/20 rounded px-4 py-2 focus:outline-none focus:border-violet-500/50 transition-colors font-mono text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-violet-300">Drone Name</label>
                      <input
                        type="text"
                        value={newDrone.name}
                        onChange={(e) => setNewDrone({ ...newDrone, name: e.target.value })}
                        placeholder="e.g., Zeta-01"
                        className="w-full bg-black/50 border border-violet-500/20 rounded px-4 py-2 focus:outline-none focus:border-violet-500/50 transition-colors text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-violet-300">Location</label>
                      <input
                        type="text"
                        value={newDrone.location}
                        onChange={(e) => setNewDrone({ ...newDrone, location: e.target.value })}
                        placeholder="e.g., Zone A-5"
                        className="w-full bg-black/50 border border-violet-500/20 rounded px-4 py-2 focus:outline-none focus:border-violet-500/50 transition-colors text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-violet-300">Status</label>
                      <select
                        value={newDrone.status}
                        onChange={(e) => setNewDrone({ ...newDrone, status: e.target.value as RobotStatus })}
                        className="w-full bg-black/50 border border-violet-500/20 rounded px-4 py-2 focus:outline-none focus:border-violet-500/50 transition-colors text-sm"
                      >
                        <option value="ready-to-fly">Ready to Fly</option>
                        <option value="warning">Warning</option>
                        <option value="critical">Critical</option>
                        <option value="offline">Offline</option>
                        <option value="maintenance-due">Maintenance Due</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-violet-300">Battery Level (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newDrone.battery}
                        onChange={(e) => setNewDrone({ ...newDrone, battery: parseInt(e.target.value) || 0 })}
                        className="w-full bg-black/50 border border-violet-500/20 rounded px-4 py-2 focus:outline-none focus:border-violet-500/50 transition-colors font-mono text-sm"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddDroneForm(false);
                        setNewDrone({ id: '', name: '', status: 'ready-to-fly', battery: 100, location: '' });
                      }}
                      className="px-4 py-2 text-sm hover:bg-violet-500/10 rounded transition-colors border border-violet-500/20"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded text-sm font-medium transition-all shadow-lg shadow-violet-500/20"
                    >
                      Add Drone
                    </button>
                  </div>
                </form>
              </div>
            )}

            {fleetDrones.length > 0 ? (
              <div className="grid grid-cols-6 gap-3">
                {sortedDrones.map(drone => (
                  <div key={drone.id} onClick={() => navigate(`/fleet/${fleetId}/robot/${drone.id}`, { state: { drone, fleet } })} className="group border border-violet-500/20 bg-gradient-to-br from-black/40 to-violet-950/10 rounded-lg p-4 relative cursor-pointer hover:border-violet-500/50 transition-all">
                    <button
                      onClick={() => handleDeleteDrone(drone.id)}
                      className="absolute top-2 right-2 w-6 h-6 rounded flex items-center justify-center text-neutral-700 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className="font-mono text-xs text-neutral-600 mb-1">{drone.id}</div>
                    <div className="font-semibold text-sm text-violet-300 mb-2">{drone.name}</div>
                    <StatusBadge status={drone.status} />
                    {drone.currentTask && drone.currentTask !== 'N/A' && (
                      <div className="mt-2 text-xs text-orange-300/70 font-mono truncate">{drone.currentTask}</div>
                    )}
                    {(() => {
                      const open = drone.maintenanceHistory.filter(n => n.status === 'open' || n.status === 'in-progress').length;
                      return open > 0 ? (
                        <div className="mt-1 flex items-center gap-1 text-xs font-mono text-violet-400/70">
                          <Wrench className="w-3 h-3" />
                          {open} maintenance open
                        </div>
                      ) : null;
                    })()}
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-violet-500/20 bg-gradient-to-br from-black/40 to-violet-950/10 rounded-lg p-12 text-center">
                <Cpu className="w-12 h-12 text-violet-400/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-violet-300 mb-2">No Drones in Fleet Yet</h3>
                <p className="text-sm text-neutral-500 mb-4">This is a new fleet. Add drones to get started with flight operations.</p>
                <button
                  onClick={() => setShowAddDroneForm(true)}
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded text-sm font-medium transition-all shadow-lg shadow-violet-500/20 inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Drone
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-violet-400" />
                <span>Flight Logs</span>
                <span className="text-sm text-neutral-600 font-mono">({fleetSessions.length})</span>
              </h2>
              <button
                onClick={() => navigate(`/fleet/${fleetId}/session/new`, {
                  state: { fleetDrones, fleetName: fleet?.name, fleet }
                })}
                className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded text-sm font-medium transition-all shadow-lg shadow-violet-500/20 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Flight Session
              </button>
            </div>

            {fleetSessions.length > 0 ? (
              <div className="space-y-3">
                {fleetSessions.map(session => {
                const readyPercentage = getPercentage(session.readyToFly, session.totalDrones);
                const sessionIndex = fleetSessions.indexOf(session);
                // The next element in the array is the previous session in time (newest-first order).
                // The trend shows whether the "ready" count improved or worsened vs the prior session.
                const lastSession = fleetSessions[sessionIndex + 1];
                const trend = lastSession ? session.readyToFly - lastSession.readyToFly : 0;

                return (
                  <button
                    key={session.id}
                    onClick={() => navigate(`/fleet/${fleetId}/session/${session.id}`, {
                      state: { session, fleetDrones, fleet }
                    })}
                    className="w-full border border-violet-500/20 hover:border-violet-500/40 bg-gradient-to-r from-black/40 to-violet-950/10 rounded-lg p-5 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                          <div className="font-semibold text-violet-300 text-lg">{session.sessionNumber}</div>
                          <div className="flex items-center gap-2 text-xs text-neutral-600 font-mono">
                            <Calendar className="w-3 h-3" />
                            {formatDate(session.date)}
                            <span className="text-neutral-700">•</span>
                            <span>{session.selectedDroneIds.length} drones selected</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {trend !== 0 && (
                          <div className={`flex items-center gap-1 text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            <span>{Math.abs(trend)}</span>
                          </div>
                        )}
                        <ArrowRight className="w-5 h-5 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }}
                          className="w-7 h-7 rounded flex items-center justify-center text-neutral-600 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-xs mb-3">
                      <div className="bg-black/40 rounded px-3 py-2 border border-green-500/20">
                        <div className="text-neutral-600 mb-1">Ready</div>
                        <div className="text-green-400 font-mono text-sm">{readyPercentage}%</div>
                      </div>
                      <div className="bg-black/40 rounded px-3 py-2 border border-orange-500/20">
                        <div className="text-neutral-600 mb-1">Warning</div>
                        <div className="text-orange-400 font-mono text-sm">{getPercentage(session.warning, session.totalDrones)}%</div>
                      </div>
                      <div className="bg-black/40 rounded px-3 py-2 border border-red-500/20">
                        <div className="text-neutral-600 mb-1">Critical</div>
                        <div className="text-red-400 font-mono text-sm">{getPercentage(session.critical, session.totalDrones)}%</div>
                      </div>
                      <div className="bg-black/40 rounded px-3 py-2 border border-neutral-500/20">
                        <div className="text-neutral-600 mb-1">Offline</div>
                        <div className="text-neutral-400 font-mono text-sm">{getPercentage(session.offline, session.totalDrones)}%</div>
                      </div>
                      <div className="bg-black/40 rounded px-3 py-2 border border-purple-500/20">
                        <div className="text-neutral-600 mb-1">Maint.</div>
                        <div className="text-purple-400 font-mono text-sm">{getPercentage(session.maintenanceDue, session.totalDrones)}%</div>
                      </div>
                    </div>
                    {session.notes && (
                      <div className="text-xs text-neutral-400 italic">{session.notes}</div>
                    )}
                  </button>
                );
              })}
              </div>
            ) : (
              <div className="border border-violet-500/20 bg-gradient-to-br from-black/40 to-violet-950/10 rounded-lg p-12 text-center">
                <Calendar className="w-12 h-12 text-violet-400/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-violet-300 mb-2">No Flight Logs Yet</h3>
                <p className="text-sm text-neutral-500 mb-4">
                  Create a flight session to start logging drone activity.
                </p>
                <button
                  onClick={() => navigate(`/fleet/${fleetId}/session/new`, {
                    state: { fleetDrones, fleetName: fleet?.name, fleet }
                  })}
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded text-sm font-medium transition-all shadow-lg shadow-violet-500/20 inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Flight Session
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}






