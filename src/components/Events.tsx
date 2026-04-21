/*
 * components/Events.tsx
 *
 * The "Events" tab content rendered inside Dashboard.tsx.
 *
 * Displays a filterable, searchable table of alert events for the drones that
 * belong to the current session. Each row supports:
 *   - "Mark Resolved" toggle — flips the resolved flag and updates the badge.
 *   - Delete button — removes the alert from the local list.
 *
 * An "Add Event" form lets operators log new incidents. It provides:
 *   - A drone selector (populated from sessionDrones)
 *   - A category dropdown with a "+ Custom Category" escape hatch
 *   - A severity dropdown (info / warning / error)
 *   - A problem description dropdown with a "+ Custom" option
 *
 * Auto-promotion of custom values:
 *   If a user-typed custom category or description is used 10 times, it is
 *   automatically added to the permanent dropdown list for that session. This
 *   promotes frequently-used ad-hoc labels without requiring a manual admin step.
 *   The usage counts are tracked in categoryUsage / descriptionUsage state arrays.
 *
 * Filter panel (toggled by the "Filters" button):
 *   Filter by drone, category, severity, and resolved/unresolved status.
 *
 * Alert sort order:
 *   Unresolved errors → unresolved warnings → unresolved info → resolved (newest first within each group).
 */

import { useState, useEffect } from 'react';
import { Search, Plus, Filter, Trash2 } from 'lucide-react';
import { mockAlerts, alertCategories, commonProblemDescriptions } from '../data/mockData';
import type { Alert, AlertSeverity, CategoryUsage, Robot } from '../types';
import { StatusBadge } from './StatusBadge';

// Props: receives only the drones that belong to the current session,
// so the alert table never shows events from other sessions.
interface EventsProps {
  sessionDrones: Robot[];
}

