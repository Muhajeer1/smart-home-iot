# Smart Home React client

Implemented migration stages: authentication, overview, owned homes (create/edit/delete), room creation/editing, device creation/deletion and privileged editing, device details and default sensors, filtered reading history with chart/CSV, an operator simulator, events, alert management, six analytics reports, and admin/technician workspaces. Navigation is URL-based: `/homes/:homeId/rooms/:roomId/devices/:deviceId`.

## Run locally

Start the existing Express app from the repository root:

```sh
npm run dev
```

In a second terminal, from `client/`:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. Express stays on port 3000. Use existing database accounts. The original interface remains available on port 3000.

The client has its own package and lockfile. Express business handlers and database configuration remain unchanged; Vercel integration lives in the root configuration and API adapter.

## API and cookies

All browser requests use `/backend/...`. Vite removes `/backend` and forwards the request to the unchanged Express API. For example, `/backend/api/homes` → `/api/homes`, and `/backend/homes/6` → `/homes/6`. Cookie and Set-Cookie headers pass through the proxy; no tokens are stored in localStorage.

To use another local backend, copy `.env.example` to `.env.local` and change `BACKEND_URL`. Only connect to a database you intend to use: UI mutations are real writes when running against Express.

## Checks

```sh
npm run build
npm test
```

Browser tests intercept API requests and do not write to PostgreSQL. On macOS they use installed Google Chrome. Otherwise install Chromium using `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to a local browser path.

`npm run preview` serves the build locally on port 4173 with the same API proxy. The root `vercel.json` builds this client and serves it together with the Express API. It routes `/backend/*` through `api/index.js` and application pages to the React entrypoint. See the [deployment guide](../docs/vercel-deployment.md). Vite's development proxy is not included in static build output.

## Structure

- `src/app`: routes, application shell, shared visual styles.
- `src/features/auth`: session, sign in, registration.
- `src/features/homes`: owned-home state, collection, forms, home scope.
- `src/features/rooms`: room forms, room scope, device collection.
- `src/features/devices`: device forms, status, details, default sensors.
- `src/features/readings`: sensor history, charts, filters, summaries and export.
- `src/features/simulator`: operator-only individual and system-wide simulation.
- `src/features/operations`: activity, alert management, analytics and role workspaces.
- `src/components`: shared accessible UI elements.
- `src/lib`: API client and API types.
- `tests`: isolated browser acceptance tests.

The current UI remains English. Displayed homes, counts, and rooms come from the API. API failures are shown explicitly; there is no production mock-data fallback.

See [migration plan](../docs/react-migration.md) for scope, contracts, roles, and remaining stages.

## Current scope

Room deletion is not exposed because the existing API has no delete-room route. All roles can create devices in their own homes and select an initial state, matching the existing API. Editing an existing device is available to admins and technicians; its type and serial number stay fixed. The server remains the authority on permissions. Device deletion asks for confirmation.

Home → room → device ancestry is checked against API lists before loading descendants. A room ID from another home is not treated as belonging to the URL’s selected home. Specialist global views are available at `/admin` (admin only) and `/technician` (admin/technician). Sensor ranges and enabled state are available on the device page. Open a sensor at `/homes/:homeId/rooms/:roomId/devices/:deviceId/sensors/:sensorId` to view readings. Operators can also open `/simulator` for sensors across all homes; users cannot access that route.

## Reading history and improvements

Date/quality/range filters, sort order and page are preserved in the sensor URL. Date endpoints include the full local calendar day. Quality is shown separately from comparison with the current configured normal range. Statistics, chart and CSV use all matching loaded records, not just the visible page. The table renders 25 rows at a time and large charts use a bounded selection preserving local extrema. The current API still transfers all history; this is recorded as a server follow-up.

Single simulation is available to admin/technician and uses the existing sensor endpoint. Batch simulation is in the separate operator workspace, with explicit confirmation that **all homes** are affected irrespective of list filters. Invalid counts are rejected on the client; the server must enforce this as well in the later API pass. No simulation was run against real data for automated acceptance tests.

See [API follow-up notes](../docs/api-follow-up.md) for the action matrix and proposed API improvements after the frontend migration. No new edit/delete actions are invented for unsupported routes.

## Operations workspaces

`/activity` has event search and home/type filters. `/alert-center` provides severity/status filters, resolve/reopen and confirmed deletion. `/analytics` offers all six reports with a home scope saved in the URL, independent retries and accurately labelled report periods. `/admin?tab=users|homes|devices` exposes searchable system directories and confirmed deletion. `/technician` handles all four device statuses and links to the simulator.

All new tables paginate loaded API lists on the client; server-side pagination is a follow-up. Global views retain the existing server scope for each role. Missing units and ancestry IDs are not inferred from names. Admin self-deletion and last-admin guards are client safeguards only, pending backend enforcement.

The suite now contains 53 browser scenarios. Live reads and pages were also checked with all three demo roles without deleting records or changing device/alert state. Local root startup still serves the original frontend on port 3000. The Vercel configuration publishes the React build with the existing Express API.
