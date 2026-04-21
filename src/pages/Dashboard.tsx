/*
 * pages/Dashboard.tsx
 *
 * The main session workspace — reached via /fleet/:fleetId/session/:sessionId.
 *
 * This page acts as a shell / layout component. It:
 *   - Renders a sticky header with the fleet name, session ID, a global search
 *     input, a notification bell, and a "Back to Fleet" button.
 *   - Switches between two tab views:
 *       Overview  → drone cards with status, battery, and alert data (Overview.tsx)
 *       Events    → table of alerts with filters and an add-event form (Events.tsx)
 *   - Implements a cross-tab global search that searches drones and events
 *     simultaneously and displays combined inline results, overriding the active tab.
 *
 * Data flow:
 *   - The session object is taken from location.state (populated by SessionSelection)
 *     or looked up in mockSessions by sessionId for direct URL access.
 *   - sessionDrones is the filtered list of Robot objects whose IDs appear in
 *     currentSession.selectedDroneIds — this is passed as a prop to both child tabs.
 */

import { useState } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Search, Cpu } from 'lucide-react';
import { Overview } from '../components/Overview';
import { Events } from '../components/Events';
import { mockFleets, mockRobots, mockAlerts, mockSessions } from '../data/mockData';
import type { Session } from '../types';

// Local union type to restrict the activeTab state to known values.
type Tab = 'overview' | 'events';

export function Dashboard () {
  const {fleetId, sessionId} = useParams<{fleetId: string, sessionId: string}>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showNotifications, setShowNotifications] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Initialise session from navigation state (fast path) or look it up by URL param.
  // useState with an initialiser function avoids re-running the find on every render.
  const [currentSession] = useState<Session | null>(() =>
    location.state?.session || mockSessions.find(s => s.id === sessionId) || null
  );

  const fleet = mockFleets.find(f => f.id === fleetId);
  // availableDrones is the full fleet roster — used when navigating back to FleetDashboard.
  const availableDrones = mockRobots.filter(r => fleet?.droneIds.includes(r.id));

  // sessionDrones is the subset selected for this specific session.
  const sessionDrones = currentSession
    ? mockRobots.filter(r => currentSession.selectedDroneIds.includes(r.id))
    : [];

  // When the user types in the global search bar, compute matched drones and events.
  // Returning null (instead of empty arrays) means "no search active" — the normal
  // tab view is rendered instead of the search results panel.
  const filteredResults = globalSearch ? {
    drones: sessionDrones.filter(r=>
      r.name.toLowerCase().includes(globalSearch.toLowerCase())||
      r.id.toLowerCase().includes(globalSearch.toLowerCase())||
      r.location.toLowerCase().includes(globalSearch.toLowerCase())
    ),
    events: mockAlerts.filter(a=>
      // Only search alerts that belong to drones in this session.
      currentSession?.selectedDroneIds.includes(a.robotId) &&
      (a.robotName.toLowerCase().includes(globalSearch.toLowerCase())||
      a.description.toLowerCase().includes(globalSearch.toLowerCase())||
      a.category.toLowerCase().includes(globalSearch.toLowerCase()))
    ),
  } : null;

  const tabs: {id: Tab, label: string}[] = [
    {id: 'overview', label: 'Overview'},
    {id: 'events', label: 'Events'},
  ];

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a12_1px,transparent_1px),linear-gradient(to_bottom,#0a0a12_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>

      <header className="border-b border-violet-500/10 bg-black/80 backdrop-blur-sm sticky top-0 z-40 relative">
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"></div>
        <div className="px-8 py-4 relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center gap-3">
                <Link
                  to="/"
                  className="w-8 h-8 rounded border border-violet-500/20 flex items-center justify-center hover:bg-violet-500/10 hover:border-violet-500/40 transition-all"
                >
                  <ArrowLeft className="w-4 h-4 text-violet-400" />
                </Link>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-violet-400" />
                </div>
              </div>
              <div className="flex-1 max-w-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">{fleet?.name || 'Fleet'}</h1>
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
                    placeholder="Global search: drones, events, maintenance, fixes..."
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    className="w-full bg-black/50 border border-violet-500/20 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-violet-500/50 transition-colors font-mono placeholder:text-neutral-600"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/fleet/${fleetId}`, {
                  state: { newFleet: fleet, fleetDrones: availableDrones }
                })}
                className="px-4 py-2 bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 hover:border-violet-500/40 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4 text-violet-400" />
                <span className="text-violet-400">Back to Fleet</span>
              </button>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 hover:border-violet-500/40 flex items-center justify-center transition-all"
              >
                <Bell className="w-5 h-5 text-violet-400" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full shadow-lg shadow-red-500/50"></span>
              </button>
            </div>
          </div>
          <nav className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition-all rounded relative overflow-hidden ${
                  activeTab === tab.id
                    ? 'bg-violet-500/10 text-violet-400 border border-violet-500/30'
                    : 'text-neutral-500 hover:text-violet-400 hover:bg-violet-500/5'
                }`}
              >
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400 to-transparent"></div>
                )}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="p-8 relative z-10">
        {globalSearch && filteredResults ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Search Results</h2>
              <button
                onClick={() => setGlobalSearch('')}
                className="text-sm text-violet-400 hover:text-violet-300"
              >
                Clear search
              </button>
            </div>

            {filteredResults.drones.length > 0 && (
              <div>
                <h3 className="text-sm font-mono uppercase tracking-wider text-neutral-500 mb-3">Drones ({filteredResults.drones.length})</h3>
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
            )}

            {filteredResults.events.length > 0 && (
              <div>
                <h3 className="text-sm font-mono uppercase tracking-wider text-neutral-500 mb-3">Events ({filteredResults.events.length})</h3>
                <div className="space-y-2">
                  {filteredResults.events.slice(0, 5).map(event => (
                    <div key={event.id} className="border border-violet-500/20 bg-gradient-to-r from-black/40 to-violet-950/10 rounded-lg p-4">
                      <div className="text-sm font-mono text-violet-400">{event.robotName}</div>
                      <div className="text-xs text-neutral-400 mt-1">{event.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredResults.drones.length === 0 && filteredResults.events.length === 0 && (
              <div className="text-center py-12 text-neutral-600">No results found</div>
            )}
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <Overview sessionDrones={sessionDrones} fleetId={fleetId} />}
            {activeTab === 'events' && <Events sessionDrones={sessionDrones} />}
          </>
        )}
      </main>


    </div>
  );
}



