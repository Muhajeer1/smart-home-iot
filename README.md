# Smart Home IoT

A smart home management application built with **React, TypeScript, Express and PostgreSQL**. Manage connected spaces, review sensor history and alerts, and use dedicated administrator and technician workspaces.

[Live application](https://smart-home-iot-liard.vercel.app/)

## Features

- **Homes and rooms:** create and edit your spaces; search collections and navigate directly to each home, room and device.
- **Devices and sensors:** add devices with default sensors, inspect configuration, delete devices with confirmation, and edit model/status as an administrator or technician.
- **Reading history:** trend chart, summaries, date/quality/range filters, sorting, pagination and CSV export. Filters remain in the URL after refresh.
- **Alerts:** active and resolved views, severity/search filters, resolve/reopen actions and confirmed deletion.
- **Activity:** searchable event history with home and event-type filters.
- **Analytics:** six reports covering device/room counts, latest readings, out-of-range readings, recent alerts and average readings by sensor type.
- **Administration:** searchable user, home and device directories with confirmed deletion.
- **Technician workspace:** system-wide device monitoring, four operating statuses, and individual/bulk reading simulation.
- **Responsive interface:** desktop and mobile layouts, keyboard-accessible dialogs, explicit loading/error/empty states and retry controls.

Supported actions follow the current API. Room deletion, manual sensor management, profile editing and role changes are tracked in the [API follow-up notes](docs/api-follow-up.md), rather than presented as available features.

## Stack and architecture

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, React Router, Vite, CSS, Lucide icons |
| Backend | Node.js, Express, parameterized PostgreSQL queries |
| Database | PostgreSQL; existing cloud deployment uses Neon |
| Authentication | bcrypt passwords, signed JWT in an HttpOnly cookie |
| Testing | Playwright browser scenarios and Node.js integration tests |
| Hosting | Vercel static frontend and Node.js API function |

The domain hierarchy is **Home → Room → Device → Sensor → Reading**. Events and alerts reference related records. Analytics use SQL joins, aggregates, nested queries and date conditions.

The frontend calls `/backend/*` on its own origin. Locally, Vite proxies those requests to Express; on Vercel, the API entrypoint removes the prefix and delegates to the same Express application. Database credentials remain server-side.

## Roles

| Role | Workspace |
| --- | --- |
| User | Owned homes and their devices, readings, events, alerts and analytics |
| Technician | Personal homes plus system devices, status changes, simulation and global reports |
| Administrator | Personal homes plus user/home/device administration and technician tools |

The server verifies the session and loads the current role from PostgreSQL on protected requests. The React navigation reflects that role. Existing authorization inconsistencies and further server safeguards are documented in the [API backlog](docs/api-follow-up.md).

## Local development

Use Node.js 24 and npm. Install both dependency sets from the repository root:

```sh
npm ci
npm ci --prefix client
```

Copy `.env.example` to `.env` and configure **either** the local `DB_*` settings or `DATABASE_URL`, plus a long random `JWT_SECRET`. Use an existing database with the project schema, or restore your own schema/data backup into an empty local database. Schema and dump files are not currently included in this repository.

Start Express in one terminal:

```sh
npm run dev
```

Start React in a second terminal:

```sh
npm run dev --prefix client
```

Open **http://127.0.0.1:5173**. Express runs on port 3000. The original interface remains in `public/` and is still served at port 3000 for reference; the new interface is on port 5173.

To point Vite at another local backend, copy `client/.env.example` to `client/.env.local` and change `BACKEND_URL`. Do not put database credentials or session secrets in frontend environment variables.

## Build and verification

From the repository root:

```sh
npm run build
npm test
npm test --prefix client
npm run format:check --prefix client
```

- `build` type-checks the frontend and writes its production assets to `client/dist`.
- Root tests cover home-update validation and the deployment adapter, including prefixed API routing, login, production cookie attributes, session restoration and role denial. They use an isolated database stub. Run the build first for the static-output check.
- Client tests cover 53 browser scenarios with intercepted API calls; they do not modify PostgreSQL records.
- Playwright uses installed Google Chrome on macOS. On other systems, run `npx playwright install chromium` from `client/`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

To inspect a production frontend build locally, keep Express running and use `npm run preview --prefix client`, then open http://127.0.0.1:4173.

## Vercel deployment

Keep the existing Vercel project connected to this repository, with **Root Directory set to the repository root**. The checked-in `vercel.json` defines:

| Setting | Value |
| --- | --- |
| Framework | Other (`null` in configuration) |
| Install command | `npm ci && npm ci --prefix client --include=dev` |
| Build command | `npm run build` |
| Output directory | `client/dist` |
| API entrypoint | `api/index.js` |

`/backend/*` is routed to Express; application page URLs fall back to the built React `index.html`. Static assets are served directly, so nested React routes can be refreshed without an Express page route.

Retain the existing **DATABASE_URL** and **JWT_SECRET** in Vercel Environment Variables. For a functional preview, those variables must also be available in the Preview environment. Use a separate test database there if preview changes should be isolated. No schema migration or database reset is required for this frontend deployment.

Pushing to the configured production branch publishes through the existing project and preserves its production domain. Other branches create preview deployments when Git integration is enabled. See the [deployment guide](docs/vercel-deployment.md) for verification and rollback.

## Demo accounts

The demo database includes these accounts, subject to its current data:

| Role | Email |
| --- | --- |
| Administrator | `admin@smarthome.local` |
| User | `aylin@smarthome.local` |
| User | `mert@smarthome.local` |
| Technician | `technician@smarthome.local` |

Demo password: `123456`. Registration creates a regular user. Treat demo accounts as demonstration access, not a production account policy.

## Project structure

```text
client/        React application, styles, browser tests and build configuration
api/           Vercel adapter for the existing Express application
controllers/   Request handlers and database operations
routes/        Express route definitions
middleware/    Session verification and role checks
services/      Event and alert operations
utils/         Validation, role, JWT and error helpers
tests/         Backend and deployment integration tests
docs/          Deployment guide, migration record and API follow-up notes
public/        Original frontend, retained for reference
server.js      Express application and local startup
db.js          PostgreSQL connection pool
vercel.json    Build and deployment routing
```

This project began as a database management systems course project and now includes a complete React client for its existing application workflows. See the [client guide](client/README.md) for frontend details and the [migration record](docs/react-migration.md) for implementation history.
