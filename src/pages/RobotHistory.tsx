/*
 * pages/RobotHistory.tsx
 *
 * Per-drone detail page — reached via /fleet/:fleetId/robot/:robotId, typically
 * by clicking "View History" on a drone card in the Overview tab.
 *
 * Displays:
 *   - A header with the drone name and a coloured status pill.
 *   - Two info cards: Drone Info (name, IP, location, owner) and
 *     Status Details (status, reason, last-checked date, remarks).
 *   - A Maintenance Notes list if the drone has any recorded notes.
 *
 * Data source: fetched from the backend on mount using the :robotId URL param.
 * The robot record includes its maintenance notes via Prisma's `include`.
 */

import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { useState, useEffect } from 'react';

export function RobotHistory() {
  // :robotId comes from the URL segment, e.g. /fleet/abc/robot/RBT-001
  const { robotId } = useParams();
  const navigate = useNavigate();

  // robot starts null while loading; the loading state is shown until data arrives.
  const [robot, setRobot] = useState<any>(null);

  // Fetch this specific drone (including its maintenance notes) on mount.
  // Re-runs if robotId changes, e.g. if the user navigates between robot pages.
  useEffect(() => {
    fetch(`http://localhost:3001/api/robots/single/${robotId}`)
      .then(res => res.json())
      .then(data => setRobot(data))
  }, [robotId])

  if (!robot) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <p className="text-neutral-500">Loading...</p>
    </div>
  )

  // Maps the mapped RobotStatus value to a Tailwind class string for the header pill.
  const statusColour: Record<string, string> = {
    'req-attention': 'text-red-400 border-red-500/30 bg-red-950/20',
    'ready': 'text-green-400 border-green-500/30 bg-green-950/20',
    'oos': 'text-neutral-400 border-red-500/30 bg-red-950/20',
  }

  // rawStatus falls back through multiple fields in case the backend returns different shapes.
  const rawStatus = robot.status || robot.rawStatus || 'N/A'
  const colour = statusColour[robot.status] || 'text-neutral-400 border-neutral-500/30 bg-neutral-950/20'

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="border-b border-violet-500/10 bg-black/80 px-8 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded border border-violet-500/20 flex items-center justify-center hover:bg-violet-500/10 transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-violet-400" />
        </button>
        <Link
          to="/"
          className="w-8 h-8 rounded border border-violet-500/20 flex items-center justify-center hover:bg-violet-500/10 transition-all"
          title="Home"
        >
          <Home className="w-4 h-4 text-violet-400" />
        </Link>
        <h1 className="text-xl font-bold text-violet-400">{robot.name}</h1>
        <span className={`text-xs font-mono px-3 py-1 rounded-full border ${colour}`}>
          {rawStatus}
        </span>
      </header>

      <main className="p-8 max-w-4xl mx-auto w-full space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-violet-500/20 rounded-lg p-5 bg-black/40">
            <div className="text-xs text-neutral-500 font-mono uppercase tracking-wider mb-3">Drone Info</div>
            <div className="space-y-3">
              <Row label="Name" value={robot.name} />
              <Row label="IP Address" value={robot.ipAddress || '—'} />
              <Row label="Location" value={robot.location || '—'} />
              <Row label="Owned By" value={robot.ownedBy || '—'} />
            </div>
          </div>

          <div className="border border-violet-500/20 rounded-lg p-5 bg-black/40">
            <div className="text-xs text-neutral-500 font-mono uppercase tracking-wider mb-3">Status Details</div>
            <div className="space-y-3">
              <Row label="Status" value={rawStatus} />
              <Row label="Reason" value={robot.reason || '—'} />
              <Row label="Last Checked" value={robot.lastChecked ? new Date(robot.lastChecked).toLocaleDateString() : '—'} />
              <Row label="Remarks" value={robot.remarks || '—'} />
            </div>
          </div>
        </div>

        {robot.maintenanceNotes?.length > 0 && (
          <div className="border border-violet-500/20 rounded-lg p-5 bg-black/40">
            <div className="text-xs text-neutral-500 font-mono uppercase tracking-wider mb-3">Maintenance Notes</div>
            <div className="space-y-2">
              {robot.maintenanceNotes.map((note: any) => (
                <div key={note.id} className="border border-neutral-800 rounded p-3 text-sm">
                  <div className="text-neutral-300">{note.note}</div>
                  <div className="text-xs text-neutral-600 font-mono mt-1">{new Date(note.timestamp).toLocaleDateString()} · {note.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// Row — a small helper that renders a label/value pair on one line.
// Used repeatedly inside the info cards to keep the JSX concise.
function Row({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-neutral-500 font-mono">{label}</span>
      <span className="text-neutral-200">{value}</span>
    </div>
  )
}
