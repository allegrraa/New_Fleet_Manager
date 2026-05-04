/*
 * ─────────────────────────────────────────────────────────────────────────────
 * FILE: pages/SessionSelection.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT THIS PAGE DOES:
 *   This page has two jobs:
 *
 *   1. CREATE A NEW FLIGHT SESSION
 *      The user types a session name, ticks which drones to include, optionally
 *      writes some notes, and clicks "Create & Continue". The session is saved
 *      to the database via the backend API, then the user is sent straight to
 *      the Dashboard for that session.
 *
 *   2. SHOW RECENT SESSIONS
 *      Below the create button, every past session for this fleet is listed
 *      (loaded from the database). Clicking a session card re-opens that session
 *      in the Dashboard.
 *
 * HOW THE USER GETS HERE:
 *   The URL looks like /fleet/:fleetId/session/new
 *   e.g. /fleet/abc123/session/new
 *   The :fleetId part is automatically extracted by React Router.
 *
 * DATA FLOW:
 *   - Fleet information is passed from the previous page via navigation state
 *     (so we don't need an extra network request).
 *   - Sessions are fetched fresh from the backend every time this page loads.
 *   - When a new session is created it is saved to the database first, then the
 *     response from the server is used to update the page.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── React core ────────────────────────────────────────────────────────────────
// useState  – lets us store values that, when changed, cause the page to re-draw
// useEffect – lets us run code AFTER the page first appears (e.g. fetch data)
import { useState, useEffect } from 'react';

// ── React Router helpers ──────────────────────────────────────────────────────
// useParams   – reads the :fleetId from the URL
// useNavigate – lets us send the user to a different page in code
// useLocation – reads data that was passed along when navigating to this page
// Link        – an <a> tag that works with React Router (no full page reload)
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';

// ── Icons (lucide-react) ──────────────────────────────────────────────────────
// These are pre-made SVG icons we can drop into the UI like components.
import {
    Plus,           // "+" symbol — used on the "Create New Session" button
    Calendar,       // calendar icon — used in the page header and session cards
    FileText,       // document icon — used on each session card
    TrendingUp,     // upward arrow — shown when ready-drone count improved
    TrendingDown,   // downward arrow — shown when ready-drone count dropped
    ArrowRight,     // "→" — used on hover to indicate a clickable card
    CheckCircle2,   // filled tick circle — shown when a drone is selected
    Circle,         // empty circle — shown when a drone is NOT selected
    ArrowLeft,      // "←" — back button
    Home,           // house icon — home button
    Cpu,            // chip icon — shown in the empty-drones placeholder
} from 'lucide-react';

// ── Static fallback data ──────────────────────────────────────────────────────
// mockRobots  – used as a fallback if drone data wasn't passed via navigation state
// mockFleets  – used as a fallback if fleet data wasn't passed via navigation state
import { mockRobots, mockFleets } from '../data/mockData';

// ── TypeScript types ──────────────────────────────────────────────────────────
// These describe the shape of our data objects so TypeScript can catch mistakes.
// Session – represents one flight session record
// Robot   – represents one drone
import type { Session, Robot } from '../types';

// ── Shared UI component ───────────────────────────────────────────────────────
// StatusBadge renders a colour-coded pill (e.g. "Ready", "OOS") for a drone's status
import { StatusBadge } from '../components/StatusBadge';


// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export function SessionSelection() {

    // ── Read the fleet ID from the URL ────────────────────────────────────────
    // e.g. if the URL is /fleet/abc123/session/new, fleetId = "abc123"
    const { fleetId } = useParams();

    // ── Navigation helper ─────────────────────────────────────────────────────
    // Call navigate('/some/path') to send the user to a different page
    const navigate = useNavigate();

    // ── Location (reads data passed from the previous page) ───────────────────
    // When FleetDashboard sends the user here it also passes fleet + drone data
    // in location.state so we don't need to re-fetch them.
    const location = useLocation();

    // ── Fleet object ──────────────────────────────────────────────────────────
    // Prefer data from navigation state (faster, no network).
    // Fall back to searching the local mock list if state is missing (e.g. direct URL access).
    const fleet = location.state?.fleet || mockFleets.find(f => f.id === fleetId);

    // ── State: list of sessions for this fleet ────────────────────────────────
    // Starts empty; filled by the useEffect below once the backend responds.
    const [sessions, setSessions] = useState<Session[]>([]);

    // ── State: whether the "create new session" form is expanded ─────────────
    // false = show the big "Create New Session" button
    // true  = show the form with inputs
    const [showCreateForm, setShowCreateForm] = useState(false);

    // ── State: the data the user is typing into the create-session form ───────
    // sessionNumber   – the name/ID the user gives the session (e.g. "2026-04-14")
    // notes           – optional free-text notes
    // selectedDroneIds – list of drone IDs the user has ticked
    const [newSession, setNewSession] = useState({
        sessionNumber: '',
        notes: '',
        selectedDroneIds: [] as string[],   // typed as an array of strings
    });


    // ── Guard: if the fleet wasn't found, show an error and stop rendering ────
    // This protects the rest of the component from crashing on undefined values.
    if (!fleet) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                Fleet not found
            </div>
        );
    }


    // ── Drones that belong to this fleet ─────────────────────────────────────
    // Prefer drones passed via navigation state (they may include newly added drones
    // that haven't been saved to the database yet).
    // Fall back to filtering the global mockRobots list by drone IDs on the fleet.
    const fleetDrones: Robot[] = location.state?.fleetDrones
        || mockRobots.filter(r => fleet.droneIds.includes(r.id));

    // ── Drones the user has currently ticked in the form ─────────────────────
    // Filters the full fleet drone list down to only the ones the user selected.
    const selectedDrones = fleetDrones.filter(r => newSession.selectedDroneIds.includes(r.id));


    // ── EFFECT: Fetch sessions from the backend when the page loads ───────────
    // useEffect with [fleetId] means: run this code whenever fleetId changes
    // (in practice this runs once when the page first appears).
    useEffect(() => {
        // If there's no fleet ID in the URL, do nothing
        if (!fleetId) return;

        // Ask the backend for all sessions belonging to this fleet
        fetch(`http://localhost:3001/api/sessions/${fleetId}`)
            .then(r => r.json())    // parse the response body as JSON
            .then((data: any[]) => {
                // The backend returns raw data; we convert it into proper Session objects.
                // The key conversion is:
                //   - date strings → JavaScript Date objects
                //   - selectedDroneIds stored as "id1,id2,id3" → split into an array
                const mapped: Session[] = data.map(s => ({
                    id: s.id,
                    sessionNumber: s.sessionNumber,
                    date: new Date(s.date),                                         // string → Date
                    fleetId: s.fleetId,
                    selectedDroneIds: s.selectedDroneIds
                        ? s.selectedDroneIds.split(',').filter(Boolean)             // "a,b,c" → ["a","b","c"], filter(Boolean) removes empty strings
                        : [],
                    totalDrones: s.totalDrones,
                    ready: s.ready,
                    reqAttention: s.reqAttention,
                    oos: s.oos,
                    notes: s.notes,
                }));

                // Store the fetched sessions in state so they appear in the UI
                setSessions(mapped);
            })
            .catch(console.error);  // if the request fails, log the error to the browser console
    }, [fleetId]); // only re-run if fleetId changes


    // ── FUNCTION: Toggle a drone in/out of the selection list ─────────────────
    // Called when the user clicks a drone button in the form.
    // If the drone is already selected → deselect it (remove from array).
    // If the drone is not selected    → select it (add to array).
    const toggleDroneSelection = (droneId: string) => {
        if (newSession.selectedDroneIds.includes(droneId)) {
            // Remove the droneId from the list using filter (keep everything except this id)
            setNewSession({
                ...newSession,
                selectedDroneIds: newSession.selectedDroneIds.filter(id => id !== droneId),
            });
        } else {
            // Add the droneId to the end of the list using spread (...)
            setNewSession({
                ...newSession,
                selectedDroneIds: [...newSession.selectedDroneIds, droneId],
            });
        }
    };


    // ── FUNCTION: Calculate a percentage, safely avoiding division by zero ────
    // e.g. getPercentage(3, 10) → 30
    //      getPercentage(0, 0)  → 0  (instead of NaN)
    const getPercentage = (count: number, total: number) =>
        total === 0 ? 0 : Math.round((count / total) * 100);


    // ── Live status snapshot of the currently selected drones ─────────────────
    // This is recalculated every render so the preview always reflects the
    // current tick state before the user submits.
    const currentStats = {
        total: selectedDrones.length,                                               // how many drones are ticked
        ready: selectedDrones.filter(d => d.status === 'ready').length,             // count of 'ready' drones
        reqAttention: selectedDrones.filter(d => d.status === 'req-attention').length, // count needing attention
        oos: selectedDrones.filter(d => d.status === 'oos').length,                 // count out-of-service
    };


    // ── FUNCTION: Create a new session and save it to the database ────────────
    // 'async' means this function can use 'await' to wait for network responses
    // without freezing the browser.
    const handleCreateSession = async () => {

        // If the user hasn't typed a session number yet, do nothing
        if (!newSession.sessionNumber) return;

        // Build the data object we will send to the backend.
        // Notes:
        //   - date is serialised as an ISO string (e.g. "2026-04-14T08:00:00.000Z")
        //     because JSON doesn't have a native Date type.
        //   - selectedDroneIds is joined into a comma-separated string because that
        //     is how the database column stores it (SQLite doesn't have arrays).
        const sessionData = {
            sessionNumber: newSession.sessionNumber,
            date: new Date().toISOString(),                         // current date/time as a string
            fleetId: fleetId || '',
            selectedDroneIds: newSession.selectedDroneIds.join(','), // ["a","b"] → "a,b"
            totalDrones: currentStats.total,
            ready: currentStats.ready,
            reqAttention: currentStats.reqAttention,
            oos: currentStats.oos,
            notes: newSession.notes,
        };

        // Send a POST request to the backend to create the session in the database.
        // 'await' pauses here until the server responds.
        const res = await fetch('http://localhost:3001/api/sessions', {
            method: 'POST',                                         // POST = create a new record
            headers: { 'Content-Type': 'application/json' },        // tell the server we're sending JSON
            body: JSON.stringify(sessionData),                      // convert the JS object to a JSON string
        });

        // Parse the server's response — this is the newly created session record
        // including the database-generated id.
        const created = await res.json();

        // Convert the raw server response back into a proper Session object
        // (same conversion as in the useEffect above).
        const session: Session = {
            id: created.id,                         // the real database ID (e.g. "clxxxxxxx")
            sessionNumber: created.sessionNumber,
            date: new Date(created.date),           // string → Date
            fleetId: created.fleetId,
            selectedDroneIds: created.selectedDroneIds
                ? created.selectedDroneIds.split(',').filter(Boolean)
                : [],
            totalDrones: created.totalDrones,
            ready: created.ready,
            reqAttention: created.reqAttention,
            oos: created.oos,
            notes: created.notes,
        };

        // Add the new session to the top of the list in state so it appears immediately
        // in "Recent Sessions" without needing a page reload.
        setSessions([session, ...sessions]);

        // Navigate the user straight to the Dashboard for this new session.
        // We pass session, drone, and fleet data in navigation state so the Dashboard
        // doesn't need to make extra network requests.
        navigate(`/fleet/${fleetId}/session/${session.id}`, {
            state: { session, fleetDrones, fleet },
        });
    };


    // ── FUNCTION: Open an existing session ────────────────────────────────────
    // Called when the user clicks one of the Recent Sessions cards.
    // Navigates to the Dashboard for that session, passing data in state.
    const handleSessionSelect = (session: Session) => {
        navigate(`/fleet/${fleetId}/session/${session.id}`, {
            state: { session, fleetDrones, fleet },
        });
    };


    // ── FUNCTION: Format a Date object into a readable string ─────────────────
    // e.g. new Date("2026-04-14T09:00:00") → "Apr 14, 2026, 09:00 AM"
    const formatDate = (date: Date) => {
        return date.toLocaleString('en-US', {
            month: 'short',     // e.g. "Apr"
            day: 'numeric',     // e.g. "14"
            year: 'numeric',    // e.g. "2026"
            hour: '2-digit',    // e.g. "09"
            minute: '2-digit',  // e.g. "00"
        });
    };


    // ══════════════════════════════════════════════════════════════════════════
    // RENDER (the HTML/JSX that gets shown in the browser)
    // ══════════════════════════════════════════════════════════════════════════
    return (
        // Outermost wrapper — full-screen black background with padding
        <div className="min-h-screen bg-black text-white p-8 relative overflow-hidden">

            {/* ── Decorative background grid lines ─────────────────────────── */}
            {/* These are purely visual — a subtle grid pattern behind the content */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a12_1px,transparent_1px),linear-gradient(to_bottom,#0a0a12_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-50"></div>

            {/* ── Decorative glow blobs ─────────────────────────────────────── */}
            {/* Large, blurred, semi-transparent circles that create a glow effect */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>

            {/* ── Main content container (centred, max 4xl wide) ────────────── */}
            {/* relative z-10 puts this above the decorative background elements */}
            <div className="max-w-4xl mx-auto relative z-10">

                {/* ── Top navigation bar (Back button, Home button, fleet name) ── */}
                <div className="mb-8 flex items-center gap-4">

                    {/* Back button — goes to the previous page in browser history */}
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded border border-violet-500/20 flex items-center justify-center hover:bg-violet-500/10 hover:border-violet-500/40 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5 text-violet-400" />
                    </button>

                    {/* Home button — always takes the user back to the root "/" page */}
                    <Link
                        to="/"
                        className="w-10 h-10 rounded border border-violet-500/20 flex items-center justify-center hover:bg-violet-500/10 hover:border-violet-500/40 transition-all"
                        title="Home"
                    >
                        <Home className="w-5 h-5 text-violet-400" />
                    </Link>

                    {/* Fleet name and sub-label */}
                    <div>
                        {/* Show the fleet name passed via navigation state, or fall back to fleet.name */}
                        <h2 className="text-lg font-semibold text-violet-300">
                            {location.state?.fleetName || fleet.name}
                        </h2>
                        <p className="text-sm text-neutral-500">Create or select a flight session</p>
                    </div>
                </div>


                {/* ── Page hero / title area ────────────────────────────────── */}
                <div className="mb-12 text-center">
                    {/* Animated calendar icon in a glowing box */}
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border-2 border-violet-500/30 flex items-center justify-center relative group">
                            {/* Pulsing glow overlay inside the icon box */}
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 via-violet-500/20 to-violet-500/0 rounded-xl animate-pulse"></div>
                            <Calendar className="w-8 h-8 text-violet-400 relative z-10" />
                        </div>
                    </div>
                    {/* Large gradient title */}
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent mb-2">
                        Flight Session
                    </h1>
                    <p className="text-neutral-400">Select drones for your flight session</p>
                </div>


                {/* ── Main content area ─────────────────────────────────────── */}
                <div className="space-y-6">

                    {/*
                     * ── CREATE SESSION SECTION ──────────────────────────────
                     * If showCreateForm is false → show the "Create New Session" button.
                     * If showCreateForm is true  → show the full form.
                     * The ternary operator (condition ? A : B) handles this toggle.
                     */}
                    {!showCreateForm ? (

                        /* ── Collapsed state: big clickable "Create New Session" card ── */
                        <button
                            onClick={() => setShowCreateForm(true)}  // expand the form
                            className="w-full border border-violet-500/20 hover:border-violet-500/40 bg-gradient-to-br from-violet-950/20 to-purple-950/20 rounded-lg p-8 transition-all group relative overflow-hidden"
                        >
                            {/* Shine/sweep animation that plays on hover */}
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-violet-500/5 to-violet-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

                            <div className="flex items-center gap-4 relative z-10">
                                {/* + icon box */}
                                <div className="w-12 h-12 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                                    <Plus className="w-6 h-6 text-violet-400" />
                                </div>

                                {/* Text labels */}
                                <div className="text-left flex-1">
                                    <h2 className="text-xl font-semibold mb-1">Create New Session</h2>
                                    <p className="text-sm text-neutral-400">
                                        Start a new flight session with current drone status
                                    </p>
                                </div>

                                {/* Arrow icon that fades in on hover */}
                                <ArrowRight className="w-6 h-6 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </button>

                    ) : (

                        /* ── Expanded state: the full create-session form ──── */
                        <div className="border border-violet-500/20 bg-gradient-to-br from-violet-950/20 to-purple-950/20 rounded-lg p-8 relative overflow-hidden">
                            {/* Decorative top-border gradient line */}
                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"></div>

                            {/* Form title with a pulsing dot */}
                            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></span>
                                New Session
                            </h3>

                            <div className="space-y-4">

                                {/* ── Input: Session Number / ID ──────────────── */}
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-violet-300">
                                        Session Number / ID
                                    </label>
                                    <input
                                        type="text"
                                        value={newSession.sessionNumber}
                                        // Update sessionNumber in state every time the user types
                                        onChange={(e) => setNewSession({ ...newSession, sessionNumber: e.target.value })}
                                        placeholder="e.g., 2026-04-10 or Session-01"
                                        className="w-full bg-black/50 border border-violet-500/20 rounded px-4 py-3 focus:outline-none focus:border-violet-500/50 transition-colors font-mono"
                                        autoFocus  // keyboard focus jumps here when the form opens
                                    />
                                </div>

                                {/* ── Drone selection grid ────────────────────── */}
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-violet-300">
                                        {/* Shows a live count of how many drones are selected vs. total */}
                                        Select Drones for Flight ({newSession.selectedDroneIds.length} of {fleetDrones.length} selected)
                                    </label>

                                    {/* Only show the grid if this fleet has drones */}
                                    {fleetDrones.length > 0 ? (

                                        /* Scrollable container for the drone buttons */
                                        <div className="bg-black/40 border border-violet-500/10 rounded-lg p-4 max-h-64 overflow-y-auto">
                                            {/* 2-column grid of drone toggle buttons */}
                                            <div className="grid grid-cols-2 gap-2">
                                                {fleetDrones.map(drone => {
                                                    // Is this particular drone currently ticked?
                                                    const isSelected = newSession.selectedDroneIds.includes(drone.id);
                                                    return (
                                                        <button
                                                            key={drone.id}      // React needs a unique key for list items
                                                            type="button"       // prevents accidental form submission
                                                            onClick={() => toggleDroneSelection(drone.id)}
                                                            // Highlighted style when selected, muted style when not
                                                            className={`flex items-center gap-3 p-3 rounded transition-all text-left ${
                                                                isSelected
                                                                    ? 'bg-violet-500/20 border border-violet-500/40'
                                                                    : 'bg-black/40 border border-violet-500/10 hover:border-violet-500/30'
                                                            }`}
                                                        >
                                                            {/* Tick icon (filled) when selected, empty circle when not */}
                                                            {isSelected ? (
                                                                <CheckCircle2 className="w-5 h-5 text-violet-400 flex-shrink-0" />
                                                            ) : (
                                                                <Circle className="w-5 h-5 text-neutral-600 flex-shrink-0" />
                                                            )}

                                                            <div className="flex-1 min-w-0">
                                                                {/* Drone name — truncated if too long */}
                                                                <div className="font-semibold text-sm text-violet-300 truncate">
                                                                    {drone.name}
                                                                </div>
                                                                {/* Coloured status pill (e.g. "Ready", "OOS") */}
                                                                <StatusBadge status={drone.status} />
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                    ) : (

                                        /* Empty state — shown when the fleet has no drones */
                                        <div className="bg-black/40 border border-violet-500/10 rounded-lg p-8 text-center">
                                            <Cpu className="w-10 h-10 text-violet-400/30 mx-auto mb-3" />
                                            <p className="text-sm text-neutral-500 mb-2">No drones in this fleet yet</p>
                                            <p className="text-xs text-neutral-600">
                                                Add drones to your fleet first, then create a flight session
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* ── Textarea: Optional notes ────────────────── */}
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-violet-300">
                                        Notes (Optional)
                                    </label>
                                    <textarea
                                        value={newSession.notes}
                                        // Update notes in state every time the user types
                                        onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
                                        placeholder="Add session notes..."
                                        rows={2}    // 2 lines tall by default
                                        className="w-full bg-black/50 border border-violet-500/20 rounded px-4 py-3 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                                    />
                                </div>

                                {/*
                                 * ── Status snapshot preview ──────────────────
                                 * Only shown when at least one drone is ticked.
                                 * Gives the user a preview of what the session
                                 * stats will look like before they hit "Create".
                                 */}
                                {newSession.selectedDroneIds.length > 0 && (
                                    <div className="bg-black/40 border border-violet-500/10 rounded-lg p-4">
                                        <div className="text-xs text-neutral-500 mb-3 font-mono uppercase tracking-wider">
                                            Selected Drones Status Snapshot
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 text-sm">
                                            {/* Ready count + percentage */}
                                            <div>
                                                <span className="text-neutral-500">Ready:</span>
                                                <span className="ml-2 text-green-400 font-mono">
                                                    {currentStats.ready} ({getPercentage(currentStats.ready, currentStats.total)}%)
                                                </span>
                                            </div>
                                            {/* Req Attention count + percentage */}
                                            <div>
                                                <span className="text-neutral-500">Req Attention:</span>
                                                <span className="ml-2 text-red-400 font-mono">
                                                    {currentStats.reqAttention} ({getPercentage(currentStats.reqAttention, currentStats.total)}%)
                                                </span>
                                            </div>
                                            {/* OOS count + percentage */}
                                            <div>
                                                <span className="text-neutral-500">OOS:</span>
                                                <span className="ml-2 text-neutral-400 font-mono">
                                                    {currentStats.oos} ({getPercentage(currentStats.oos, currentStats.total)}%)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── Form action buttons (Cancel / Create & Continue) ── */}
                            <div className="flex justify-end gap-3 mt-6">

                                {/* Cancel — hides the form and resets all form fields */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        setNewSession({ sessionNumber: '', notes: '', selectedDroneIds: [] });
                                    }}
                                    className="px-6 py-3 text-sm hover:bg-violet-500/10 rounded transition-colors border border-violet-500/20"
                                >
                                    Cancel
                                </button>

                                {/* Create & Continue — disabled until the user types a session number */}
                                <button
                                    onClick={handleCreateSession}
                                    disabled={!newSession.sessionNumber}    // grey out if no name typed yet
                                    className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed rounded text-sm font-medium transition-all shadow-lg shadow-violet-500/20 disabled:shadow-none flex items-center gap-2"
                                >
                                    Create & Continue
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}


                    {/* ── RECENT SESSIONS SECTION ──────────────────────────── */}
                    <div>
                        {/* Section heading */}
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-violet-400" />
                            Recent Sessions
                        </h3>

                        {/*
                         * If there are no sessions yet (empty array), show a placeholder message.
                         * Otherwise, render a card for each session.
                         */}
                        {sessions.length === 0 ? (

                            /* Empty state */
                            <div className="border border-violet-500/10 rounded-lg p-8 text-center text-neutral-600 font-mono">
                                No sessions yet
                            </div>

                        ) : (

                            /* List of session cards */
                            <div className="space-y-3">
                                {sessions.map(session => {

                                    // Calculate what percentage of drones were "ready" in this session
                                    const readyPercentage = getPercentage(session.ready, session.totalDrones);

                                    // Compare this session's ready count to the one below it in the list
                                    // (sessions are newest-first, so the one below is older)
                                    const lastSession = sessions[sessions.indexOf(session) + 1];

                                    // positive trend = more drones were ready, negative = fewer
                                    const trend = lastSession ? session.ready - lastSession.ready : 0;

                                    return (
                                        /* Each session is a clickable button that opens the session Dashboard */
                                        <button
                                            key={session.id}
                                            onClick={() => handleSessionSelect(session)}
                                            className="w-full border border-violet-500/20 hover:border-violet-500/40 bg-gradient-to-r from-black/40 to-violet-950/10 rounded-lg p-5 transition-all text-left group"
                                        >
                                            {/* ── Card header: icon + session name + trend arrow ── */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3 flex-1">

                                                    {/* Document icon box */}
                                                    <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                                                        <FileText className="w-5 h-5 text-violet-400" />
                                                    </div>

                                                    <div>
                                                        {/* Session name/number in large text */}
                                                        <div className="font-semibold text-violet-300 text-lg">
                                                            {session.sessionNumber}
                                                        </div>
                                                        {/* Date + drone count in small monospace text */}
                                                        <div className="flex items-center gap-2 text-xs text-neutral-600 font-mono">
                                                            <Calendar className="w-3 h-3" />
                                                            {formatDate(session.date)}
                                                            <span className="text-neutral-700">•</span>
                                                            <span>{session.selectedDroneIds.length} drones</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right side: trend indicator + hover arrow */}
                                                <div className="flex items-center gap-4">

                                                    {/* Trend badge — only shown if the ready count changed */}
                                                    {trend !== 0 && (
                                                        <div className={`flex items-center gap-1 text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            {/* Up arrow if improved, down arrow if worse */}
                                                            {trend > 0
                                                                ? <TrendingUp className="w-4 h-4" />
                                                                : <TrendingDown className="w-4 h-4" />
                                                            }
                                                            {/* Show the magnitude of the change (always positive) */}
                                                            <span>{Math.abs(trend)}</span>
                                                        </div>
                                                    )}

                                                    {/* Arrow that fades in when hovering the card */}
                                                    <ArrowRight className="w-5 h-5 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </div>

                                            {/* ── Status percentage boxes ───────────────────── */}
                                            <div className="grid grid-cols-3 gap-2 text-xs mb-3">

                                                {/* Ready % */}
                                                <div className="bg-black/40 rounded px-3 py-2 border border-green-500/20">
                                                    <div className="text-neutral-600 mb-1">Ready</div>
                                                    <div className="text-green-400 font-mono text-sm">{readyPercentage}%</div>
                                                </div>

                                                {/* Req Attention % */}
                                                <div className="bg-black/40 rounded px-3 py-2 border border-red-500/20">
                                                    <div className="text-neutral-600 mb-1">Req Attention</div>
                                                    <div className="text-red-400 font-mono text-sm">
                                                        {getPercentage(session.reqAttention, session.totalDrones)}%
                                                    </div>
                                                </div>

                                                {/* OOS % */}
                                                <div className="bg-black/40 rounded px-3 py-2 border border-neutral-500/20">
                                                    <div className="text-neutral-600 mb-1">OOS</div>
                                                    <div className="text-neutral-400 font-mono text-sm">
                                                        {getPercentage(session.oos, session.totalDrones)}%
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Session notes — only shown if notes were written */}
                                            {session.notes && (
                                                <div className="text-xs text-neutral-400 italic">{session.notes}</div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
