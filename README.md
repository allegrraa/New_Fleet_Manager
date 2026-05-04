# Fleet Manager

A web application for managing drone fleets — track drone statuses, log flight sessions, record events, and manage maintenance notes.

---

## Table of Contents

1. [What You Need Before Starting](#1-what-you-need-before-starting)
2. [Project Structure](#2-project-structure)
3. [Getting the Code](#3-getting-the-code)
4. [Setting Up the Backend](#4-setting-up-the-backend)
5. [Setting Up the Frontend](#5-setting-up-the-frontend)
6. [Running the App](#6-running-the-app)
7. [Loading Drone Data (Optional)](#7-loading-drone-data-optional)
8. [Tech Stack](#8-tech-stack)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. What You Need Before Starting

Install these on your machine before doing anything else.

| Tool | Minimum Version | How to Check | Download |
|------|----------------|-------------|----------|
| **Node.js** | v18 or higher | `node -v` | https://nodejs.org |
| **npm** | v9 or higher | `npm -v` | Comes with Node.js |
| **Git** | any | `git --version` | https://git-scm.com |

> **Windows users:** All commands below work in Command Prompt, PowerShell, or Windows Terminal. They work the same on Mac/Linux Terminal.

---

## 2. Project Structure

```
New_Fleet_Manager/
│
├── src/                        ← Frontend source code (React)
│   ├── pages/                  ← Full pages (FleetSelection, Dashboard, etc.)
│   ├── components/             ← Reusable UI pieces (Events, Maintenance, etc.)
│   ├── data/                   ← Static fallback mock data
│   └── types/                  ← TypeScript type definitions
│
├── backend/                    ← Backend source code (Node.js + Express)
│   ├── src/
│   │   ├── index.ts            ← Backend entry point (starts the server)
│   │   ├── routes/             ← API route handlers (sessions, events, etc.)
│   │   └── seed.ts             ← Script to load drone data from CSV
│   └── prisma/
│       ├── schema.prisma       ← Database table definitions
│       ├── drones.csv          ← Drone data to import (edit this with your data)
│       └── dev.db              ← SQLite database file (auto-created, not on Git)
│
├── package.json                ← Frontend dependencies
└── README.md                   ← This file
```

---

## 3. Getting the Code

Open a terminal, navigate to where you want to put the project, and clone it:

```bash
git clone <your-repo-url>
cd New_Fleet_Manager
```

> Replace `<your-repo-url>` with the actual GitHub/GitLab URL of the repository.

---

## 4. Setting Up the Backend

The backend is a Node.js server that handles saving and loading data from the database. It lives in the `backend/` folder and runs separately from the frontend.

### Step 1 — Install backend dependencies

```bash
cd backend
npm install
```

This reads `backend/package.json` and downloads all required packages into `backend/node_modules/`.

### Step 2 — Create the environment file

The backend needs a `.env` file to know where the database is. This file is **not included in Git** (it is listed in `.gitignore`) so you must create it yourself.

Inside the `backend/` folder, create a new file called `.env` and paste in exactly this:

```
DATABASE_URL="file:./prisma/dev.db"
```

> This tells the app to use a local SQLite database file stored at `backend/prisma/dev.db`.
> SQLite is a simple file-based database — no separate database server software is needed.

### Step 3 — Create the database

This command reads `backend/prisma/schema.prisma` and creates all the database tables:

```bash
npx prisma db push
```

You should see output ending with:
```
Your database is now in sync with your Prisma schema.
```

A file called `dev.db` will appear inside `backend/prisma/`. This is your database.

### Step 4 — Generate the Prisma client

This generates the TypeScript code that lets the backend talk to the database:

```bash
npx prisma generate
```

> **Note:** Steps 3 and 4 only need to be done once on first setup, or again if someone changes `schema.prisma`.

---

## 5. Setting Up the Frontend

Open a **new terminal window** (keep the backend terminal open), navigate back to the root project folder, and install the frontend dependencies:

```bash
cd New_Fleet_Manager
npm install
```

This downloads everything the React frontend needs.

---

## 6. Running the App

You need **two terminals running at the same time** — one for the backend server and one for the frontend dev server.

### Terminal 1 — Start the backend

```bash
cd backend
npm run dev
```

You should see:
```
Server is running on port 3001
```

The backend is now live at `http://localhost:3001`. Leave this terminal open.

### Terminal 2 — Start the frontend

In a separate terminal, from the root project folder:

```bash
npm run dev
```

You should see:
```
  VITE v8.x.x  ready in ~300ms

  ➜  Local:   http://localhost:5173/
```

Open `http://localhost:5173` in your browser. The app should load.

> **Both terminals must stay open** while you use the app. Closing either one stops that part of the app.

---

## 7. Loading Drone Data (Optional)

If you have a CSV file of drone data you want to import into the database, follow these steps.

### Prepare your CSV

Save your file as `backend/prisma/drones.csv`. The first 3 rows are skipped (treated as blank/header lines). Data starts on **row 4**.

Each data row must have these columns **in this exact order**, separated by commas:

| Column # | Example value | Notes |
|----------|--------------|-------|
| 1 | *(ignored)* | Can be anything or blank |
| 2 — Serial No. | `SN-001` | Identifier for the drone |
| 3 — Name | `COBRA-01` | Display name shown in the app |
| 4 — IP Address | `192.168.1.101` | Can be blank |
| 5 — Status | `WORKING` | See status values below |
| 6 — Reason | `Propeller damaged` | Reason for fault; can be blank |
| 7 — Date | `14/04/2026` | Must be in DD/MM/YYYY format |
| 8 — Location | `Zone A` | Can be blank |
| 9 — Owned By | `Unit B` | Can be blank |
| 10 — Remarks | `Sent for repair` | Can be blank |

**Accepted status values:**

| Value in CSV | How it appears in the app |
|-------------|--------------------------|
| `WORKING` | Ready |
| `OOS` | Out of Service |
| Anything else | Requires Attention |

### Run the seed script

Make sure the backend server is **stopped first** (press `Ctrl + C` in the backend terminal), then run:

```bash
cd backend
npx ts-node src/seed.ts
```

This will:
- Create a new fleet called **"DSTA x HQARMYINT Fleet"**
- Import all drones from the CSV into the database
- Automatically create an initial flight session dated to the most recent date found in the CSV
- Create a maintenance note for any drone that has a non-blank Reason field

After it finishes, restart the backend:

```bash
npm run dev
```

> **Warning:** Running the seed script again creates a second fleet and duplicates all drones. Only run it once. If you need to start fresh, see [Troubleshooting](#9-troubleshooting).

---

## 8. Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 19** | UI framework — builds the interface from reusable components |
| **TypeScript** | Adds type safety to JavaScript so bugs are caught before running |
| **Vite** | Development server and build tool (very fast, hot-reloads on save) |
| **Tailwind CSS** | Styling — written directly alongside HTML using utility classes |
| **React Router** | Handles navigation between pages without full page reloads |
| **Lucide React** | Icon library (all the small SVG icons in the UI) |

### Backend
| Technology | Purpose |
|-----------|---------|
| **Node.js** | JavaScript runtime — runs the server |
| **Express** | Web framework — handles HTTP requests and defines API routes |
| **Prisma** | Database toolkit — maps TypeScript objects to database rows |
| **SQLite** | Database — stored as a single file, no server installation required |
| **ts-node-dev** | Runs TypeScript directly and auto-restarts when files change |

### API Reference

The frontend communicates with the backend at `http://localhost:3001`. Available endpoints:

| Method | URL | What it does |
|--------|-----|-------------|
| `GET` | `/api/fleets` | List all fleets |
| `POST` | `/api/fleets` | Create a new fleet |
| `GET` | `/api/robots/:fleetId` | Get all drones for a fleet |
| `GET` | `/api/sessions/:fleetId` | Get all sessions for a fleet |
| `POST` | `/api/sessions` | Create a new session |
| `POST` | `/api/events/by-robots` | Get events for a list of drones |
| `POST` | `/api/events` | Log a new event |
| `PATCH` | `/api/events/:id` | Update an event (e.g. mark as resolved) |
| `POST` | `/api/maintenance/by-robots` | Get maintenance notes for a list of drones |
| `POST` | `/api/maintenance` | Add a maintenance note |
| `PATCH` | `/api/maintenance/:id` | Update a maintenance note |
| `DELETE` | `/api/maintenance/:id` | Delete a maintenance note |

---

## 9. Troubleshooting

**"Cannot find module" or similar import errors when starting the server**
> You forgot to run `npm install`. Run it inside `backend/` and also in the root folder separately.

**Prisma or database errors on startup**
> 1. Check that `backend/.env` exists and contains `DATABASE_URL="file:./prisma/dev.db"`
> 2. Run `npx prisma db push` inside `backend/`
> 3. Run `npx prisma generate` inside `backend/`

**The page loads but shows no data, or there are network errors in the browser console**
> The backend server is not running. Open a terminal, go to `backend/`, and run `npm run dev`.

**Port already in use (EADDRINUSE error)**
> Something else is using port 3001 or 5173.
> - To fix the backend port: open `backend/src/index.ts` and change `const PORT = 3001` to another number (e.g. `3002`), then also update the `fetch(...)` URLs in the frontend `src/` files to match.
> - The frontend (Vite) will automatically try the next available port — check the terminal output for the actual URL.

**Seed script crashed or was run twice by mistake**
> Delete the database and start from scratch:
> ```bash
> # Windows
> cd backend
> del prisma\dev.db
> npx prisma db push
> ```
> ```bash
> # Mac / Linux
> cd backend
> rm prisma/dev.db
> npx prisma db push
> ```
> Then run the seed script once.

**Schema changes not reflected (new columns missing, etc.)**
> Run this inside `backend/` to sync the database to the latest schema:
> ```bash
> npx prisma db push
> npx prisma generate
> ```
