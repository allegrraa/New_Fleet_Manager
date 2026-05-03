/*
 * pages/FleetSelection.tsx
 *
 * Home / landing page of the application.
 *
 * Responsibilities:
 *   - Display all existing fleets in a clickable list.
 *   - Let users create a new fleet (name-only form).
 *   - Let users delete a fleet via a hover-reveal trash icon.
 *   - Persist the fleet list to localStorage so it survives page refreshes.
 *     New fleets created by the user are stored there; if localStorage is empty
 *     the app falls back to the static mockFleets from mockData.ts.
 *
 * Navigation: clicking a fleet card navigates to /fleet/:fleetId (FleetDashboard).
 */

import { Link } from 'react-router-dom';
import { Plus, Cpu, X, Trash2, Radio, Navigation, Wifi, Activity, ChevronRight, Crosshair } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import type { Fleet } from '../types';

/*
 * Attempts to load the fleet list from localStorage.
 * localStorage stores JSON, so Date objects are serialised as ISO strings —
 * we manually rehydrate lastModified back into a real Date after parsing.
 * Falls back to mockFleets if nothing is stored or JSON is malformed.
 */


export function FleetSelection() {
    // loadFleets is passed as an initialiser function (not called immediately)
    // so it only runs once on mount, not on every re-render.
    const [fleets, setFleets] = useState<Fleet[]>([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newFleetName, setNewFleetName] = useState('');
// Fetch fleets from the backend API on component mount, and convert lastModified to Date objects.
    useEffect(() => {
    fetch('http://localhost:3001/api/fleets')
        .then(res => res.json())
        .then(data => setFleets(data.map((f: any) => ({
          ...f,
          lastModified: new Date(f.lastModified),
          droneIds: f.droneIds ? f.droneIds.split(',').filter(Boolean) : [],
        }))))
}, [])

    // Single helper that keeps React state and localStorage in sync at all times.
   const saveFleets = async (updated: Fleet[]) => {
    setFleets(updated);
};


    // Converts an absolute Date into a human-readable relative string for the fleet list.
    const formatDate = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        if (days === 1) return 'Yesterday';
        return `${days}d ago`;
    };

    // e.preventDefault() stops the parent <Link> from navigating when the trash icon is clicked.
    const handleDeleteFleet = async (e: React.MouseEvent, fleetId: string) => {
        e.preventDefault();
        await fetch(`http://localhost:3001/api/fleets/${fleetId}`, { method: 'DELETE' })
        setFleets(fleets.filter(f => f.id !== fleetId))
    }


    const handleCreateFleet = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newFleetName.trim()) {
        const res = await fetch('http://localhost:3001/api/fleets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newFleetName.trim(), droneIds: '' })
        })
        const newFleet = await res.json()
        setFleets([{ ...newFleet, lastModified: new Date(newFleet.lastModified) }, ...fleets])
        setShowCreateForm(false)
        setNewFleetName('')
    }
}


    return (
        <div className="min-h-screen bg-[#06040f] text-white relative overflow-hidden">

            {/* Deep space background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(139,92,246,0.1),transparent)]"></div>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem]"></div>

            {/* Radar sweep — larger & more visible */}
            <div className="absolute top-[-280px] right-[-280px] w-[800px] h-[800px] opacity-[0.12]">
                <div className="w-full h-full rounded-full border border-violet-400"></div>
                <div className="absolute inset-[100px] rounded-full border border-violet-400"></div>
                <div className="absolute inset-[200px] rounded-full border border-violet-400"></div>
                <div className="absolute inset-[300px] rounded-full border border-violet-400"></div>
                <div className="absolute inset-[370px] rounded-full border border-violet-400"></div>
                <div className="absolute top-1/2 left-1/2 w-[2px] h-1/2 bg-gradient-to-b from-violet-400 to-transparent origin-top -translate-x-1/2 animate-spin" style={{ animationDuration: '8s' }}></div>
            </div>

            {/* Large drone silhouette — bottom left */}
            <div className="absolute bottom-[-80px] left-[-80px] w-[580px] h-[580px] opacity-[0.13] pointer-events-none">
                <svg viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    {/* Tapered arms */}
                    <path d="M138 138 L52 52" stroke="#a78bfa" strokeWidth="6" strokeLinecap="round"/>
                    <path d="M162 138 L248 52" stroke="#a78bfa" strokeWidth="6" strokeLinecap="round"/>
                    <path d="M138 162 L52 248" stroke="#a78bfa" strokeWidth="6" strokeLinecap="round"/>
                    <path d="M162 162 L248 248" stroke="#a78bfa" strokeWidth="6" strokeLinecap="round"/>
                    {/* Arm braces */}
                    <path d="M120 120 L60 80" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 4"/>
                    <path d="M180 120 L240 80" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 4"/>
                    <path d="M120 180 L60 220" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 4"/>
                    <path d="M180 180 L240 220" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 4"/>
                    {/* Motor mounts */}
                    <circle cx="52" cy="52" r="6" fill="#a78bfa"/>
                    <circle cx="248" cy="52" r="6" fill="#a78bfa"/>
                    <circle cx="52" cy="248" r="6" fill="#a78bfa"/>
                    <circle cx="248" cy="248" r="6" fill="#a78bfa"/>
                    {/* Rotor outer rings */}
                    <circle cx="52" cy="52" r="34" stroke="#a78bfa" strokeWidth="1.5"/>
                    <circle cx="248" cy="52" r="34" stroke="#a78bfa" strokeWidth="1.5"/>
                    <circle cx="52" cy="248" r="34" stroke="#a78bfa" strokeWidth="1.5"/>
                    <circle cx="248" cy="248" r="34" stroke="#a78bfa" strokeWidth="1.5"/>
                    {/* Rotor inner rings */}
                    <circle cx="52" cy="52" r="20" stroke="#a78bfa" strokeWidth="1"/>
                    <circle cx="248" cy="52" r="20" stroke="#a78bfa" strokeWidth="1"/>
                    <circle cx="52" cy="248" r="20" stroke="#a78bfa" strokeWidth="1"/>
                    <circle cx="248" cy="248" r="20" stroke="#a78bfa" strokeWidth="1"/>
                    {/* Rotor blades — top-left */}
                    <path d="M52 18 Q60 35 52 52 Q44 35 52 18Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M18 52 Q35 44 52 52 Q35 60 18 52Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M52 86 Q44 69 52 52 Q60 69 52 86Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M86 52 Q69 60 52 52 Q69 44 86 52Z" fill="#a78bfa" opacity="0.6"/>
                    {/* Rotor blades — top-right */}
                    <path d="M248 18 Q256 35 248 52 Q240 35 248 18Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M214 52 Q231 44 248 52 Q231 60 214 52Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M248 86 Q240 69 248 52 Q256 69 248 86Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M282 52 Q265 60 248 52 Q265 44 282 52Z" fill="#a78bfa" opacity="0.6"/>
                    {/* Rotor blades — bottom-left */}
                    <path d="M52 214 Q60 231 52 248 Q44 231 52 214Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M18 248 Q35 240 52 248 Q35 256 18 248Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M52 282 Q44 265 52 248 Q60 265 52 282Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M86 248 Q69 256 52 248 Q69 240 86 248Z" fill="#a78bfa" opacity="0.6"/>
                    {/* Rotor blades — bottom-right */}
                    <path d="M248 214 Q256 231 248 248 Q240 231 248 214Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M214 248 Q231 240 248 248 Q231 256 214 248Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M248 282 Q240 265 248 248 Q256 265 248 282Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M282 248 Q265 256 248 248 Q265 240 282 248Z" fill="#a78bfa" opacity="0.6"/>
                    {/* Central body — octagon */}
                    <path d="M125 110 L175 110 L190 125 L190 175 L175 190 L125 190 L110 175 L110 125 Z" stroke="#a78bfa" strokeWidth="2"/>
                    {/* Inner body detail */}
                    <path d="M133 118 L167 118 L182 133 L182 167 L167 182 L133 182 L118 167 L118 133 Z" stroke="#a78bfa" strokeWidth="1" opacity="0.5"/>
                    {/* Camera lens */}
                    <circle cx="150" cy="150" r="14" stroke="#a78bfa" strokeWidth="2"/>
                    <circle cx="150" cy="150" r="8" stroke="#a78bfa" strokeWidth="1.5"/>
                    <circle cx="150" cy="150" r="3" fill="#a78bfa"/>
                    {/* Body detail lines */}
                    <line x1="150" y1="110" x2="150" y2="118" stroke="#a78bfa" strokeWidth="1.5"/>
                    <line x1="150" y1="182" x2="150" y2="190" stroke="#a78bfa" strokeWidth="1.5"/>
                    <line x1="110" y1="150" x2="118" y2="150" stroke="#a78bfa" strokeWidth="1.5"/>
                    <line x1="182" y1="150" x2="190" y2="150" stroke="#a78bfa" strokeWidth="1.5"/>
                    {/* Corner indicators */}
                    <circle cx="125" cy="125" r="2" fill="#a78bfa"/>
                    <circle cx="175" cy="125" r="2" fill="#a78bfa"/>
                    <circle cx="125" cy="175" r="2" fill="#a78bfa"/>
                    <circle cx="175" cy="175" r="2" fill="#a78bfa"/>
                </svg>
            </div>

            {/* Small drone — top right */}
            <div className="absolute top-[15%] right-[3%] w-[220px] h-[220px] opacity-[0.1] pointer-events-none">
                <svg viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <path d="M138 138 L52 52" stroke="#a78bfa" strokeWidth="6" strokeLinecap="round"/>
                    <path d="M162 138 L248 52" stroke="#a78bfa" strokeWidth="6" strokeLinecap="round"/>
                    <path d="M138 162 L52 248" stroke="#a78bfa" strokeWidth="6" strokeLinecap="round"/>
                    <path d="M162 162 L248 248" stroke="#a78bfa" strokeWidth="6" strokeLinecap="round"/>
                    <circle cx="52" cy="52" r="6" fill="#a78bfa"/>
                    <circle cx="248" cy="52" r="6" fill="#a78bfa"/>
                    <circle cx="52" cy="248" r="6" fill="#a78bfa"/>
                    <circle cx="248" cy="248" r="6" fill="#a78bfa"/>
                    <circle cx="52" cy="52" r="34" stroke="#a78bfa" strokeWidth="1.5"/>
                    <circle cx="248" cy="52" r="34" stroke="#a78bfa" strokeWidth="1.5"/>
                    <circle cx="52" cy="248" r="34" stroke="#a78bfa" strokeWidth="1.5"/>
                    <circle cx="248" cy="248" r="34" stroke="#a78bfa" strokeWidth="1.5"/>
                    <circle cx="52" cy="52" r="20" stroke="#a78bfa" strokeWidth="1"/>
                    <circle cx="248" cy="52" r="20" stroke="#a78bfa" strokeWidth="1"/>
                    <circle cx="52" cy="248" r="20" stroke="#a78bfa" strokeWidth="1"/>
                    <circle cx="248" cy="248" r="20" stroke="#a78bfa" strokeWidth="1"/>
                    <path d="M52 18 Q60 35 52 52 Q44 35 52 18Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M18 52 Q35 44 52 52 Q35 60 18 52Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M52 86 Q44 69 52 52 Q60 69 52 86Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M86 52 Q69 60 52 52 Q69 44 86 52Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M248 18 Q256 35 248 52 Q240 35 248 18Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M214 52 Q231 44 248 52 Q231 60 214 52Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M248 86 Q240 69 248 52 Q256 69 248 86Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M282 52 Q265 60 248 52 Q265 44 282 52Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M52 214 Q60 231 52 248 Q44 231 52 214Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M18 248 Q35 240 52 248 Q35 256 18 248Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M52 282 Q44 265 52 248 Q60 265 52 282Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M86 248 Q69 256 52 248 Q69 240 86 248Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M248 214 Q256 231 248 248 Q240 231 248 214Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M214 248 Q231 240 248 248 Q231 256 214 248Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M248 282 Q240 265 248 248 Q256 265 248 282Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M282 248 Q265 256 248 248 Q265 240 282 248Z" fill="#a78bfa" opacity="0.6"/>
                    <path d="M125 110 L175 110 L190 125 L190 175 L175 190 L125 190 L110 175 L110 125 Z" stroke="#a78bfa" strokeWidth="2"/>
                    <circle cx="150" cy="150" r="14" stroke="#a78bfa" strokeWidth="2"/>
                    <circle cx="150" cy="150" r="8" stroke="#a78bfa" strokeWidth="1.5"/>
                    <circle cx="150" cy="150" r="3" fill="#a78bfa"/>
                </svg>
            </div>

            {/* Ambient glows */}
            <div className="absolute top-1/4 left-0 w-72 h-72 bg-violet-500/8 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-purple-600/6 rounded-full blur-3xl"></div>

            <div className="max-w-4xl mx-auto relative z-10 px-8 py-12">

                {/* Header */}
                <div className="mb-14 text-center">
                    <div className="inline-flex items-center gap-2 bg-violet-500/5 border border-violet-500/20 rounded-full px-4 py-1.5 mb-8">
                        <Radio className="w-3 h-3 text-violet-400 animate-pulse" />
                        <span className="text-xs font-mono text-violet-400 tracking-widest uppercase">System Online</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                    </div>

                    <div className="relative inline-block mb-6">
                        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-violet-500/20 flex items-center justify-center relative">
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/5 to-transparent animate-pulse"></div>
                            <div className="absolute -inset-2 rounded-2xl border border-violet-500/10 animate-ping" style={{ animationDuration: '3s' }}></div>
                            <Navigation className="w-9 h-9 text-violet-400 relative z-10" />
                        </div>
                    </div>

                    <h1 className="text-5xl font-bold tracking-tight mb-3">
                        <span className="bg-gradient-to-r from-white via-violet-200 to-violet-400 bg-clip-text text-transparent">Drone Fleet</span>
                        <br />
                        <span className="bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">Command Centre</span>
                    </h1>
                    <p className="text-neutral-500 font-mono text-sm tracking-wider">AUTONOMOUS AERIAL OPERATIONS PLATFORM</p>

                    {/* Live stats strip */}
                    <div className="flex items-center justify-center gap-8 mt-8 text-xs font-mono">
                        <div className="flex items-center gap-2 text-neutral-600">
                            <Cpu className="w-3 h-3 text-violet-500" />
                            <span>{fleets.length} FLEETS ACTIVE</span>
                        </div>
                        <div className="w-px h-4 bg-neutral-800"></div>
                        <div className="flex items-center gap-2 text-neutral-600">
                            <Wifi className="w-3 h-3 text-green-500" />
                            <span>{fleets.reduce((acc, f) => acc + f.droneIds.length, 0)} DRONES LINKED</span>
                        </div>
                        <div className="w-px h-4 bg-neutral-800"></div>
                        <div className="flex items-center gap-2 text-neutral-600">
                            <Activity className="w-3 h-3 text-purple-400" />
                            <span>ALL SYSTEMS NOMINAL</span>
                        </div>
                    </div>
                </div>

                {/* Create fleet button / form */}
                {!showCreateForm ? (
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="w-full mb-10 group relative overflow-hidden rounded-xl border border-violet-500/20 hover:border-violet-400/50 bg-gradient-to-r from-violet-950/20 via-black/40 to-purple-950/20 p-6 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent"></div>
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center group-hover:bg-violet-500/20 group-hover:border-violet-400/50 transition-all">
                                <Plus className="w-6 h-6 text-violet-400" />
                            </div>
                            <div className="text-left flex-1">
                                <h2 className="text-lg font-semibold text-white mb-0.5">Deploy New Fleet</h2>
                                <p className="text-sm text-neutral-500 font-mono">Initialise a new autonomous drone fleet</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-violet-500/40 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
                        </div>
                    </button>
                ) : (
                    <form onSubmit={handleCreateFleet} className="mb-10 rounded-xl border border-violet-500/30 bg-gradient-to-br from-[#0d0818] to-[#090612] relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-400/60 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
                        <div className="p-7">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                                        <Crosshair className="w-4 h-4 text-violet-400" />
                                    </div>
                                    <div>
                                        <h2 className="font-semibold text-white flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></span>
                                            Deploy New Fleet
                                        </h2>
                                        <p className="text-xs text-neutral-500 font-mono mt-0.5">FLEET INITIALISATION PROTOCOL</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setShowCreateForm(false); setNewFleetName(''); }}
                                    className="w-8 h-8 rounded-lg hover:bg-red-500/10 hover:border-red-500/20 border border-neutral-800 flex items-center justify-center transition-all text-neutral-500 hover:text-red-400"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-mono uppercase tracking-wider mb-2 text-violet-400/70">Fleet Designation</label>
                                    <input
                                        type="text"
                                        value={newFleetName}
                                        onChange={(e) => setNewFleetName(e.target.value)}
                                        placeholder="e.g., Alpha Strike Fleet"
                                        className="w-full bg-black/60 border border-violet-500/20 focus:border-violet-400/60 rounded-lg px-4 py-3 text-sm font-mono placeholder:text-neutral-700 focus:outline-none transition-colors text-violet-100"
                                        autoFocus
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!newFleetName.trim()}
                                    className="w-full py-3 rounded-lg font-mono text-sm font-medium tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/20 disabled:shadow-none"
                                >
                                    INITIALISE FLEET
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {/* Fleet list */}
                <div>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-5 bg-gradient-to-b from-violet-400 to-purple-500 rounded-full"></div>
                            <h2 className="text-sm font-mono uppercase tracking-widest text-neutral-400">Active Fleets</h2>
                        </div>
                        <div className="flex-1 h-px bg-gradient-to-r from-violet-500/20 to-transparent"></div>
                        <span className="text-xs font-mono text-neutral-600 border border-neutral-800 rounded px-2 py-0.5">{fleets.length} TOTAL</span>
                    </div>

                    {fleets.length === 0 ? (
                        <div className="rounded-xl border border-neutral-800 bg-black/30 p-12 text-center">
                            <Navigation className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
                            <p className="text-neutral-600 font-mono text-sm">NO FLEETS DEPLOYED</p>
                            <p className="text-neutral-700 text-xs mt-1">Initialise your first fleet above</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {fleets.map((fleet, i) => (
                                <Link
                                    key={fleet.id}
                                    to={`/fleet/${fleet.id}`}
                                    className="group flex items-center gap-5 rounded-xl border border-neutral-800 hover:border-violet-500/30 bg-gradient-to-r from-black/60 to-violet-950/5 hover:to-violet-950/20 p-5 transition-all duration-300 relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/3 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>

                                    <div className="w-8 text-center font-mono text-xs text-neutral-700 group-hover:text-violet-600 transition-colors">
                                        {String(i + 1).padStart(2, '0')}
                                    </div>

                                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-violet-500/20 group-hover:border-violet-400/40 flex items-center justify-center transition-all flex-shrink-0">
                                        <Navigation className="w-5 h-5 text-violet-400" />
                                    </div>

                                    <div className="flex-1 min-w-0 relative z-10">
                                        <div className="font-semibold text-white group-hover:text-violet-100 transition-colors truncate">{fleet.name}</div>
                                        <div className="flex items-center gap-3 mt-1 text-xs font-mono text-neutral-600">
                                            <span className="flex items-center gap-1">
                                                <Cpu className="w-3 h-3 text-violet-600" />
                                                {fleet.droneIds.length} drones
                                            </span>
                                            <span className="text-neutral-800">·</span>
                                            <span>Modified {formatDate(fleet.lastModified)}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 relative z-10 flex-shrink-0">
                                        <div className="flex items-center gap-1.5 text-xs font-mono text-green-500/60">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                            ONLINE
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-neutral-700 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
                                        <button
                                            onClick={(e) => handleDeleteFleet(e, fleet.id)}
                                            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-700 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
