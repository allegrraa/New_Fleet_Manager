import { Link, useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Cpu, X, Plane } from 'lucide-react';
import { mockFleets } from '../data/mockData';
import React, { useState } from 'react';
import type { Fleet } from '../types';

export function FleetSelection() { 
    const [fleets, setFleets] = useState<Fleet[]>(mockFleets);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newFleetName, setNewFleetName] = useState('');
    const navigate = useNavigate();
    
    const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours< 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
    }
    
    const handleCreateFleet = (e:React.FormEvent) => {
        e.preventDefault();
        if (newFleetName.trim()){
            const newFleet: Fleet = {
                id: `fleet-${Date.now()}`,
                name: newFleetName.trim(),
                droneIds: [],
                lastModified: new Date(),
            };
            setFleets([newFleet, ...fleets]);
            navigate(`/fleet/${newFleet.id}`, { state: { newFleet } });
        };
    };

     return (
    <div className="min-h-screen bg-black text-white p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a12_1px,transparent_1px),linear-gradient(to_bottom,#0a0a12_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-50"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="mb-16 text-center">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500/30 flex items-center justify-center relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-cyan-500/20 to-cyan-500/0 rounded-xl animate-pulse"></div>
              <Plane className="w-8 h-8 text-cyan-400 relative z-10" />
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">Drone Fleet Management</h1>
          <p className="text-neutral-400">Select a fleet or create a new drone fleet</p>
        </div>

        <div className="space-y-12">
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full border border-cyan-500/20 hover:border-cyan-500/40 bg-gradient-to-br from-cyan-950/20 to-blue-950/20 rounded-lg p-8 transition-all group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                  <Plus className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-semibold mb-1">Create New Fleet</h2>
                  <p className="text-sm text-neutral-400">Start managing a new drone fleet</p>
                </div>
              </div>
            </button>
          ) : (
            <form onSubmit={handleCreateFleet} className="border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 to-blue-950/20 backdrop-blur-sm rounded-lg p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                    Create New Fleet
                  </h2>
                  <p className="text-sm text-neutral-400">Enter a name for your drone fleet</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewFleetName('');
                  }}
                  className="w-8 h-8 rounded hover:bg-cyan-500/10 flex items-center justify-center transition-colors border border-cyan-500/20"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-cyan-300">Fleet Name</label>
                  <input
                    type="text"
                    value={newFleetName}
                    onChange={(e) => setNewFleetName(e.target.value)}
                    placeholder="e.g., Warehouse Fleet A"
                    className="w-full bg-black/50 border border-cyan-500/20 rounded px-4 py-3 focus:outline-none focus:border-cyan-500/50 transition-colors font-mono"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newFleetName.trim()}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed rounded py-3 font-medium transition-all shadow-lg shadow-cyan-500/20 disabled:shadow-none"
                >
                  Create Fleet
                </button>
              </div>
            </form>
          )}

          <div>
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-cyan-400" />
              Your Fleets
            </h2>
            <div className="space-y-3">
              {fleets.map((fleet) => (
                <Link
                  key={fleet.id}
                  to={`/fleet/${fleet.id}`}
                  className="block border border-cyan-500/10 hover:border-cyan-500/30 bg-gradient-to-r from-black/40 to-cyan-950/10 rounded-lg p-6 transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center group-hover:border-cyan-500/40 transition-colors">
                        <Cpu className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{fleet.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-neutral-400 font-mono">
                          <span className="text-cyan-400">{fleet.droneIds.length}</span>
                          <span className="text-neutral-600">drones</span>
                          <span className="text-neutral-600">•</span>
                          <span>Modified {formatDate(fleet.lastModified)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