export function Events({ sessionDrones }: EventsProps) {
  // Extract just the IDs so we can do O(1) lookups when filtering mockAlerts.
  const sessionDroneIds = sessionDrones.map(d => d.id);

  // alerts — the live, mutable list of events shown in the table.
  // Seeded from mockAlerts but scoped to this session's drones only.
  const [alerts, setAlerts] = useState<Alert[]>(
    mockAlerts.filter(a => sessionDroneIds.includes(a.robotId))
  );

  // searchQuery — bound to the search input; filters across drone name, description, and category.
  const [searchQuery, setSearchQuery] = useState('');

  // Filter state — each corresponds to one dropdown in the filter panel.
  // 'all' means "no filter applied for this field".
  const [filterRobot, setFilterRobot] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState<'all' | AlertSeverity>('all');
  const [filterResolved, setFilterResolved] = useState<'all' | 'resolved' | 'unresolved'>('all');

  // UI visibility toggles for the collapsible filter panel and "Add Event" form.
  const [showFilters, setShowFilters] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // categories — the list of options shown in the Category dropdowns.
  // Starts from the static alertCategories list; grows when custom values are auto-promoted.
  const [categories, setCategories] = useState(alertCategories);

  // categoryUsage — tracks how many times each custom (non-default) category has been submitted.
  // When a custom category reaches 10 uses it gets promoted into `categories` permanently.
  const [categoryUsage, setCategoryUsage] = useState<CategoryUsage[]>([]);

  // customCategoryInput — the raw text the user types when they pick "+ Custom Category".
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  // problemDescriptions / descriptionUsage — mirror of the category system, but for descriptions.
  const [problemDescriptions, setProblemDescriptions] = useState(commonProblemDescriptions);
  const [descriptionUsage, setDescriptionUsage] = useState<CategoryUsage[]>([]);
  const [customDescriptionInput, setCustomDescriptionInput] = useState('');

  // showCustomDescription — controls whether the free-text input for a custom description is visible.
  const [showCustomDescription, setShowCustomDescription] = useState(false);

  // newAlert — form state for the "Add Event" panel.
  // Resets to these defaults after a successful submission.
  const [newAlert, setNewAlert] = useState({
    robotId: '',
    category: '',
    severity: 'info' as AlertSeverity,
    description: '',
  });

  // filteredAlerts — derived (not stored) list computed fresh on every render.
  // Applies all active filters then sorts: unresolved errors first, resolved last,
  // with severity order (error > warning > info) and newest-first as tiebreakers.
  const filteredAlerts = alerts
    .filter(alert => {
      // Search matches if any of these three fields contains the query string (case-insensitive).
      const matchesSearch = searchQuery === '' ||
        alert.robotName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.category.toLowerCase().includes(searchQuery.toLowerCase());

      // Each filter is a simple equality check; 'all' short-circuits to always match.
      const matchesRobot = filterRobot === 'all' || alert.robotId === filterRobot;
      const matchesCategory = filterCategory === 'all' || alert.category === filterCategory;
      const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;

      // Resolved filter compares the boolean flag to the chosen string option.
      const matchesResolved = filterResolved === 'all' ||
        (filterResolved === 'resolved' && alert.resolved) ||
        (filterResolved === 'unresolved' && !alert.resolved);

      // An alert is only shown if it satisfies ALL active filters simultaneously.
      return matchesSearch && matchesRobot && matchesCategory && matchesSeverity && matchesResolved;
    })
    .sort((a, b) => {
      // Resolved alerts always sink to the bottom, regardless of their severity.
      if (a.resolved && !b.resolved) return 1;
      if (!a.resolved && b.resolved) return -1;

      // Among alerts with the same resolved state, sort by urgency: error(0) > warning(1) > info(2).
      const severityOrder = { 'error': 0, 'warning': 1, 'info': 2, 'resolved': 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      // Equal severity — show the most recent alert first.
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

  // trackCategoryUsage — called every time a new alert is submitted with a custom category.
  // Increments the usage counter; if it hits 10, promotes the value into the permanent dropdown
  // and removes it from the usage tracker (it's now a standard option, not a custom one).
  const trackCategoryUsage = (category: string) => {
    if (categories.includes(category)) return; // Already a standard category; nothing to track.

    const existingUsage = categoryUsage.find(u => u.category === category);
    let newUsage: CategoryUsage[];

    if (existingUsage) {
      // Increment the count for this category immutably.
      newUsage = categoryUsage.map(u =>
        u.category === category ? { ...u, count: u.count + 1 } : u
      );
    } else {
      // First time this custom category has been used — start its counter at 1.
      newUsage = [...categoryUsage, { category, count: 1 }];
    }

    setCategoryUsage(newUsage);

    // Check the updated count to see if the promotion threshold has been reached.
    const updatedUsage = newUsage.find(u => u.category === category);
    if (updatedUsage && updatedUsage.count >= 10 && !categories.includes(category)) {
      // Promote: add to permanent list and stop tracking usage for it.
      setCategories([...categories, category]);
      setCategoryUsage(categoryUsage.filter(u => u.category !== category));
    }
  };

  // trackDescriptionUsage — identical auto-promotion logic as trackCategoryUsage,
  // but operates on the problemDescriptions list instead of categories.
  const trackDescriptionUsage = (description: string) => {
    if (problemDescriptions.includes(description)) return;

    const existingUsage = descriptionUsage.find(u => u.category === description);
    let newUsage: CategoryUsage[];

    if (existingUsage) {
      newUsage = descriptionUsage.map(u =>
        u.category === description ? { ...u, count: u.count + 1 } : u
      );
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

  // handleAddAlert — validates the form, constructs an Alert object, tracks usage,
  // prepends it to the alerts list (so it appears at the top), then resets the form.
  const handleAddAlert = () => {
    // All three fields are required; silently abort if any is empty.
    if (!newAlert.robotId || !newAlert.category || !newAlert.description) return;

    // Look up the full Robot object so we can store the human-readable name on the alert.
    const robot = sessionDrones.find(r => r.id === newAlert.robotId);
    if (!robot) return;

    const alert: Alert = {
      // Generate a zero-padded ID based on current list length (e.g. ALT-007).
      id: `ALT-${String(alerts.length + 1).padStart(3, '0')}`,
      robotId: newAlert.robotId,
      robotName: robot.name,
      category: newAlert.category,
      severity: newAlert.severity,
      description: newAlert.description,
      timestamp: new Date(),
      resolved: false,
    };

    // Track usage for auto-promotion of custom categories/descriptions.
    trackCategoryUsage(newAlert.category);
    trackDescriptionUsage(newAlert.description);

    // Prepend the new alert so it appears at the top of the table immediately.
    setAlerts([alert, ...alerts]);

    // Reset all form fields to their defaults and close the form.
    setNewAlert({
      robotId: '',
      category: '',
      severity: 'info',
      description: '',
    });
    setCustomCategoryInput('');
    setCustomDescriptionInput('');
    setShowCustomDescription(false);
    setShowAddForm(false);
  };

  // deleteAlert — removes a single alert from the list by its ID.
  const deleteAlert = (alertId: string) => {
    setAlerts(alerts.filter(a => a.id !== alertId));
  };

  // toggleResolved — flips the resolved flag on a single alert.
  // Side effect: if resolving this alert clears the last unresolved error on a critical drone,
  // the drone's status is flipped back to 'ready-to-fly' so the Overview tab reflects it.
  // NOTE: this mutates the Robot object in-place because it's not wrapped in its own React state here.
  const toggleResolved = (alertId: string) => {
    setAlerts(alerts.map(alert => {
      if (alert.id === alertId) {
        const nowResolved = !alert.resolved;
        if (nowResolved) {
          const robot = sessionDrones.find(r => r.id === alert.robotId);
          // Only auto-recover the drone if this was its LAST unresolved error alert.
          if (robot && robot.status === 'critical' && alerts.filter(a => a.robotId === robot.id && a.severity === 'error' && !a.resolved).length === 1) {
            robot.status = 'ready-to-fly';
          }
        }
        return {
          ...alert,
          resolved: nowResolved,
          // Record when it was resolved; clear the timestamp if un-resolving.
          resolvedAt: nowResolved ? new Date() : undefined
        };
      }
      return alert;
    }));
  };

  // addCategory — escape hatch in the filter panel to add a one-off category via a browser prompt.
  // Skips duplicates to keep the dropdown clean.
  const addCategory = () => {
    const newCategory = prompt('Enter new category name:');
    if (newCategory && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
    }
  };

  // formatDate — converts a Date to a compact "Mon DD, HH:MM AM/PM" string for table display.
  const formatDate = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500" />
          <input
            type="text"
            placeholder="Search events by drone, description, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/50 border border-violet-500/20 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500/50 transition-colors font-mono placeholder:text-neutral-600"
          />
        </div>
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
                  <option key={robot.id} value={robot.id}>{robot.name} ({robot.id})</option>
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
                    if (e.target.value !== 'custom') {
                      setCustomCategoryInput('');
                    }
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
            </tr>
          </thead>
          <tbody>
            {filteredAlerts.map((alert, idx) => (
              <tr key={alert.id} className={idx % 2 === 0 ? 'bg-black/20' : 'bg-violet-950/5'}>
                <td className="px-6 py-4">
                  <div className="font-medium text-violet-300">{alert.robotName}</div>
                  <div className="text-xs text-neutral-600 font-mono">{alert.robotId}</div>
                </td>
                <td className="px-6 py-4 text-sm font-mono">{alert.category}</td>
                <td className="px-6 py-4">
                  <StatusBadge severity={alert.resolved ? 'resolved' : alert.severity} />
                </td>
                <td className="px-6 py-4 text-sm text-neutral-300">{alert.description}</td>
                <td className="px-6 py-4 text-sm text-neutral-600 font-mono">{formatDate(alert.timestamp)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
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
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="w-7 h-7 flex items-center justify-center rounded border border-transparent hover:border-red-500/20 hover:bg-red-500/10 text-neutral-600 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
