/*
 * pages/SessionSelection.tsx
 *
 * Reached via /fleet/:fleetId/session/new.
 *
 * This page serves two purposes:
 *   1. Create a new flight session — the user names the session and picks which
 *      drones to include. On submit, a Session object is created with a status
 *      snapshot of the selected drones, then the user is immediately redirected
 *      to the Dashboard for that new session.
 *   2. Browse and re-open recent sessions — a list of existing sessions for the
 *      fleet is shown below the create form. Clicking one navigates to its Dashboard.
 *
 * The fleet and its drones are received via React Router location.state when
 * navigating from FleetDashboard. This avoids re-fetching and preserves any
 * in-memory drones that were added manually but not yet in mockData.
 */

import { useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Plus, Calendar, FileText, TrendingUp, TrendingDown, ArrowRight, CheckCircle2, Circle, ArrowLeft, Cpu } from 'lucide-react';
import { mockSessions, mockRobots, mockFleets } from '../data/mockData';
import type { Session, Robot } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export function SessionSelection() {
    const {fleetId} = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    // Prefer the fleet from navigation state (passed by FleetDashboard) so manually added
    // drones are available; fall back to mockFleets for direct URL access.
    const fleet = location.state?.fleet || mockFleets.find(f => f.id === fleetId);
    const [sessions, setSessions] = useState<Session[]>(mockSessions.filter(s => s.fleetId === fleetId));
    const [showCreateForm, setShowCreateForm] = useState(false);
    const[newSession, setNewSession]= useState({
        sessionNumber: '',
        notes: '',
        selectedDroneIds: [] as string[],
    })
    if (!fleet) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Fleet not found</div>;
    }

    // Use drones from navigation state if available (for newly created fleets that only
    // exist in memory), otherwise fall back to filtering the global mockRobots list.
    const fleetDrones: Robot[] = location.state?.fleetDrones || mockRobots.filter(r => fleet.droneIds.includes(r.id));
    // Derives the live subset of drones the user has checked off in the form.
    const selectedDrones = fleetDrones.filter(r => newSession.selectedDroneIds.includes(r.id));

  // Toggle a drone in/out of the selectedDroneIds list for the new session form.
  const toggleDroneSelection = (droneId: string) => {
    if (newSession.selectedDroneIds.includes(droneId)) {
      setNewSession({
        ...newSession,
        selectedDroneIds: newSession.selectedDroneIds.filter(id => id !== droneId),
      });
    } else {
      setNewSession({
        ...newSession,
        selectedDroneIds: [...newSession.selectedDroneIds, droneId],
      });
    }
  };

  // Guard against division-by-zero when no drones are selected.
  const getPercentage = (count: number, total: number) =>
    total === 0 ? 0 : Math.round((count / total) * 100);

  // Live status snapshot of currently selected drones — shown as a preview
  // before the user finalises session creation.
  const currentStats = {
    total: selectedDrones.length,
    readyToFly: selectedDrones.filter(d => d.status === 'ready-to-fly').length,
    warning: selectedDrones.filter(d => d.status === 'warning').length,
    critical: selectedDrones.filter(d => d.status === 'critical').length,
    offline: selectedDrones.filter(d => d.status === 'offline').length,
    maintenanceDue: selectedDrones.filter(d => d.status === 'maintenance-due').length,
  };

  const handleCreateSession = () => {
    if (!newSession.sessionNumber) return;

    // The status counts are snapshotted from currentStats at creation time.
    // They are stored on the Session object so the flight log remains accurate
    // even if drone statuses change in the future.
    const session: Session = {
      id: `SES-${String(sessions.length + 1).padStart(3, '0')}`,
      sessionNumber: newSession.sessionNumber,
      date: new Date(),
      fleetId: fleetId || '',
      selectedDroneIds: newSession.selectedDroneIds,
      totalDrones: currentStats.total,
      readyToFly: currentStats.readyToFly,
      warning: currentStats.warning,
      critical: currentStats.critical,
      offline: currentStats.offline,
      maintenanceDue: currentStats.maintenanceDue,
      notes: newSession.notes,
    };

    setSessions([session, ...sessions]);
    // Navigate immediately to the new session's dashboard, passing context in state
    // so the Dashboard doesn't need to re-query for fleet/drone data.
    navigate(`/fleet/${fleetId}/session/${session.id}`, { state: { session, fleetDrones, fleet } });
  };

  const handleSessionSelect = (session: Session) => {
    navigate(`/fleet/${fleetId}/session/${session.id}`, { state: { session, fleetDrones, fleet } });
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
    <div className="min-h-screen bg-black text-white p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a12_1px,transparent_1px),linear-gradient(to_bottom,#0a0a12_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-50"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="mb-8 flex items-center gap-4">
          <Link
            to={`/fleet/${fleetId}`}
            className="w-10 h-10 rounded border border-violet-500/20 flex items-center justify-center hover:bg-violet-500/10 hover:border-violet-500/40 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-violet-400" />
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-violet-300">{location.state?.fleetName || fleet.name}</h2>
            <p className="text-sm text-neutral-500">Create or select a flight session</p>
          </div>
        </div>
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border-2 border-violet-500/30 flex items-center justify-center relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 via-violet-500/20 to-violet-500/0 rounded-xl animate-pulse"></div>
              <Calendar className="w-8 h-8 text-violet-400 relative z-10" />
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent mb-2">Flight Session</h1>
          <p className="text-neutral-400">Select drones for your flight session</p>
        </div>

        <div className="space-y-6">
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full border border-violet-500/20 hover:border-violet-500/40 bg-gradient-to-br from-violet-950/20 to-purple-950/20 rounded-lg p-8 transition-all group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-violet-500/5 to-violet-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-violet-400" />
                </div>
                <div className="text-left flex-1">
                  <h2 className="text-xl font-semibold mb-1">Create New Session</h2>
                  <p className="text-sm text-neutral-400">Start a new flight session with current drone status</p>
                </div>
                <ArrowRight className="w-6 h-6 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ) : (
            <div className="border border-violet-500/20 bg-gradient-to-br from-violet-950/20 to-purple-950/20 rounded-lg p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"></div>
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></span>
                New Session
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-violet-300">Session Number / ID</label>
                  <input
                    type="text"
                    value={newSession.sessionNumber}
                    onChange={(e) => setNewSession({ ...newSession, sessionNumber: e.target.value })}
                    placeholder="e.g., 2026-04-10 or Session-01"
                    className="w-full bg-black/50 border border-violet-500/20 rounded px-4 py-3 focus:outline-none focus:border-violet-500/50 transition-colors font-mono"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-violet-300">
                    Select Drones for Flight ({newSession.selectedDroneIds.length} of {fleetDrones.length} selected)
                  </label>
                  {fleetDrones.length > 0 ? (
                    <div className="bg-black/40 border border-violet-500/10 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-2">
                        {fleetDrones.map(drone => {
                        const isSelected = newSession.selectedDroneIds.includes(drone.id);
                        return (
                          <button
                            key={drone.id}
                            type="button"
                            onClick={() => toggleDroneSelection(drone.id)}
                            className={`flex items-center gap-3 p-3 rounded transition-all text-left ${
                              isSelected
                                ? 'bg-violet-500/20 border border-violet-500/40'
                                : 'bg-black/40 border border-violet-500/10 hover:border-violet-500/30'
                            }`}
                          >
                            {isSelected ? (
                              <CheckCircle2 className="w-5 h-5 text-violet-400 flex-shrink-0" />
                            ) : (
                              <Circle className="w-5 h-5 text-neutral-600 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-mono text-xs text-neutral-600">{drone.id}</div>
                              <div className="font-semibold text-sm text-violet-300 truncate">{drone.name}</div>
                              <StatusBadge status={drone.status} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  ) : (
                    <div className="bg-black/40 border border-violet-500/10 rounded-lg p-8 text-center">
                      <Cpu className="w-10 h-10 text-violet-400/30 mx-auto mb-3" />
                      <p className="text-sm text-neutral-500 mb-2">No drones in this fleet yet</p>
                      <p className="text-xs text-neutral-600">Add drones to your fleet first, then create a flight session</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-violet-300">Notes (Optional)</label>
                  <textarea
                    value={newSession.notes}
                    onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
                    placeholder="Add session notes..."
                    rows={2}
                    className="w-full bg-black/50 border border-violet-500/20 rounded px-4 py-3 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                  />
                </div>
                {newSession.selectedDroneIds.length > 0 && (
                  <div className="bg-black/40 border border-violet-500/10 rounded-lg p-4">
                    <div className="text-xs text-neutral-500 mb-3 font-mono uppercase tracking-wider">Selected Drones Status Snapshot</div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-neutral-500">Ready:</span>
                        <span className="ml-2 text-green-400 font-mono">{currentStats.readyToFly} ({getPercentage(currentStats.readyToFly, currentStats.total)}%)</span>
                      </div>
                      <div>
                        <span className="text-neutral-500">Warning:</span>
                        <span className="ml-2 text-orange-400 font-mono">{currentStats.warning} ({getPercentage(currentStats.warning, currentStats.total)}%)</span>
                      </div>
                      <div>
                        <span className="text-neutral-500">Critical:</span>
                        <span className="ml-2 text-red-400 font-mono">{currentStats.critical} ({getPercentage(currentStats.critical, currentStats.total)}%)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewSession({ sessionNumber: '', notes: '', selectedDroneIds: [] });
                  }}
                  className="px-6 py-3 text-sm hover:bg-violet-500/10 rounded transition-colors border border-violet-500/20"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSession}
                  disabled={!newSession.sessionNumber}
                  className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed rounded text-sm font-medium transition-all shadow-lg shadow-violet-500/20 disabled:shadow-none flex items-center gap-2"
                >
                  Create & Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-violet-400" />
              Recent Sessions
            </h3>
            <div className="space-y-3">
              {sessions.map(session => {
                const readyPercentage = getPercentage(session.readyToFly, session.totalDrones);
                // Compare against the session immediately after this one in the list
                // (sessions are displayed newest-first, so [index + 1] is the older session).
                const lastSession = sessions[sessions.indexOf(session) + 1];
                const trend = lastSession ? session.readyToFly - lastSession.readyToFly : 0;

                return (
                  <button
                    key={session.id}
                    onClick={() => handleSessionSelect(session)}
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
                            <span>{session.selectedDroneIds.length} drones</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {trend !== 0 && (
                          <div className={`flex items-center gap-1 text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            <span>{Math.abs(trend)}</span>
                          </div>
                        )}
                        <ArrowRight className="w-5 h-5 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
          </div>
        </div>
      </div>
    </div>
  );
}






