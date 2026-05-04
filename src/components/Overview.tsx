/*
 * components/Overview.tsx
 *
 * The "Overview" tab content rendered inside Dashboard.tsx.
 *
 * Displays:
 *   1. Four summary stat cards: Total Drones, Online, Warning, Critical.
 *   2. An active alerts banner (shows up to 3 unresolved alerts from mockAlerts).
 *   3. A search input and drone filter dropdown.
 *   4. Drone cards grouped into three priority sections:
 *        - "Priority Attention" — critical, warning, or maintenance-due drones
 *        - "Ready to Fly"       — healthy drones (first 3 shown, with a "show more" button)
 *        - "Offline"            — unreachable drones
 *
 * Each drone card is clickable to expand/collapse an inline detail panel showing
 * IP address, full firmware version, total session count, and a "View History" link.
 *
 * Props:
 *   sessionDrones — the Robot[] objects selected for the current session (from Dashboard)
 *   fleetId       — needed to build the /fleet/:fleetId/robot/:robotId navigation link
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, AlertCircle, ChevronDown, ChevronRight, History } from 'lucide-react';
import { mockAlerts } from '../data/mockData';
import type { Robot, RobotStatus } from '../types';
import { StatusBadge } from './StatusBadge';

interface OverviewProps {
  sessionDrones: Robot[];
  fleetId?: string;
}

export function Overview({ sessionDrones, fleetId }: OverviewProps) {
  // searchQuery — bound to the search input; filters drone cards by name, ID, or location.
  const [searchQuery, setSearchQuery] = useState('');

  // selectedRobot — bound to the dropdown; when not 'all', shows only the chosen drone.
  const [selectedRobot, setSelectedRobot] = useState<string>('all');

  // expandedRobots — tracks which drone cards have their detail panel open.
  // A Set is used instead of an array for O(1) has/add/delete operations when many
  // cards could be expanded simultaneously.
  const [expandedRobots, setExpandedRobots] = useState<Set<string>>(new Set());

  // showAllReadyToFly — the "Ready to Fly" section is capped at 3 cards by default.
  // Toggling this to true reveals all of them.
  const [showAllReadyToFly, setShowAllReadyToFly] = useState(false);

  // Summary card counts — derived from all sessionDrones (unfiltered).
  const totalRobots = sessionDrones.length;
  const readyCount = sessionDrones.filter(r => r.status === 'ready').length;
  const reqAttentionCount = sessionDrones.filter(r => r.status === 'req-attention').length;
  const oosCount = sessionDrones.filter(r => r.status === 'oos').length;

  // sortedRobots — a stable copy of sessionDrones ordered by urgency so critical drones
  // always appear at the top of the card grid regardless of filter state.
  const sortedRobots = [...sessionDrones].sort((a, b) => {
    const statusOrder: Record<RobotStatus, number> = {
      'req-attention': 0,
      'oos': 1,
      'ready': 2,
    };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  // filteredRobots — sorted list further narrowed by the search box and drone dropdown.
  // Both filters must pass for a drone to appear.
  const filteredRobots = sortedRobots.filter(robot => {
    // Case-insensitive match against name, ID, or location.
    const matchesSearch = searchQuery === '' ||
      robot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      robot.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      robot.location.toLowerCase().includes(searchQuery.toLowerCase());

    // Dropdown filter: 'all' bypasses the check entirely.
    const matchesFilter = selectedRobot === 'all' || robot.id === selectedRobot;

    return matchesSearch && matchesFilter;
  });

  // Pre-partition filtered drones into the three display sections rendered below.
  const reqAttentionRobots = filteredRobots.filter(r => r.status === 'req-attention');
  const readyRobots = filteredRobots.filter(r => r.status === 'ready');
  const oosRobots = filteredRobots.filter(r => r.status === 'oos');

  // Limit the visible ready cards to 3 unless the user has clicked "Show more".
  const displayedReady = showAllReadyToFly ? readyRobots : readyRobots.slice(0, 3);

  // toggleExpand — adds the robotId to the expanded set if it isn't there; removes it if it is.
  // Creates a new Set each time so React detects the state change and re-renders.
  const toggleExpand = (robotId: string) => {
    const newExpanded = new Set(expandedRobots);
    if (newExpanded.has(robotId)) {
      newExpanded.delete(robotId);
    } else {
      newExpanded.add(robotId);
    }
    setExpandedRobots(newExpanded);
  };

  // formatLastSeen — converts an absolute Date into a human-readable relative string
  // ("Just now", "5m ago", "3h ago", or a locale date string for older records).
  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  // activeAlerts — only unresolved alerts are shown in the banner; resolved ones are filtered out.
  const activeAlerts = mockAlerts.filter(a => !a.resolved);

  /*
   * RobotCard — inline sub-component (defined inside Overview to access its
   * closure variables expandedRobots and toggleExpand without extra prop drilling).
   * Shows a compact drone summary; clicking toggles an expanded detail section.
   */
  const RobotCard = ({ robot }: { robot: Robot }) => {
    const isExpanded = expandedRobots.has(robot.id);

    return (
      <div className="border border-violet-500/20 bg-gradient-to-br from-black/40 to-violet-950/10 rounded-lg overflow-hidden hover:border-violet-500/30 transition-all group relative">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 via-violet-500/5 to-violet-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <div
          onClick={() => toggleExpand(robot.id)}
          className="p-5 cursor-pointer transition-colors relative z-10"
        >
          <div className="flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="font-semibold text-lg text-violet-300 mb-3">{robot.name}</div>
              </div>
              <ChevronDown className={`w-5 h-5 text-violet-500/50 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>

            <div className="space-y-3 mb-4">
              <StatusBadge status={robot.status} />
              {robot.currentTask && robot.currentTask !== 'N/A' && (
                <div className="text-xs text-neutral-400 font-mono truncate">{robot.currentTask}</div>
              )}

              <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded border border-violet-500/10">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  robot.battery > 60 ? 'bg-green-400 shadow-lg shadow-green-400/50' :
                  robot.battery > 30 ? 'bg-orange-400 shadow-lg shadow-orange-400/50' : 'bg-red-400 shadow-lg shadow-red-400/50'
                }`}></div>
                <span className="text-base font-mono flex-1">{robot.battery}%</span>
                <span className="text-xs text-neutral-600">BATT</span>
              </div>

              <div className="bg-black/40 px-3 py-2 rounded border border-violet-500/10">
                <div className="text-xs text-neutral-600 mb-1">LOCATION</div>
                <div className="text-sm font-mono text-violet-400">{robot.location}</div>
              </div>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-violet-500/10 bg-black/40 p-4">
            <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/30 to-transparent"></div>
            <div className="grid grid-cols-1 gap-3 mb-4 pt-2">
              <div className="bg-black/40 px-3 py-2 rounded">
                <div className="text-xs text-neutral-600 mb-1 font-mono uppercase tracking-wider">IP Address</div>
                <div className="font-mono text-sm text-violet-400">{robot.ipAddress}</div>
              </div>
              <div className="bg-black/40 px-3 py-2 rounded">
                <div className="text-xs text-neutral-600 mb-1 font-mono uppercase tracking-wider">Version</div>
                <div className="font-mono text-sm">{robot.fullVersion}</div>
              </div>
              <div className="bg-black/40 px-3 py-2 rounded">
                <div className="text-xs text-neutral-600 mb-1 font-mono uppercase tracking-wider">Sessions</div>
                <div className="font-mono text-sm">{robot.sessionCount}</div>
              </div>
            </div>
            <Link
              to={`/fleet/${fleetId}/robot/${robot.id}`}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 rounded transition-all w-full"
            >
              <History className="w-4 h-4 text-violet-400" />
              <span className="text-sm text-violet-400">View History</span>
            </Link>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-4 gap-6">
        <div className="border border-violet-500/20 bg-gradient-to-br from-black/40 to-violet-950/10 rounded-lg p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-all"></div>
          <div className="text-sm text-neutral-500 mb-2 font-mono uppercase tracking-wider">Total Drones</div>
          <div className="text-4xl font-bold font-mono bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">{totalRobots}</div>
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"></div>
        </div>
        <div className="border border-green-500/20 bg-gradient-to-br from-black/40 to-green-950/10 rounded-lg p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/10 transition-all"></div>
          <div className="text-sm text-neutral-500 mb-2 font-mono uppercase tracking-wider">Ready</div>
          <div className="text-4xl font-bold font-mono text-green-400">{readyCount}</div>
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-green-500/50 to-transparent"></div>
        </div>
        <div className="border border-red-500/20 bg-gradient-to-br from-black/40 to-red-950/10 rounded-lg p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-all"></div>
          <div className="text-sm text-neutral-500 mb-2 font-mono uppercase tracking-wider">Req Attention</div>
          <div className="text-4xl font-bold font-mono text-red-400">{reqAttentionCount}</div>
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent"></div>
        </div>
        <div className="border border-red-500/20 bg-gradient-to-br from-black/40 to-red-950/10 rounded-lg p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-all"></div>
          <div className="text-sm text-neutral-500 mb-2 font-mono uppercase tracking-wider">OOS</div>
          <div className="text-4xl font-bold font-mono text-red-400">{oosCount}</div>
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent"></div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-neutral-600 font-mono flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"></div>
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {activeAlerts.length > 0 && (
        <div className="border border-orange-500/20 bg-gradient-to-br from-orange-950/10 to-red-950/10 rounded-lg p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-orange-400" />
            </div>
            <h2 className="text-lg font-semibold">Active Alerts</h2>
            <span className="text-sm text-neutral-500 font-mono">({activeAlerts.length})</span>
          </div>
          <div className="space-y-2">
            {activeAlerts.slice(0, 3).map(alert => (
              <div key={alert.id} className="flex items-center justify-between text-sm p-3 rounded bg-black/30 border border-orange-500/10">
                <div className="flex items-center gap-3">
                  <span className="text-neutral-400 font-mono">{alert.robotName}</span>
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-orange-500/10 text-orange-400 border border-orange-500/30">{alert.severity}</span>
                  <span>{alert.description}</span>
                </div>
                <span className="text-neutral-600 text-xs font-mono">{formatLastSeen(alert.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500" />
          <input
            type="text"
            placeholder="Search drones by name, ID, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/50 border border-violet-500/20 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500/50 transition-colors font-mono placeholder:text-neutral-600"
          />
        </div>
        <select
          value={selectedRobot}
          onChange={(e) => setSelectedRobot(e.target.value)}
          className="bg-black/50 border border-violet-500/20 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-violet-500/50 transition-colors font-mono"
        >
          <option value="all">All Drones</option>
          {sessionDrones.map(robot => (
            <option key={robot.id} value={robot.id}>{robot.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-6">
        {reqAttentionRobots.length > 0 && (
          <div>
            <h3 className="text-sm font-mono uppercase tracking-wider text-neutral-500 mb-3">Req Attention</h3>
            <div className="grid grid-cols-4 gap-4">
              {reqAttentionRobots.map(robot => (
                <RobotCard key={robot.id} robot={robot} />
              ))}
            </div>
          </div>
        )}

        {oosRobots.length > 0 && (
          <div>
            <h3 className="text-sm font-mono uppercase tracking-wider text-neutral-500 mb-3">OOS</h3>
            <div className="grid grid-cols-4 gap-4">
              {oosRobots.map(robot => (
                <RobotCard key={robot.id} robot={robot} />
              ))}
            </div>
          </div>
        )}

        {readyRobots.length > 0 && (
          <div>
            <h3 className="text-sm font-mono uppercase tracking-wider text-neutral-500 mb-3">Ready</h3>
            <div className="grid grid-cols-4 gap-4">
              {displayedReady.map(robot => (
                <RobotCard key={robot.id} robot={robot} />
              ))}
            </div>
            {readyRobots.length > 3 && !showAllReadyToFly && (
              <button
                onClick={() => setShowAllReadyToFly(true)}
                className="mt-3 w-full py-2 border border-violet-500/20 rounded-lg text-sm text-violet-400 hover:bg-violet-500/10 transition-all flex items-center justify-center gap-2"
              >
                <ChevronRight className="w-4 h-4" />
                Show {readyRobots.length - 3} more
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
