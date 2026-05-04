import { useState, useEffect } from 'react';
import { Search, Plus, Wrench, Building2, Plane, Pencil, Trash2 } from 'lucide-react';
import { alertCategories } from '../data/mockData';
import type { MaintenanceNote, MaintenanceStatus, MaintenanceSeverity, CategoryUsage, Robot } from '../types';

interface MaintenanceProps {
  sessionDrones: Robot[];
}

// ── Maintenance Notes ────────────────────────────────────────────────────────

function MaintenanceNotes({ sessionDrones }: { sessionDrones: Robot[] }) {
  const [notes, setNotes] = useState<MaintenanceNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [categories, setCategories] = useState(alertCategories);
  const [categoryUsage, setCategoryUsage] = useState<CategoryUsage[]>([]);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);

  const [newNote, setNewNote] = useState({
    robotId: '',
    note: '',
    status: 'open' as MaintenanceStatus,
    severity: 'on-site' as MaintenanceSeverity,
    problemCategory: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({
    note: '',
    severity: 'on-site' as MaintenanceSeverity,
    status: 'open' as MaintenanceStatus,
    problemCategory: '',
  });

  const startEdit = (n: MaintenanceNote) => {
    setEditingId(n.id);
    setEditDraft({ note: n.note, severity: n.severity ?? 'on-site', status: n.status, problemCategory: n.problemCategory ?? '' });
  };

  const saveEdit = async (noteId: string) => {
    await fetch(`http://localhost:3001/api/maintenance/${noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editDraft),
    });
    setNotes(notes.map(n => n.id === noteId ? { ...n, ...editDraft } : n));
    setEditingId(null);
  };

  const deleteNote = async (noteId: string) => {
    await fetch(`http://localhost:3001/api/maintenance/${noteId}`, { method: 'DELETE' });
    setNotes(notes.filter(n => n.id !== noteId));
  };

  // Seeded data uses 'low'/'medium'/'high'; new notes use 'on-site'/'office'/'origin-country'
  const normSeverity = (raw: string): MaintenanceSeverity => {
    if (raw === 'origin-country' || raw === 'high') return 'origin-country';
    if (raw === 'office' || raw === 'medium') return 'office';
    return 'on-site';
  };

  const droneIds = sessionDrones.map(d => d.id).join(',');

  useEffect(() => {
    if (!droneIds) return;
    fetch('http://localhost:3001/api/maintenance/by-robots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ robotIds: droneIds.split(',') }),
    })
      .then(r => r.json())
      .then((data: any[]) => setNotes(data.map(n => ({
        id: n.id,
        robotId: n.robotId,
        robotName: sessionDrones.find(d => d.id === n.robotId)?.name ?? n.robotId,
        note: n.note,
        status: n.status as MaintenanceStatus,
        severity: normSeverity(n.severity),
        timestamp: new Date(n.timestamp),
        problemCategory: n.problemCategory || undefined,
      }))));
  }, [droneIds]);

  const filteredNotes = notes.filter(note =>
    searchQuery === '' ||
    note.robotName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.note.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const trackCategoryUsage = (category: string) => {
    if (categories.includes(category) || !category) return;
    const existingUsage = categoryUsage.find(u => u.category === category);
    let newUsage: CategoryUsage[];
    if (existingUsage) {
      newUsage = categoryUsage.map(u => u.category === category ? { ...u, count: u.count + 1 } : u);
    } else {
      newUsage = [...categoryUsage, { category, count: 1 }];
    }
    setCategoryUsage(newUsage);
    const updated = newUsage.find(u => u.category === category);
    if (updated && updated.count >= 10) {
      setCategories([...categories, category]);
      setCategoryUsage(categoryUsage.filter(u => u.category !== category));
    }
  };

  const handleAddNote = async () => {
    if (!newNote.robotId || !newNote.note) return;
    const robot = sessionDrones.find(r => r.id === newNote.robotId);
    if (!robot) return;
    if (newNote.problemCategory) trackCategoryUsage(newNote.problemCategory);

    const res = await fetch('http://localhost:3001/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        robotId: newNote.robotId,
        note: newNote.note,
        status: newNote.status,
        severity: newNote.severity,
        problemCategory: newNote.problemCategory,
      }),
    });
    const created = await res.json();
    setNotes([{
      ...created,
      robotName: robot.name,
      timestamp: new Date(created.timestamp),
      severity: normSeverity(created.severity),
      problemCategory: created.problemCategory || undefined,
    }, ...notes]);
    setNewNote({ robotId: '', note: '', status: 'open', severity: 'on-site', problemCategory: '' });
    setCustomCategoryInput('');
    setShowCustomCategoryInput(false);
    setShowAddForm(false);
  };

  const updateNoteStatus = async (noteId: string, newStatus: MaintenanceStatus) => {
    await fetch(`http://localhost:3001/api/maintenance/${noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setNotes(notes.map(n => n.id === noteId ? { ...n, status: newStatus } : n));
  };

  const getStatusColor = (status: MaintenanceStatus) => {
    switch (status) {
      case 'open': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'in-progress': return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'resolved': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'archived': return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
    }
  };

  const getSeverityConfig = (severity?: MaintenanceSeverity) => {
    switch (severity) {
      case 'on-site': return { label: 'On-Site Fix', icon: Wrench, color: 'text-green-400 bg-green-500/10 border-green-500/20' };
      case 'office': return { label: 'Office Maintenance', icon: Building2, color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' };
      case 'origin-country': return { label: 'Origin Country', icon: Plane, color: 'text-red-400 bg-red-500/10 border-red-500/20' };
      default: return { label: 'Unspecified', icon: Wrench, color: 'text-neutral-400 bg-neutral-500/10 border-neutral-500/20' };
    }
  };

  const formatDate = (date: Date) => date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const groupedNotes = {
    open: filteredNotes.filter(n => n.status === 'open'),
    'in-progress': filteredNotes.filter(n => n.status === 'in-progress'),
    resolved: filteredNotes.filter(n => n.status === 'resolved'),
    archived: filteredNotes.filter(n => n.status === 'archived'),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500" />
          <input
            type="text"
            placeholder="Search maintenance notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/50 border border-violet-500/20 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500/50 transition-colors font-mono placeholder:text-neutral-600"
          />
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-violet-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Note
        </button>
      </div>

      {showAddForm && (
        <div className="border border-violet-500/30 bg-gradient-to-br from-violet-950/20 to-purple-950/20 rounded-lg p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"></div>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></span>
            Add Maintenance Note
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-neutral-500 mb-2 font-mono uppercase tracking-wider">Drone</label>
              <select
                value={newNote.robotId}
                onChange={(e) => setNewNote({ ...newNote, robotId: e.target.value })}
                className="w-full bg-black/50 border border-violet-500/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 font-mono"
              >
                <option value="">Select Drone</option>
                {sessionDrones.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-neutral-500 mb-2 font-mono uppercase tracking-wider">Problem Category</label>
              <div className="space-y-2">
                <select
                  value={showCustomCategoryInput ? 'custom' : newNote.problemCategory}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setShowCustomCategoryInput(true);
                      setNewNote({ ...newNote, problemCategory: '' });
                    } else {
                      setShowCustomCategoryInput(false);
                      setNewNote({ ...newNote, problemCategory: e.target.value });
                    }
                  }}
                  className="w-full bg-black/50 border border-violet-500/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 font-mono"
                >
                  <option value="">None</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  <option value="custom">+ Custom Category</option>
                </select>
                {showCustomCategoryInput && (
                  <input
                    type="text"
                    value={customCategoryInput}
                    onChange={(e) => { setCustomCategoryInput(e.target.value); setNewNote({ ...newNote, problemCategory: e.target.value }); }}
                    placeholder="Enter custom category..."
                    className="w-full bg-black/50 border border-violet-500/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 font-mono"
                    autoFocus
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs text-neutral-500 mb-2 font-mono uppercase tracking-wider">Note</label>
              <textarea
                value={newNote.note}
                onChange={(e) => setNewNote({ ...newNote, note: e.target.value })}
                placeholder="Enter maintenance note..."
                rows={3}
                className="w-full bg-black/50 border border-violet-500/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-500 mb-2 font-mono uppercase tracking-wider">Severity</label>
                <select
                  value={newNote.severity}
                  onChange={(e) => setNewNote({ ...newNote, severity: e.target.value as MaintenanceSeverity })}
                  className="w-full bg-black/50 border border-violet-500/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 font-mono"
                >
                  <option value="on-site">On-Site Fix</option>
                  <option value="office">Office Maintenance</option>
                  <option value="origin-country">Origin Country</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-2 font-mono uppercase tracking-wider">Status</label>
                <select
                  value={newNote.status}
                  onChange={(e) => setNewNote({ ...newNote, status: e.target.value as MaintenanceStatus })}
                  className="w-full bg-black/50 border border-violet-500/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 font-mono"
                >
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm hover:bg-violet-500/10 rounded border border-violet-500/20 transition-colors">Cancel</button>
            <button onClick={handleAddNote} className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded text-sm font-medium transition-all shadow-lg shadow-violet-500/20">Add Note</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-6">
        {Object.entries(groupedNotes).map(([status, statusNotes]) => (
          <div key={status} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold capitalize font-mono text-violet-300">{status.replace('-', ' ')}</h3>
              <span className="text-sm text-neutral-600 font-mono">({statusNotes.length})</span>
            </div>
            <div className="space-y-3">
              {statusNotes.length === 0 && (
                <div className="border border-violet-500/10 rounded-lg p-4 text-center text-xs text-neutral-700 font-mono">No notes</div>
              )}
              {statusNotes.map(note => {
                const severityConfig = getSeverityConfig(note.severity);
                const SeverityIcon = severityConfig.icon;
                const isEditing = editingId === note.id;

                if (isEditing) {
                  return (
                    <div key={note.id} className="border border-violet-500/40 bg-gradient-to-br from-violet-950/30 to-purple-950/20 rounded-lg p-4 space-y-3">
                      <div className="text-xs text-violet-400 font-mono uppercase tracking-wider mb-1">Editing — {note.robotName}</div>

                      <div>
                        <label className="block text-xs text-neutral-500 mb-1 font-mono uppercase tracking-wider">Note</label>
                        <textarea
                          value={editDraft.note}
                          onChange={(e) => setEditDraft({ ...editDraft, note: e.target.value })}
                          rows={3}
                          autoFocus
                          className="w-full bg-black/50 border border-violet-500/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-neutral-500 mb-1 font-mono uppercase tracking-wider">Category</label>
                        <input
                          type="text"
                          value={editDraft.problemCategory}
                          onChange={(e) => setEditDraft({ ...editDraft, problemCategory: e.target.value })}
                          placeholder="Problem category..."
                          className="w-full bg-black/50 border border-violet-500/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-neutral-500 mb-1 font-mono uppercase tracking-wider">Severity</label>
                          <select
                            value={editDraft.severity}
                            onChange={(e) => setEditDraft({ ...editDraft, severity: e.target.value as MaintenanceSeverity })}
                            className="w-full bg-black/50 border border-violet-500/20 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-violet-500/50 font-mono"
                          >
                            <option value="on-site">On-Site Fix</option>
                            <option value="office">Office Maintenance</option>
                            <option value="origin-country">Origin Country</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-500 mb-1 font-mono uppercase tracking-wider">Status</label>
                          <select
                            value={editDraft.status}
                            onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value as MaintenanceStatus })}
                            className="w-full bg-black/50 border border-violet-500/20 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-violet-500/50 font-mono"
                          >
                            <option value="open">Open</option>
                            <option value="in-progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="archived">Archived</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs hover:bg-violet-500/10 rounded border border-violet-500/20 transition-colors">
                          Cancel
                        </button>
                        <button onClick={() => saveEdit(note.id)} className="px-3 py-1.5 text-xs bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded font-medium transition-all">
                          Save
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={note.id} className="group border border-violet-500/20 bg-gradient-to-br from-black/40 to-violet-950/10 rounded-lg p-4 hover:border-violet-500/30 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-medium text-sm text-violet-300">{note.robotName}</div>
                        {note.problemCategory && (
                          <div className="text-xs text-neutral-600 font-mono mt-0.5">{note.problemCategory}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(note)}
                          className="w-6 h-6 rounded flex items-center justify-center text-neutral-700 hover:text-violet-400 hover:bg-violet-500/10 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="w-6 h-6 rounded flex items-center justify-center text-neutral-700 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <span className={`text-xs px-2 py-1 rounded border font-mono ${getStatusColor(note.status)}`}>
                          {note.status.replace('-', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className={`flex items-center gap-2 px-3 py-2 rounded border mb-3 ${severityConfig.color}`}>
                      <SeverityIcon className="w-3.5 h-3.5" />
                      <span className="text-xs font-mono">{severityConfig.label}</span>
                    </div>

                    <p className="text-sm text-neutral-300 mb-3">{note.note}</p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-600 font-mono">{formatDate(note.timestamp)}</span>
                      <select
                        value={note.status}
                        onChange={(e) => updateNoteStatus(note.id, e.target.value as MaintenanceStatus)}
                        className="text-xs bg-black/50 border border-violet-500/20 rounded px-2 py-1 focus:outline-none focus:border-violet-500/50 font-mono"
                      >
                        <option value="open">Open</option>
                        <option value="in-progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Maintenance({ sessionDrones }: MaintenanceProps) {
  return <MaintenanceNotes sessionDrones={sessionDrones} />;
}
