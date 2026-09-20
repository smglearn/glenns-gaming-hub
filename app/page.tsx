'use client';

import { useState, useSyncExternalStore } from 'react';

type Platform = 'PC' | 'Console' | 'Handheld';
type GameStatus = 'Active' | 'Backlog' | 'Completed';

interface GameEntry {
  id: string;
  title: string;
  platform: Platform;
  genre: string;
  status: GameStatus;
  hoursPlayed: number;
  notes: string;
}

const STORAGE_KEY = 'glenns_gaming_hub_v1';

const INITIAL_GAMES: GameEntry[] = [
  {
    id: 'helldivers-2',
    title: 'Helldivers 2',
    platform: 'Console',
    genre: 'Co-op Extraction Shooter',
    status: 'Active',
    hoursPlayed: 1500,
    notes: 'Primary title • Galactic War campaign on PS5',
  },
  {
    id: 'borderlands-4',
    title: 'Borderlands 4',
    platform: 'PC',
    genre: 'Looter Shooter',
    status: 'Active',
    hoursPlayed: 35,
    notes: 'Active PC playthrough',
  },
  {
    id: 'halo-ce',
    title: 'Halo: Combat Evolved',
    platform: 'PC',
    genre: 'Sci-Fi FPS',
    status: 'Active',
    hoursPlayed: 5,
    notes: 'Just started • Pillar of Autumn campaign run',
  },
];

// In-Memory Snapshot & External Store Subscription
let cachedGames: GameEntry[] = INITIAL_GAMES;
let isInitialized = false;
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getGameSnapshot(): GameEntry[] {
  if (!isInitialized && typeof window !== 'undefined') {
    isInitialized = true;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedGames = parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved game data', e);
      }
    }
  }
  return cachedGames;
}

function getServerSnapshot(): GameEntry[] {
  return INITIAL_GAMES;
}

function saveGames(next: GameEntry[]) {
  cachedGames = next;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  listeners.forEach((listener) => listener());
}

export default function GamingHub() {
  const games = useSyncExternalStore(subscribe, getGameSnapshot, getServerSnapshot);

  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState<Platform>('PC');
  const [genre, setGenre] = useState('');
  const [status, setStatus] = useState<GameStatus>('Active');
  const [hoursPlayed, setHoursPlayed] = useState(0);
  const [notes, setNotes] = useState('');

  const handleAddGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newGame: GameEntry = {
      id: crypto.randomUUID(),
      title: title.trim(),
      platform,
      genre: genre.trim() || 'General',
      status,
      hoursPlayed: Number(hoursPlayed) || 0,
      notes: notes.trim(),
    };

    saveGames([newGame, ...games]);
    setTitle('');
    setGenre('');
    setStatus('Active');
    setHoursPlayed(0);
    setNotes('');
    setShowForm(false);
  };

  const updateHours = (id: string, delta: number) => {
    saveGames(
      games.map((g) => (g.id === id ? { ...g, hoursPlayed: Math.max(0, g.hoursPlayed + delta) } : g))
    );
  };

  const deleteGame = (id: string) => {
    saveGames(games.filter((g) => g.id !== id));
  };

  const toggleStatus = (id: string) => {
    const statusCycle: Record<GameStatus, GameStatus> = {
      Active: 'Completed',
      Completed: 'Backlog',
      Backlog: 'Active',
    };
    saveGames(
      games.map((g) => (g.id === id ? { ...g, status: statusCycle[g.status] } : g))
    );
  };

  const filteredGames = games.filter((game) => {
    const pMatch = selectedPlatform === 'All' || game.platform === selectedPlatform;
    const sMatch = selectedStatus === 'All' || game.status === selectedStatus;
    return pMatch && sMatch;
  });

  const totalHours = games.reduce((acc, g) => acc + g.hoursPlayed, 0);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <header className="border-b border-zinc-800/80 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              <h1 className="text-2xl font-bold tracking-tight text-white">Glenn&apos;s Gaming Hub</h1>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Live backlog, active playthrough telemetry, and hardware logs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
            >
              {showForm ? 'Close Entry Form' : '+ Track New Game'}
            </button>
            <div className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 text-right">
              <div className="text-[10px] uppercase font-mono text-zinc-500">Total Logged</div>
              <div className="text-sm font-semibold font-mono text-zinc-200">{totalHours.toLocaleString()} hrs</div>
            </div>
            <div className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 text-right">
              <div className="text-[10px] uppercase font-mono text-zinc-500">Primary Station</div>
              <div className="text-sm font-semibold font-mono text-indigo-400">PS5 + PC Rig</div>
            </div>
          </div>
        </header>

        {/* New Game Form Drawer */}
        {showForm && (
          <form onSubmit={handleAddGame} className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/70 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-200">Log Game Entry</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <label className="text-[11px] font-mono text-zinc-400 block mb-1">Game Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Halo Infinite"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-zinc-400 block mb-1">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as Platform)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="PC">PC</option>
                  <option value="Console">Console</option>
                  <option value="Handheld">Handheld</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-zinc-400 block mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as GameStatus)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Active">Active</option>
                  <option value="Backlog">Backlog</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-zinc-400 block mb-1">Hours Played</label>
                <input
                  type="number"
                  min="0"
                  value={hoursPlayed}
                  onChange={(e) => setHoursPlayed(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-mono text-zinc-400 block mb-1">Genre</label>
                <input
                  type="text"
                  placeholder="e.g. Sci-Fi FPS"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-zinc-400 block mb-1">Target / Current Goal</label>
                <input
                  type="text"
                  placeholder="e.g. Complete campaign run"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition"
              >
                Save to Backlog
              </button>
            </div>
          </form>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500 mr-2 font-mono">Platform:</span>
            {['All', 'PC', 'Console', 'Handheld'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setSelectedPlatform(p)}
                className={`text-xs px-3 py-1 rounded-md transition ${
                  selectedPlatform === p
                    ? 'bg-zinc-100 text-zinc-950 font-semibold'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500 mr-2 font-mono">Status:</span>
            {['All', 'Active', 'Backlog', 'Completed'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedStatus(s)}
                className={`text-xs px-2.5 py-1 rounded-md transition ${
                  selectedStatus === s
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGames.map((game) => (
            <div
              key={game.id}
              className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 transition flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => toggleStatus(game.id)}
                    title="Click to cycle status"
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border transition ${
                      game.status === 'Active'
                        ? 'text-emerald-400 border-emerald-900/50 bg-emerald-950/40 hover:bg-emerald-900/50'
                        : game.status === 'Backlog'
                        ? 'text-amber-400 border-amber-900/50 bg-amber-950/40 hover:bg-amber-900/50'
                        : 'text-indigo-400 border-indigo-900/50 bg-indigo-950/40 hover:bg-indigo-900/50'
                    }`}
                  >
                    {game.status} ↺
                  </button>
                  <span className="text-[11px] font-mono text-zinc-500">{game.platform}</span>
                </div>
                <h3 className="text-base font-semibold text-zinc-100">{game.title}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">{game.genre}</p>
                {game.notes && <p className="text-xs text-zinc-500 mt-2 italic">{game.notes}</p>}
              </div>

              <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs text-zinc-300">{game.hoursPlayed.toLocaleString()} hrs</span>
                  <button
                    type="button"
                    onClick={() => updateHours(game.id, 1)}
                    className="text-[10px] font-mono bg-zinc-800 hover:bg-zinc-700 px-1.5 py-0.5 rounded text-zinc-300 ml-2"
                    title="Add 1 hour session"
                  >
                    +1h
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => deleteGame(game.id)}
                  className="text-xs text-zinc-600 hover:text-rose-400 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}
