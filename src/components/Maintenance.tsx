import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Wrench, Building2, Plane, BookOpen, Tag, FileText, ChevronDown, ChevronUp, Paperclip, X, Pencil, Trash2 } from 'lucide-react';
import { alertCategories } from '../data/mockData';
import type { MaintenanceNote, MaintenanceStatus, MaintenanceSeverity, CategoryUsage, Robot, Fix } from '../types';

interface MaintenanceProps {
  sessionDrones: Robot[];
}

type InnerTab = 'notes' | 'fixes';

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

// ── Fix Guides ───────────────────────────────────────────────────────────────

function FixGuides() {
  const [fixes, setFixes] = useState<Fix[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [categories, setCategories] = useState(alertCategories);
  const [categoryUsage, setCategoryUsage] = useState<CategoryUsage[]>([]);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [symptomInput, setSymptomInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newFix, setNewFix] = useState({
    title: '',
    category: '',
    description: '',
    symptoms: [] as string[],
    solution: '',
    pdfUrl: '',
    pdfName: '',
  });

  const trackCategoryUsage = (category: string) => {
    if (categories.includes(category) || !category) return;
    const existing = categoryUsage.find(u => u.category === category);
    let updated: CategoryUsage[];
    if (existing) {
      updated = categoryUsage.map(u => u.category === category ? { ...u, count: u.count + 1 } : u);
    } else {
      updated = [...categoryUsage, { category, count: 1 }];
    }
    setCategoryUsage(updated);
    const entry = updated.find(u => u.category === category);
    if (entry && entry.count >= 10) {
      setCategories([...categories, category]);
      setCategoryUsage(updated.filter(u => u.category !== category));
    }
  };

  const handleAddSymptom = () => {
    const trimmed = symptomInput.trim();
    if (!trimmed) return;
    setNewFix({ ...newFix, symptoms: [...newFix.symptoms, trimmed] });
    setSymptomInput('');
  };

  const handleRemoveSymptom = (idx: number) => {
    setNewFix({ ...newFix, symptoms: newFix.symptoms.filter((_, i) => i !== idx) });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewFix({ ...newFix, pdfUrl: URL.createObjectURL(file), pdfName: file.name });
  };

  const handleAddFix = () => {
    if (!newFix.title || !newFix.solution) return;
    if (newFix.category) trackCategoryUsage(newFix.category);

    const fix: Fix = {
      id: `FIX-${String(fixes.length + 1).padStart(3, '0')}`,
      title: newFix.title,
      category: newFix.category,
      description: newFix.description,
      symptoms: newFix.symptoms,
      solution: newFix.solution,
      pdfUrl: newFix.pdfUrl || undefined,
      pdfName: newFix.pdfName || undefined,
      createdAt: new Date(),
    };

    setFixes([fix, ...fixes]);
    setNewFix({ title: '', category: '', description: '', symptoms: [], solution: '', pdfUrl: '', pdfName: '' });
    setSymptomInput('');
    setCustomCategoryInput('');
    setShowCustomCategoryInput(false);
    setShowAddForm(false);
  };

  const filteredFixes = fixes.filter(fix => {
    const matchesSearch =
      searchQuery === '' ||
      fix.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fix.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fix.solution.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fix.symptoms.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || selectedCategory === 'All' || fix.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatDate = (date: Date) =>
    date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500" />
          <input
            type="text"
            placeholder="Search fix guides..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/50 border border-violet-500/20 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500/50 transition-colors font-mono placeholder:text-neutral-600"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-black/50 border border-violet-500/20 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-violet-500/50 font-mono text-neutral-300"
        >
          <option value="">All Categories</option>
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-violet-500/20 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Add Fix Guide
        </button>
      </div>

      {showAddForm && (
        <div className="border border-violet-500/30 bg-gradient-to-br from-violet-950/20 to-purple-950/20 rounded-lg p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            Add Fix Guide
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-500 mb-2 font-mono uppercase tracking-wider">Title *</label>
                <input
                  type="text"
                  value={newFix.title}
                  onChange={(e) => setNewFix({ ...newFix, title: e.target.value })}
                  placeholder="Fix title..."
                  className="w-full bg-black/50 border border-violet-500/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-2 font-mono uppercase tracking-wider">Category</label>
                <div className="space-y-2">
                  <select
                    value={showCustomCategoryInput ? 'custom' : newFix.category}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setShowCustomCategoryInput(true);
                        setNewFix({ ...newFix, category: '' });
                      } else {
                        setShowCustomCategoryInput(false);
                        setNewFix({ ...newFix, category: e.target.value });
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
                      onChange={(e) => { setCustomCategoryInput(e.target.value); setNewFix({ ...newFix, category: e.target.value }); }}
                      placeholder="Enter custom category..."
                      className="w-full bg-black/50 border border-violet-500/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 font-mono"
                      autoFocus
                    />
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-neutral-500 mb-2 font-mono uppercase tracking-wider">Description</label>
              <textarea
                value={newFix.description}
                onChange={(e) => setNewFix({ ...newFix, description: e.target.value })}
                placeholder="Brief description of the issue..."
                rows={2}
                className="w-full bg-black/50 border border-violet-500/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-500 mb-2 font-mono uppercase tracking-wider">Symptoms</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={symptomInput}
                  onChange={(e) => setSymptomInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSymptom(); } }}
                  placeholder="Add symptom and press Enter..."
                  className="flex-1 bg-black/50 border border-violet-500/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 font-mono"
                />
                <button onClick={handleAddSymptom} className="px-3 py-2 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 rounded text-sm transition-colors">
                  Add
                </button>
              </div>
              {newFix.symptoms.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {newFix.symptoms.map((s, i) => (
                    <span key={i} className="flex items-center gap-1 text-xs font-mono px-2 py-1 bg-violet-500/10 border border-violet-500/20 rounded text-violet-300">
                      {s}
                      <button onClick={() => handleRemoveSymptom(i)} className="hover:text-red-400 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-neutral-500 mb-2 font-mono uppercase tracking-wider">Solution *</label>
              <textarea
                value={newFix.solution}
                onChange={(e) => setNewFix({ ...newFix, solution: e.target.value })}
                placeholder="Step-by-step solution..."
                rows={4}
                className="w-full bg-black/50 border border-violet-500/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-500 mb-2 font-mono uppercase tracking-wider">Attach PDF (optional)</label>
              <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border border-violet-500/20 hover:border-violet-500/40 rounded text-sm font-mono transition-colors text-neutral-400 hover:text-neutral-300"
              >
                <Paperclip className="w-4 h-4" />
                {newFix.pdfName || 'Choose PDF file'}
              </button>
              {newFix.pdfName && (
                <button
                  onClick={() => setNewFix({ ...newFix, pdfUrl: '', pdfName: '' })}
                  className="ml-2 text-xs text-neutral-600 hover:text-red-400 transition-colors font-mono"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => { setShowAddForm(false); setShowCustomCategoryInput(false); setCustomCategoryInput(''); setSymptomInput(''); setNewFix({ title: '', category: '', description: '', symptoms: [], solution: '', pdfUrl: '', pdfName: '' }); }}
              className="px-4 py-2 text-sm hover:bg-violet-500/10 rounded border border-violet-500/20 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddFix}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded text-sm font-medium transition-all shadow-lg shadow-violet-500/20"
            >
              Add Fix Guide
            </button>
          </div>
        </div>
      )}

      {filteredFixes.length === 0 ? (
        <div className="border border-violet-500/10 rounded-lg p-12 text-center">
          <BookOpen className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
          <p className="text-neutral-600 font-mono text-sm">
            {fixes.length === 0 ? 'No fix guides yet. Add one to build your knowledge base.' : 'No fixes match your search.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFixes.map(fix => {
            const isExpanded = expandedId === fix.id;
            return (
              <div key={fix.id} className="border border-violet-500/20 bg-gradient-to-br from-black/40 to-violet-950/10 rounded-lg overflow-hidden hover:border-violet-500/30 transition-all">
                <button
                  className="w-full flex items-center justify-between p-4 text-left"
                  onClick={() => setExpandedId(isExpanded ? null : fix.id)}
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4 text-violet-400 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-sm text-violet-300">{fix.title}</div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {fix.category && (
                          <span className="flex items-center gap-1 text-xs font-mono text-neutral-500">
                            <Tag className="w-3 h-3" />{fix.category}
                          </span>
                        )}
                        <span className="text-xs text-neutral-700 font-mono">{formatDate(fix.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {fix.pdfUrl && (
                      <span className="flex items-center gap-1 text-xs font-mono text-violet-400/60 px-2 py-1 bg-violet-500/10 border border-violet-500/20 rounded">
                        <FileText className="w-3 h-3" />PDF
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-violet-500/10 space-y-4 pt-4">
                    {fix.description && (
                      <div>
                        <div className="text-xs text-neutral-500 font-mono uppercase tracking-wider mb-1">Description</div>
                        <p className="text-sm text-neutral-300">{fix.description}</p>
                      </div>
                    )}
                    {fix.symptoms.length > 0 && (
                      <div>
                        <div className="text-xs text-neutral-500 font-mono uppercase tracking-wider mb-2">Symptoms</div>
                        <ul className="space-y-1">
                          {fix.symptoms.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-neutral-400">
                              <span className="text-violet-500 font-mono mt-0.5">›</span>{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-neutral-500 font-mono uppercase tracking-wider mb-2">Solution</div>
                      <div className="bg-black/30 border border-violet-500/10 rounded p-3">
                        <p className="text-sm text-neutral-300 whitespace-pre-wrap">{fix.solution}</p>
                      </div>
                    </div>
                    {fix.pdfUrl && fix.pdfName && (
                      <div>
                        <div className="text-xs text-neutral-500 font-mono uppercase tracking-wider mb-2">Attached Document</div>
                        <a
                          href={fix.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded hover:bg-violet-500/20 transition-colors w-fit text-sm font-mono text-violet-300"
                        >
                          <FileText className="w-4 h-4" />{fix.pdfName}
                        </a>
                      </div>
                    )}
                    <div className="flex justify-end pt-2 border-t border-violet-500/10">
                      <button
                        onClick={() => setFixes(fixes.filter(f => f.id !== fix.id))}
                        className="text-xs text-neutral-600 hover:text-red-400 transition-colors font-mono"
                      >
                        Delete fix
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Combined Shell ───────────────────────────────────────────────────────────

export function Maintenance({ sessionDrones }: MaintenanceProps) {
  const [activeTab, setActiveTab] = useState<InnerTab>('notes');

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-violet-500/10 pb-4">
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-4 py-2 rounded text-sm font-mono transition-all ${
            activeTab === 'notes'
              ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300'
              : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
          }`}
        >
          Maintenance Notes
        </button>
        <button
          onClick={() => setActiveTab('fixes')}
          className={`px-4 py-2 rounded text-sm font-mono transition-all ${
            activeTab === 'fixes'
              ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300'
              : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
          }`}
        >
          Fix Guides
        </button>
      </div>

      {activeTab === 'notes' && <MaintenanceNotes sessionDrones={sessionDrones} />}
      {activeTab === 'fixes' && <FixGuides />}
    </div>
  );
}
