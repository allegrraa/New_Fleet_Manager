/*
 * pages/RobotHistory.tsx
 *
 * Individual drone / robot history page — reached via /fleet/:fleetId/robot/:robotId.
 *
 * This page is currently a placeholder ("coming soon"). In its final form it
 * is intended to show the full event and maintenance history for a single drone.
 *
 * The "View History" link in Overview.tsx's RobotCard navigates here.
 * The back arrow returns to the fleet dashboard for the parent fleet.
 */

import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function RobotHistory() {
  // Both params come from the URL: /fleet/:fleetId/robot/:robotId
  const { fleetId, robotId } = useParams();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="border-b border-violet-500/10 bg-black/80 px-8 py-4 flex items-center gap-4">
        <Link
          to={`/fleet/${fleetId}`}
          className="w-8 h-8 rounded border border-violet-500/20 flex items-center justify-center hover:bg-violet-500/10 transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-violet-400" />
        </Link>
        <h1 className="text-xl font-bold text-violet-400">
          Robot History — {robotId}
        </h1>
      </header>
      {/* Placeholder content — replace with real history data when implemented. */}
      <main className="flex-1 flex items-center justify-center text-neutral-500">
        Robot history coming soon.
      </main>
    </div>
  );
}
