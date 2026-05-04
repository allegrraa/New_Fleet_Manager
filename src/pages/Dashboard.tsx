/*
 * pages/Dashboard.tsx
 *
 * Session detail page — reached via /fleet/:fleetId/session/:sessionId.
 *
 * Responsibilities:
 *   - Show session metadata (name, drone count) in a sticky header.
 *   - Provide a global drone search that overrides the tab content.
 *   - Render three tab panels, each a separate component:
 *       Overview   → drone status cards + active alert banner (Overview.tsx)
 *       Events     → alert/event log table with add/resolve/delete (Events.tsx)
 *       Maintenance & Fixes → kanban maintenance board (Maintenance.tsx)
 *
 * Data strategy:
 *   - Fast path: data is passed via React Router navigation state when arriving
 *     from SessionSelection or FleetDashboard — no extra fetches needed.
 *   - Fallback: if the user lands directly on the URL (e.g. bookmarked link),
 *     all three resources (sessions, robots, fleet) are fetched in parallel
 *     using Promise.all so the page loads as quickly as possible.
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Search, Cpu } from 'lucide-react';
import { Overview } from '../components/Overview';
import { Events } from '../components/Events';
import { Maintenance } from '../components/Maintenance';
import type { Session, Robot, RobotStatus } from '../types';

// Tab union type — controls which panel is active below the header.
type Tab = 'overview' | 'events' | 'maintenance';

// Converts the raw status string stored in the database to a typed RobotStatus.
// The database stores "WORKING" and "OOS" in uppercase; everything else is treated
// as req-attention (e.g. "FAULT", "OFFLINE", empty string, etc.).
function mapStatus(raw: string): RobotStatus {
  const s = raw?.trim().toUpperCase();
  if (s === 'WORKING') return 'ready';
  if (s === 'OOS') return 'oos';
  return 'req-attention';
}

// Converts a raw backend robot record into the Robot interface used by the UI.
// Fields that aren't stored in the DB (battery, version, sessionCount, etc.)
// are given safe defaults rather than left as undefined.
function mapRobot(r: any): Robot {
  return {
    id: r.id,
    name: r.name,
    status: mapStatus(r.status),
    battery: 0,
    location: r.location || '',
    lastSeen: new Date(r.lastChecked),
    currentTask: r.reason || 'N/A',
    version: 'N/A',
    ipAddress: r.ipAddress || '',
    fullVersion: 'N/A',
    sessionCount: 0,
    recentAlerts: [],
    maintenanceHistory: [],
    lastLogRetrieval: new Date(r.lastChecked),
    eventHistory: [],
  };
}

export function Dashboard() {
  // Extract :fleetId and :sessionId from the URL (e.g. /fleet/abc/session/xyz)
  const { fleetId, sessionId } = useParams<{ fleetId: string; sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Which tab is currently selected
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Text typed into the global search bar — when non-empty, replaces tab content
  // with a filtered drone list across all tabs.
  const [globalSearch, setGlobalSearch] = useState('');

  // currentSession starts with data from navigation state (fast) and may be
  // overwritten by the backend fetch if the page was loaded directly.
  const [currentSession, setCurrentSession] = useState<Session | null>(
    location.state?.session || null
  );
  const [sessionDrones, setSessionDrones] = useState<Robot[]>([]);
  const [fleet, setFleet] = useState<any>(location.state?.fleet || null);

  useEffect(() => {
    // Fast path: session + drones were passed via navigation state — just filter
    // down to the drones that belong to this session and skip all network requests.
    if (location.state?.session && location.state?.fleetDrones) {
      const ids: string[] = location.state.session.selectedDroneIds ?? [];
      setSessionDrones(
        (location.state.fleetDrones as Robot[]).filter(r => ids.includes(r.id))
      );
      return;
    }

    // Fallback (direct URL access): fetch sessions, robots, and fleet in parallel.
    // If fleet data was already loaded from a previous navigation, reuse it to
    // avoid a redundant request.
    Promise.all([
      fetch(`http://localhost:3001/api/sessions/${fleetId}`).then(r => r.json()),
      fetch(`http://localhost:3001/api/robots/${fleetId}`).then(r => r.json()),
      fleet ? Promise.resolve(fleet) : fetch(`http://localhost:3001/api/fleets/${fleetId}`).then(r => r.json()),
    ]).then(([sessions, robots, fleetData]) => {
      // Find the specific session this page is for within the fleet's session list.
      const raw = sessions.find((s: any) => s.id === sessionId);
      if (raw) {
        // selectedDroneIds is stored as a comma-separated string in the DB.
        const ids: string[] = raw.selectedDroneIds ? raw.selectedDroneIds.split(',').filter(Boolean) : [];
        setCurrentSession({ ...raw, date: new Date(raw.date), selectedDroneIds: ids });
        // Only keep the robots whose IDs appear in this session's drone list.
        setSessionDrones(robots.filter((r: any) => ids.includes(r.id)).map(mapRobot));
      }
      if (!fleet) setFleet({ ...fleetData, lastModified: new Date(fleetData.lastModified) });
    });
  }, [fleetId, sessionId]);

  // When the user types in the global search bar, compute matching drones once
  // and render a simple grid instead of the active tab content.
  // null means "no search active" — avoids an unnecessary empty-render flicker.
  const filteredResults = globalSearch ? {
    drones: sessionDrones.filter(r =>
      r.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
      r.id.toLowerCase().includes(globalSearch.toLowerCase()) ||
      r.location.toLowerCase().includes(globalSearch.toLowerCase())
    ),
  } : null;

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a12_1px,transparent_1px),linear-gradient(to_bottom,#0a0a12_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>

      <header className="border-b border-violet-500/10 bg-black/80 backdrop-blur-sm sticky top-0 z-40 relative">
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"></div>
        <div className="px-8 py-4 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="w-8 h-8 rounded border border-violet-500/20 flex items-center justify-center hover:bg-violet-500/10 hover:border-violet-500/40 transition-all"
                >
                  <ArrowLeft className="w-4 h-4 text-violet-400" />
                </button>
                <Link
                  to="/"
                  className="w-8 h-8 rounded border border-violet-500/20 flex items-center justify-center hover:bg-violet-500/10 hover:border-violet-500/40 transition-all"
                  title="Home"
                >
                  <Home className="w-4 h-4 text-violet-400" />
                </Link>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-violet-400" />
                </div>
              </div>
              <div className="flex-1 max-w-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                    {fleet?.name || 'Fleet'}
                  </h1>
                  {currentSession && (
                    <>
                      <span className="text-sm text-neutral-600 font-mono">/ {currentSession.sessionNumber}</span>
                      <span className="text-xs text-neutral-700 font-mono">({currentSession.selectedDroneIds.length} drones)</span>
                    </>
                  )}
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500" />
                  <input
                    type="text"
                    placeholder="Search drones..."
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    className="w-full bg-black/50 border border-violet-500/20 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-violet-500/50 transition-colors font-mono placeholder:text-neutral-600"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
            </div>
          </div>

          <div className="flex gap-1">
            {([
              { id: 'overview', label: 'Overview' },
              { id: 'events', label: 'Events' },
              { id: 'maintenance', label: 'Maintenance & Fixes' },
            ] as { id: Tab; label: string }[]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded text-xs font-mono transition-all ${
                  activeTab === tab.id
                    ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300'
                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="p-8 relative z-10">
        {globalSearch && filteredResults ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Search Results</h2>
              <button onClick={() => setGlobalSearch('')} className="text-sm text-violet-400 hover:text-violet-300">
                Clear search
              </button>
            </div>
            {filteredResults.drones.length > 0 ? (
              <div>
                <h3 className="text-sm font-mono uppercase tracking-wider text-neutral-500 mb-3">
                  Drones ({filteredResults.drones.length})
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {filteredResults.drones.map(drone => (
                    <div key={drone.id} className="border border-violet-500/20 bg-gradient-to-br from-black/40 to-violet-950/10 rounded-lg p-4">
                      <div className="font-mono text-xs text-neutral-600 mb-1">{drone.id}</div>
                      <div className="font-semibold text-violet-300 mb-2">{drone.name}</div>
                      <div className="text-xs text-neutral-400">{drone.location}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-600">No results found</div>
            )}
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <Overview sessionDrones={sessionDrones} fleetId={fleetId} />}
            {activeTab === 'events' && <Events sessionDrones={sessionDrones} sessionId={currentSession?.id} />}
            {activeTab === 'maintenance' && <Maintenance sessionDrones={sessionDrones} />}
          </>
        )}
      </main>
    </div>
  );
}
