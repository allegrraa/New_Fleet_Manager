A web-based drone fleet management dashboard built with React, TypeScript, and Vite.
Operators can organise drones into named fleets, create pre-flight check sessions,
log and resolve in-flight alerts, and track per-drone status at a glance

> All data is mock / in-memory. Fleets are persisted to `localStorage` in the browser;
> everything else (drones, alerts, sessions) resets on page refresh. There is no backend.

## Prerequisites 
- **Node.js 18 or later** - https://nodejs.org
- **npm** (bundled with Node.js)

Verify your version:
```bash
node -v   # should be >= 18.0.0
npm -v
```
---

## Installation

```bash
# Clone or download the repository, then:
cd New_Fleet_Manager
npm install
```

---

## Running the Development Server

```bash
npm run dev
```
Open your browser at **http://localhost:5173**

The dev server supports Hot Module Replacement (HMR) — changes to source files are
reflected in the browser instantly without a full page reload.

---
---

## Building for Production

```bash
npm run build
```

Output is written to `dist/`. You can preview the production build locally with:

```bash
npm run preview
```

---
## Tech Stack

| Technology | Version | Role |
|---|---|---|
| React | 18 / 19 | UI component framework |
| TypeScript | ~6.0 | Static typing |
| Vite | ^8 | Build tool and dev server |
| Tailwind CSS | ^4 | Utility-first styling (via `@tailwindcss/vite` plugin) |
| React Router | ^7 | Client-side routing |
| Lucide React | ^1 | Icon library |

---

## Project Structure

```
src/
├── main.tsx              # Entry point — mounts React onto #root
├── App.tsx               # Root component — hands off to RouterProvider
├── Routes.tsx            # All URL routes defined in one place
│
├── types/
│   └── index.ts          # All TypeScript interfaces and union types
│
├── data/
│   └── mockData.ts       # Static mock fleets, drones, alerts, and sessions
│
├── pages/
│   ├── FleetSelection.tsx   # / — home page: list, create, delete fleets
│   ├── FleetDashboard.tsx   # /fleet/:fleetId — fleet drone list + flight logs
│   ├── SessionSelection.tsx # /fleet/:id/session/new — create or pick a session
│   ├── Dashboard.tsx        # /fleet/:id/session/:sid — session overview + events
│   └── RobotHistory.tsx     # /fleet/:id/robot/:rid — per-drone history (stub)
│
└── components/
    ├── StatusBadge.tsx   # Reusable colour-coded status / severity pill badge
    ├── Overview.tsx      # "Overview" tab: drone cards with stats and alerts
    └── Events.tsx        # "Events" tab: alert table with filters and add form
```

---

## Key Features

- **Fleet management** — create and delete named fleets; list persists across
  browser sessions via `localStorage`.
- **Drone roster** — view all drones in a fleet with colour-coded status badges
  (Ready / Warning / Critical / Offline / Maintenance Due). Add or remove drones
  manually within a session.
- **Flight sessions** — create a session by selecting drones and naming it. A
  status snapshot is captured at creation time and stored on the session so
  historical records stay accurate even as drone statuses change later.
- **Session dashboard** — tabbed view per session:
  - *Overview* — summary stat cards, active-alerts banner, expandable drone cards.
  - *Events* — sortable, filterable alert table. Add new events, mark them resolved,
    or delete them.
- **Global search** — search bar in the session dashboard searches drones and
  events simultaneously and overlays inline results, overriding the active tab.
- **Auto-promoting custom labels** — custom alert categories and problem
  descriptions typed by the user are automatically added to the permanent dropdown
  after being used 10 times (tracked in `Events.tsx`).

---

## Data Notes

- **No backend** — all data lives in `src/data/mockData.ts` as static arrays.
- **Fleet persistence** — the fleet list is saved to and loaded from
  `localStorage` (key: `"fleets"`). All other data (drones, alerts, sessions) is
  ephemeral and resets on page reload.
- **Date rehydration** — `Date` instances are serialised as ISO strings in
  `localStorage` and re-hydrated back into `Date` objects when read. This is
  handled inside the `loadFleets()` helper in `FleetSelection.tsx` and
  `FleetDashboard.tsx`.

---

## Page Navigation Map

```
/                                  FleetSelection    — choose or create a fleet
/fleet/:fleetId                    FleetDashboard    — drones + flight log
/fleet/:fleetId/session/new        SessionSelection  — select drones, name session
/fleet/:fleetId/session/:sessionId Dashboard         — overview + events tabs
/fleet/:fleetId/robot/:robotId     RobotHistory      — per-drone history (stub)
```
=======


