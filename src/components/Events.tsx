/*
 * components/Events.tsx
 *
 * The "Events" tab content rendered inside Dashboard.tsx.
 *
 * Responsibilities:
 *   - Fetch all alert events for the drones in this session from the backend.
 *   - Display them in a sortable table: unresolved errors first, then warnings,
 *     then info, then resolved — newest-first within each group.
 *   - Allow filtering by drone, category, severity, and resolved status.
 *   - Allow adding a new event via an inline form (drone, category, severity, description).
 *   - Allow toggling an event as resolved/unresolved and deleting events.
 *   - Auto-promote custom categories and descriptions into the permanent dropdown
 *     after they've been used 10 times (trackCategoryUsage / trackDescriptionUsage).
 *
 * Props:
 *   sessionDrones — the Robot[] objects in this session (used to populate drone dropdowns)
 *   sessionId     — linked to the event record so events can be queried per-session later
 */

import { useState, useEffect } from 'react';
import { Plus, Filter, Trash2 } from 'lucide-react';
import { alertCategories, commonProblemDescriptions } from '../data/mockData';
import type { Alert, AlertSeverity, CategoryUsage, Robot } from '../types';
import { StatusBadge } from './StatusBadge';

interface EventsProps {
  sessionDrones: Robot[];
  sessionId?: string;
}

