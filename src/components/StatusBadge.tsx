/*
 * components/StatusBadge.tsx
 *
 * Reusable pill badge component used throughout the app to show either:
 *   - A drone's operational status (RobotStatus), or
 *   - An alert's severity level (AlertSeverity).
 *
 * Usage:
 *   <StatusBadge status="ready-to-fly" />   // green "Ready to Fly" badge
 *   <StatusBadge severity="error" />         // red "Error" badge
 *
 * The Props type is a discriminated union that enforces exactly one of
 * `status` or `severity` is provided — passing both or neither is a type error.
 */

import type { RobotStatus, AlertSeverity } from '../types';

// Maps every RobotStatus value to a display label and Tailwind CSS classes.
const statusConfig: Record<RobotStatus, { label: string; className: string }> = {
  'ready':   { label: 'Ready', className: 'bg-green-500/10 text-green-400 border border-green-500/30' },
  'req-attention': { label: 'Req Attention', className: 'bg-red-500/10 text-red-400 border border-red-500/30' },
  'oos':           { label: 'OOS',           className: 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/30' },
};

// Maps every AlertSeverity value to a display label and Tailwind CSS classes.
const severityConfig: Record<AlertSeverity, { label: string; className: string }> = {
  'info':     { label: 'Info',     className: 'bg-blue-500/10 text-blue-400 border border-blue-500/30' },
  'warning':  { label: 'Warning',  className: 'bg-orange-500/10 text-orange-400 border border-orange-500/30' },
  'error':    { label: 'Error',    className: 'bg-red-500/10 text-red-400 border border-red-500/30' },
  'resolved': { label: 'Resolved', className: 'bg-green-500/10 text-green-400 border border-green-500/30' },
};

// Discriminated union: exactly one of status or severity must be provided.
type Props =
  | { status: RobotStatus; severity?: never }
  | { severity: AlertSeverity; status?: never };

export function StatusBadge({ status, severity }: Props) {
  // Pick the correct config table based on which prop was supplied.
  const config = status ? statusConfig[status] : severityConfig[severity!];
  if (!config) return null;
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono ${config.className}`}>
      {config.label}
    </span>
  );
}
