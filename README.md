# easyQA

Simplified QA test management app with a Trello-like experience.

## Stack

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + Express + TypeScript
- Persistence: In-memory seeded store (developer-friendly scaffold)

## Features

- Dashboard with projects, summary metrics, recent releases/runs
- Project workspace with tabs:
  - Overview
  - Releases
  - Scenarios (Trello-style board with drag-and-drop by status)
  - Test Runs
- Full CRUD for:
  - Projects
  - Releases
  - Test Scenarios
  - Test Cases
  - Test Runs
- Scenario filters:
  - Search by title
  - Release
  - Priority
  - Regression / Acceptance / Smoke / Automation tags
- Scenario detail modal with lightweight card-like UX
- Test run execution modal with quick status updates (pass/fail/blocked/not run)
- Seeded demo data for immediate use

## Run locally

### 1) Install dependencies

```bash
cd /workspace/server && npm install
cd /workspace/client && npm install
```

### 2) Start backend

```bash
cd /workspace/server
npm run dev
```

Backend runs at: `http://localhost:4000`

### 3) Start frontend

```bash
cd /workspace/client
npm run dev
```

Frontend runs at: `http://localhost:5173`

The client defaults to API base URL `http://localhost:4000/api`.

## Test hosting for `EasyQA-test.com`

This repo now supports **single-origin hosting** where Express serves:

- API under `/api`
- built frontend static files for all other routes

### Production-style build and run

```bash
cd /workspace/server
./scripts/deploy-local.sh
```

This script:

1. builds the frontend with `VITE_API_URL=/api`
2. copies frontend build output into `server/public`
3. builds backend TypeScript
4. starts the server on port `4000`

### Point your domain

Point `EasyQA-test.com` DNS `A` record to the server public IP, then run:

```bash
cd /workspace/server
HOST=EasyQA-test.com PORT=80 node dist/index.js
```

The server will:

- accept requests for the configured `HOST` (and localhost for health checks)
- reject unknown hosts with `421 Misdirected Request`

## Build

```bash
cd /workspace/server && npm run build
cd /workspace/client && npm run build
```