export function Events({ sessionDrones, sessionId }: EventsProps) {
  // Flat list of drone IDs in this session — used as the query key for the backend fetch.
  const sessionDroneIds = sessionDrones.map(d => d.id);

  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Filter state — each filter defaults to 'all' (no filtering).
  const [filterRobot, setFilterRobot] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState<'all' | AlertSeverity>('all');
  const [filterResolved, setFilterResolved] = useState<'all' | 'resolved' | 'unresolved'>('all');

  // UI toggle state
  const [showFilters, setShowFilters] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Dynamic category and description lists — start with the static seed lists and
  // grow as custom entries are used 10+ times (see trackCategoryUsage below).
  const [categories, setCategories] = useState(alertCategories);
  const [categoryUsage, setCategoryUsage] = useState<CategoryUsage[]>([]);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [problemDescriptions, setProblemDescriptions] = useState(commonProblemDescriptions);
  const [descriptionUsage, setDescriptionUsage] = useState<CategoryUsage[]>([]);
  const [customDescriptionInput, setCustomDescriptionInput] = useState('');
  const [showCustomDescription, setShowCustomDescription] = useState(false);

  // Form state for the "Add Event" panel.
  const [newAlert, setNewAlert] = useState({
    robotId: '',
    category: '',
    severity: 'info' as AlertSeverity,
    description: '',
  });

  // Stable string key derived from the drone ID list.
  // useEffect depends on this instead of the array directly to avoid re-running
  // on every render (array identity changes every render even if contents are the same).
  const droneIdKey = sessionDroneIds.join(',');

  // Fetch all events for this session's drones when the drone list changes.
  // Uses a POST /by-robots endpoint because GET requests can't carry a body,
  // and the drone list could be too long for URL query params.
  useEffect(() => {
    if (!sessionDroneIds.length) return;
    fetch('http://localhost:3001/api/events/by-robots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ robotIds: sessionDroneIds }),
    })
      .then(r => r.json())
      .then((data: any[]) => {
        setAlerts(data.map(e => ({
          id: e.id,
          robotId: e.robotId,
          // Look up the drone name from the session list; fall back to the ID if not found.
          robotName: sessionDrones.find(d => d.id === e.robotId)?.name ?? e.robotId,
          category: e.category,
          severity: e.severity as AlertSeverity,
          description: e.description,
          timestamp: new Date(e.timestamp),
          resolved: e.resolved,
        })));
      })
      .catch(console.error);
  }, [droneIdKey]);

  // Apply all active filters then sort: unresolved before resolved, higher severity
  // first within the same resolved state, newest first within the same severity.
  const filteredAlerts = alerts
    .filter(alert => {
      const matchesRobot = filterRobot === 'all' || alert.robotId === filterRobot;
      const matchesCategory = filterCategory === 'all' || alert.category === filterCategory;
      const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
      const matchesResolved = filterResolved === 'all' ||
        (filterResolved === 'resolved' && alert.resolved) ||
        (filterResolved === 'unresolved' && !alert.resolved);
      return matchesRobot && matchesCategory && matchesSeverity && matchesResolved;
    })
    .sort((a, b) => {
      // Resolved alerts always sink to the bottom of the list.
      if (a.resolved && !b.resolved) return 1;
      if (!a.resolved && b.resolved) return -1;
      // Within the same resolved state, sort by severity (error → warning → info).
      const severityOrder = { 'error': 0, 'warning': 1, 'info': 2, 'resolved': 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      // Same severity: show the most recent event first.
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

  // Auto-promotion logic: tracks how many times a custom category has been used.
  // Once a category reaches 10 uses it is added permanently to the dropdown list
  // so operators don't need to retype it every time.
  const trackCategoryUsage = (category: string) => {
    if (categories.includes(category)) return; // already a permanent category
    const existingUsage = categoryUsage.find(u => u.category === category);
    let newUsage: CategoryUsage[];
    if (existingUsage) {
      newUsage = categoryUsage.map(u => u.category === category ? { ...u, count: u.count + 1 } : u);
    } else {
      newUsage = [...categoryUsage, { category, count: 1 }];
    }
    setCategoryUsage(newUsage);
    const updatedUsage = newUsage.find(u => u.category === category);
    if (updatedUsage && updatedUsage.count >= 10 && !categories.includes(category)) {
      setCategories([...categories, category]);
      setCategoryUsage(categoryUsage.filter(u => u.category !== category));
    }
  };

  // Same logic as trackCategoryUsage but for problem description strings.
  const trackDescriptionUsage = (description: string) => {
    if (problemDescriptions.includes(description)) return;
    const existingUsage = descriptionUsage.find(u => u.category === description);
    let newUsage: CategoryUsage[];
    if (existingUsage) {
      newUsage = descriptionUsage.map(u => u.category === description ? { ...u, count: u.count + 1 } : u);
    } else {
      newUsage = [...descriptionUsage, { category: description, count: 1 }];
    }
    setDescriptionUsage(newUsage);
    const updatedUsage = newUsage.find(u => u.category === description);
    if (updatedUsage && updatedUsage.count >= 10 && !problemDescriptions.includes(description)) {
      setProblemDescriptions([...problemDescriptions, description]);
      setDescriptionUsage(descriptionUsage.filter(u => u.category !== description));
    }
  };

  // POST the new event to the backend, then prepend it to the local alerts list
  // so it appears instantly at the top without a page reload.
  const handleAddAlert = async () => {
    if (!newAlert.robotId || !newAlert.category || !newAlert.description) return;
    const robot = sessionDrones.find(r => r.id === newAlert.robotId);
    if (!robot) return;

    const res = await fetch('http://localhost:3001/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        robotId: newAlert.robotId,
        category: newAlert.category,
        severity: newAlert.severity,
        description: newAlert.description,
        resolved: false,
        sessionId: sessionId ?? '',
      }),
    });
    const created = await res.json();

    // Record usage so custom categories/descriptions can be auto-promoted.
    trackCategoryUsage(newAlert.category);
    trackDescriptionUsage(newAlert.description);

    const alert: Alert = {
      id: created.id,
      robotId: created.robotId,
      robotName: robot.name,
      category: created.category,
      severity: created.severity as AlertSeverity,
      description: created.description,
      timestamp: new Date(created.timestamp),
      resolved: created.resolved,
    };

    setAlerts([alert, ...alerts]);
    // Reset form fields after successful submission.
    setNewAlert({ robotId: '', category: '', severity: 'info', description: '' });
    setCustomCategoryInput('');
    setCustomDescriptionInput('');
    setShowCustomDescription(false);
    setShowAddForm(false);
  };

  // DELETE the event from the backend, then remove it from the local list.
  const deleteAlert = async (alertId: string) => {
    await fetch(`http://localhost:3001/api/events/${alertId}`, { method: 'DELETE' });
    setAlerts(alerts.filter(a => a.id !== alertId));
  };

  // PATCH the resolved flag on the backend, then update the local list optimistically.
  const toggleResolved = async (alertId: string) => {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return;
    const nowResolved = !alert.resolved;

    await fetch(`http://localhost:3001/api/events/${alertId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved: nowResolved }),
    });

    // Update the local state immediately so the UI reflects the change without a refetch.
    setAlerts(alerts.map(a =>
      a.id === alertId
        ? { ...a, resolved: nowResolved, resolvedAt: nowResolved ? new Date() : undefined }
        : a
    ));
  };

  // Adds a brand-new category via a browser prompt — used as an escape hatch from
  // the dropdown when the desired category has never been used before.
  const addCategory = () => {
    const newCategory = prompt('Enter new category name:');
    if (newCategory && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            showFilters ? 'bg-violet-500/20 text-violet-400 border border-violet-500/40' : 'bg-black/50 border border-violet-500/20 hover:border-violet-500/40'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-violet-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Event
        </button>
      </div>

      {showFilters && (
        <div className="border border-violet-500/20 bg-gradient-to-br from-violet-950/20 to-purple-950/20 rounded-lg p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"></div>
          <div className="grid grid-cols-4 gap-4 relative z-10">
            <div>
              <label className="block text-xs text-neutral-500 mb-2 font-mono uppercase tracking-wider">Drone</label>
              <select
                value={filterRobot}
                onChange={(e) => setFilterRobot(e.target.value)}
                className="w-full bg-black/50 border border-violet-500/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 transition-colors font-mono"
              >
                <option value="all">All Drones</option>
                {sessionDrones.map(robot => (
                  <option key={robot.id} value={robot.id}>{robot.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-2 font-mono uppercase tracking-wider">Category</label>
              <div className="flex gap-2">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="flex-1 bg-black/50 border border-violet-500/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 transition-colors font-mono"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button
                  onClick={addCategory}
                  className="w-9 h-9 bg-black/50 border border-violet-500/20 hover:border-violet-500/40 rounded flex items-center justify-center transition-all"
                >
                  <Plus className="w-4 h-4 text-violet-400" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-2 font-mono uppercase tracking-wider">Severity</label>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value as any)}
                className="w-full bg-black/50 border border-violet-500/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 transition-colors font-mono"
              >
                <option value="all">All Severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-2 font-mono uppercase tracking-wider">Status</label>
              <select
                value={filterResolved}
                onChange={(e) => setFilterResolved(e.target.value as any)}
                className="w-full bg-black/50 border border-violet-500/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 transition-colors font-mono"
              >
                <option value="all">All</option>
                <option value="unresolved">Unresolved</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="border border-violet-500/20 bg-gradient-to-br from-violet-950/20 to-purple-950/20 rounded-lg p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"></div>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></span>
            Add New Event
          </h3>
          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div>
              <label className="block text-xs text-neutral-500 mb-2 font-mono uppercase tracking-wider">Drone</label>
              <select
                value={newAlert.robotId}
                onChange={(e) => setNewAlert({ ...newAlert, robotId: e.target.value })}
                className="w-full bg-black/50 border border-violet-500/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 transition-colors font-mono"
              >
                <option value="">Select Drone</option>
                {sessionDrones.map(robot => (
                  <option key={robot.id} value={robot.id}>{robot.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-2 font-mono uppercase tracking-wider">
                Category
                {customCategoryInput && !categories.includes(customCategoryInput) && (
                  <span className="ml-2 text-orange-400">
                    ({(categoryUsage.find(u => u.category === customCategoryInput)?.count || 0)}/10 until auto-add)
                  </span>
                )}
              </label>
              <div className="space-y-2">
                <select
                  value={newAlert.category}
                  onChange={(e) => {
                    setNewAlert({ ...newAlert, category: e.target.value });
                    if (e.target.value !== 'custom') setCustomCategoryInput('');
                  }}
                  className="w-full bg-black/50 border border-violet-500/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 transition-colors font-mono"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="custom">+ Custom Category</option>
                </select>
                {newAlert.category === 'custom' && (
                  <input
                    type="text"
                    value={customCategoryInput}
                    onChange={(e) => {
                      setCustomCategoryInput(e.target.value);
                      setNewAlert({ ...newAlert, category: e.target.value });
                    }}
                    placeholder="Enter custom category..."
                    className="w-full bg-black/50 border border-violet-500/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 transition-colors font-mono"
                    autoFocus
                  />
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-2 font-mono uppercase tracking-wider">Severity</label>
              <select
                value={newAlert.severity}
                onChange={(e) => setNewAlert({ ...newAlert, severity: e.target.value as AlertSeverity })}
                className="w-full bg-black/50 border border-violet-500/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 transition-colors font-mono"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-neutral-500 mb-2 font-mono uppercase tracking-wider">
                Problem Description
                {customDescriptionInput && !problemDescriptions.includes(customDescriptionInput) && (
                  <span className="ml-2 text-orange-400">
                    ({(descriptionUsage.find(u => u.category === customDescriptionInput)?.count || 0)}/10 until auto-add)
                  </span>
                )}
              </label>
              <div className="space-y-2">
                <select
                  value={showCustomDescription ? 'custom' : newAlert.description}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setShowCustomDescription(true);
                      setCustomDescriptionInput('');
                      setNewAlert({ ...newAlert, description: '' });
                    } else {
                      setShowCustomDescription(false);
                      setNewAlert({ ...newAlert, description: e.target.value });
                      setCustomDescriptionInput('');
                    }
                  }}
                  className="w-full bg-black/50 border border-violet-500/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 transition-colors font-mono"
                >
                  <option value="">Select Problem</option>
                  {problemDescriptions.map(desc => (
                    <option key={desc} value={desc}>{desc}</option>
                  ))}
                  <option value="custom">+ Custom Problem Description</option>
                </select>
                {showCustomDescription && (
                  <input
                    type="text"
                    value={customDescriptionInput}
                    onChange={(e) => {
                      setCustomDescriptionInput(e.target.value);
                      setNewAlert({ ...newAlert, description: e.target.value });
                    }}
                    placeholder="Enter custom problem description..."
                    className="w-full bg-black/50 border border-violet-500/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 transition-colors font-mono"
                    autoFocus
                  />
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm hover:bg-violet-500/10 rounded transition-colors border border-violet-500/20"
            >
              Cancel
            </button>
            <button
              onClick={handleAddAlert}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded text-sm font-medium transition-all shadow-lg shadow-violet-500/20"
            >
              Add Event
            </button>
          </div>
        </div>
      )}

      <div className="border border-violet-500/20 bg-gradient-to-br from-black/40 to-violet-950/10 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-black/40 border-b border-violet-500/10">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-mono uppercase tracking-wider text-neutral-500">Drone</th>
              <th className="text-left px-6 py-3 text-xs font-mono uppercase tracking-wider text-neutral-500">Category</th>
              <th className="text-left px-6 py-3 text-xs font-mono uppercase tracking-wider text-neutral-500">Severity</th>
              <th className="text-left px-6 py-3 text-xs font-mono uppercase tracking-wider text-neutral-500">Description</th>
              <th className="text-left px-6 py-3 text-xs font-mono uppercase tracking-wider text-neutral-500">Timestamp</th>
              <th className="text-left px-6 py-3 text-xs font-mono uppercase tracking-wider text-neutral-500">Status</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filteredAlerts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-neutral-600 font-mono text-sm">
                  No events recorded for this session
                </td>
              </tr>
            ) : filteredAlerts.map((alert, idx) => (
              <tr key={alert.id} className={`border-b border-violet-500/5 transition-colors hover:bg-violet-500/5 ${idx % 2 === 0 ? 'bg-black/20' : 'bg-violet-950/5'}`}>
                <td className="px-6 py-4">
                  <div className="font-medium text-violet-300">{alert.robotName}</div>
                </td>
                <td className="px-6 py-4 text-sm font-mono">{alert.category}</td>
                <td className="px-6 py-4">
                  <StatusBadge severity={alert.resolved ? 'resolved' : alert.severity} />
                </td>
                <td className="px-6 py-4 text-sm text-neutral-300">{alert.description}</td>
                <td className="px-6 py-4 text-sm text-neutral-600 font-mono">{formatDate(alert.timestamp)}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleResolved(alert.id)}
                    className={`text-xs px-3 py-1 rounded border font-mono ${
                      alert.resolved
                        ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                        : 'bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20'
                    } transition-all`}
                  >
                    {alert.resolved ? 'Resolved' : 'Mark Resolved'}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="text-neutral-600 hover:text-red-400 hover:bg-red-500/10 w-7 h-7 rounded flex items-center justify-center transition-all"
                    title="Delete event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
