# Northview School Transport Coordination

React/Vite frontend with a Node.js/Express REST API. The API supports the original JSON demo store and an isolated Neon PostgreSQL testing branch. The map and ETA are explicitly simulated; no live GPS provider is connected.

## Project layout

```text
Hackathon/
  frontend/                 React application
  backend/
    controllers/ routes/ middleware/
    data/db.json             Preserved JSON backup and default local store
    db/migrations/           Versioned PostgreSQL schema
    db/                       Branch guard, importer, and Postgres adapter
    server.js
  .env.local                 Neon connection settings (ignored by Git)
```

## Install and run with the JSON store

Requirements: Node.js 18+ and npm.

```bash
npm install
npm run dev
```

Open <http://localhost:5173>; the API listens at <http://localhost:3000/api>. The default store remains `backend/data/db.json`, so the project can still run without a database connection. The first JSON-mode start creates the file from the included seed only if it is missing.

## Neon testing branch

The current integration is guarded to the Neon branch `school-transport-pg-test` (`br-shiny-water-a16c95r4`). Its parent is `production`. Database migration/import scripts and the Postgres API adapter refuse connections unless the local Neon branch name, branch ID, and endpoint all match this testing branch. The production branch is not an application target in this setup.

The Neon CLI project configuration is `.neon`; connection settings are held in the ignored root `.env.local`. Keep that file private and never commit it.

To select the test branch and refresh its local environment settings:

```bash
neon checkout school-transport-pg-test --project-id sparkling-heart-52730736
```

To apply versioned schema migrations, then import the current JSON records into the testing branch:

```bash
npm run db:migrate --workspace backend
npm run db:import-json --workspace backend
```

The importer validates student, route, bus, driver, and attendance references. It imports a snapshot from `backend/data/db.json` without editing or deleting that source. Running the importer again replaces the application tables on the guarded testing branch with the JSON snapshot; use it to reset the test data. Route assignments are canonical, so stale reverse `routeId` fields in the legacy JSON are derived from the route records during import/read.

Run the API/frontend in Neon mode. PowerShell:

```powershell
$env:DATA_STORE = "postgres"
npm run dev
```

Bash:

```bash
DATA_STORE=postgres npm run dev
```

The API health endpoint reports the active storage. The Postgres adapter presents the same API model as the JSON store, including trip attendance and calculated route student totals. No production cutover or deployment is included.

## Dashboard and demo login

The dashboard opens first. In local/demo mode, the sidebar's **Login** entry opens **DEMO LOGIN**. Select Admin, Parent, or Driver, enter any valid-format email and any non-empty password, and the selected role dashboard opens. This is a role preview for the hackathon demo; it does not verify identity. Parent and Driver previews use the configured demo student and driver records.

The demo bypass is unavailable when `NODE_ENV=production`; it can also be disabled in other environments with `DEMO_LOGIN=false`. Production users must use configured accounts through the regular sign-in endpoint. Sessions use signed, HttpOnly cookies. Configure `AUTH_ADMIN_EMAIL`, `AUTH_ADMIN_PASSWORD`, `AUTH_ADMIN_NAME`, `AUTH_PARENT_EMAIL`, `AUTH_PARENT_PASSWORD`, `AUTH_PARENT_NAME`, `AUTH_PARENT_STUDENT_ID`, `AUTH_DRIVER_EMAIL`, `AUTH_DRIVER_PASSWORD`, `AUTH_DRIVER_NAME`, and `AUTH_DRIVER_ID` in the API environment. Production also requires a private `AUTH_SESSION_SECRET` of at least 32 characters.

## Main workflows

- **Admin:** overview totals, student/driver/bus/route CRUD, route assignments, trip scheduling/status controls, and report export.
- **Parent:** select a child, view trip status, route/stop details, sample ETA, history, and in-app notifications.
- **Driver:** assigned demo route and bus, trip start/end, pickup/drop attendance, emergency and delay alerts.
- **Notifications:** pickup/drop events and alert feed with mark-all-read.

The tracking illustration does not use GPS or represent a real bus location. ETA and chart values are demo values, not live traffic calculations. Notifications are stored in the application database; SMS, email, push messaging, and external dispatch integrations are not connected.

## REST API

Base URL: `http://localhost:3000/api`. Request bodies are validated. Validation errors return HTTP 400; missing records return HTTP 404; unexpected errors return HTTP 500 without exposing server details.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | API status, active storage, demo mode, GPS disclosure |
| POST | `/auth/login` | Sign in to a configured account with `role`, `email`, and `password` |
| POST | `/auth/demo-login` | Non-production role preview using any valid email and non-empty password |
| GET | `/auth/session` | Read the current signed-in account |
| GET | `/auth/mode` | Report whether non-production demo login is available |
| POST | `/auth/logout` | End the current session |
| GET | `/bootstrap` | Workspace data for a signed-in account; read-only dashboard preview in local/demo mode |
| GET | `/summary` | Admin-only dashboard totals |
| GET, POST | `/students` | List/create students |
| PATCH, DELETE | `/students/:id` | Edit/remove student |
| GET, POST | `/drivers` | List/create drivers |
| PATCH, DELETE | `/drivers/:id` | Edit/remove driver |
| GET, POST | `/buses` | List/create buses |
| PATCH, DELETE | `/buses/:id` | Edit/remove bus |
| GET, POST | `/routes` | List/create routes |
| PATCH, DELETE | `/routes/:id` | Edit/remove route |
| GET, POST | `/trips` | List/schedule trips |
| PATCH | `/trips/:id/status` | Set `Scheduled`, `In progress`, or `Completed` |
| PATCH | `/trips/:id/attendance` | Set student to `Upcoming`, `Picked up`, or `Dropped off`; creates an alert |
| GET, POST | `/alerts` | List/create `Emergency`, `Delay`, `Pickup`, `Drop`, or `Info` alert |
| PATCH | `/alerts/read` | Mark all alerts as read |

Example attendance body:

```json
{ "studentId": "stu-1", "status": "Picked up" }
```

## Verification

On the Neon testing branch, the schema migration completed and the JSON import reported 7 students, 4 drivers, 5 buses, 3 routes, 5 trips, and 7 alerts. API verification passed 11 read/health/validation checks and 17 workflow checks, including create/update/delete, trip start/completion, pickup/drop attendance, emergency/delay alerts, and rejection of attendance for a student assigned to a different route. Temporary test records were removed and the testing branch was re-imported from the JSON snapshot after the checks. The JSON backup hash remained unchanged. These checks were against the testing branch only.
