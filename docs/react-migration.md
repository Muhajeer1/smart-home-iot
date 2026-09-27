# React migration

## Boundaries

The React client is developed in `client/`. Express, controllers, services, auth middleware, PostgreSQL, and the root Vercel configuration remain unchanged at the user's request. Existing uncommitted home-edit work belongs to the baseline and must be preserved.

This is a staged migration, not a production cutover. Every stage should end with working API-connected flows, error/empty/loading states, responsive layouts, and focused acceptance tests. Server access-control findings from the initial review remain a separate backlog; client routing cannot repair or replace server authorization.

## Visual direction

Chosen initial direction: a light residential workspace, warm sage hero, quiet white cards, forest-green actions, restrained typography, clear device/room hierarchy. Personal screens prioritize homes; later technician/admin screens can use denser tables within the same shell. Avoid fabricated live status, readings, or online badges.

Alternative direction for a later visual review: a darker technical monitoring console with denser telemetry. This is not implemented in this slice. Validate the working light direction before applying it to every remaining screen.

Shared rules: 44px primary controls, visible focus, semantic labels, native modal focus containment, inline validation, consistent loading/error states, reduced-motion support. English copy is retained from the existing product. Fonts have system fallbacks.

## Page and role map

| Area | User | Admin / technician | Migration status |
| --- | --- | --- | --- |
| Sign in, register, sign out, session recovery | Yes | Yes; new registrations remain regular users | Implemented |
| Overview | Owned-home totals | Owned-home totals, matching the existing summary endpoint | Implemented |
| My homes | Own homes; create/edit/delete | Own-home collection; edit remains owner-only | Implemented |
| Home detail | Own home’s rooms and navigation | Own-home collection scope | Implemented |
| Rooms | Own-home create/edit | Own-home collection in React; server has broader scope | Implemented |
| Devices | Create/delete/view in own homes | Edit model/state; type and serial fixed | Implemented for own-home scope |
| Sensors and readings | Configuration, history, filters, CSV | Same plus single simulation | Implemented |
| Simulator | No | All-system sensors, single and bulk generation | Implemented |
| Events and alerts | Owned data per intended policy | System data per existing endpoints | Implemented |
| Analytics | Owned-home reports | Global/home-scoped reports | Implemented |
| Admin workspace | No | Admin only | Implemented |
| Technician workspace | No | Admin/technician | Implemented |

All original functional sections now have React destinations, including the specialist role workspaces. The original public UI remains intact for rollback. Local startup/deployment cutover is still pending; root Express startup continues serving the original UI.

## First-slice API contracts

| Method / existing endpoint | Client use |
| --- | --- |
| GET /me | Restore session and authoritative user role |
| POST /login | `{email, password}`; server sets HttpOnly cookie |
| POST /register | `{full_name, email, password}`; then sign in |
| POST /logout | Clear cookie before clearing client state |
| GET /api/homes | Authenticated user's homes |
| GET /analytics/dashboard-summary | Owned home/room/device counts |
| POST /homes | `{home_name, address_text}` |
| PUT /homes/:id | Trimmed name/address only; no ownership fields |
| DELETE /homes/:id | Explicit confirmation before deletion |
| GET /rooms/:homeId | Rooms after confirming home is in the user’s collection |

The edit form counts Unicode code points: name ≤ 60 and address ≤ 200. Create uses these same client limits so new records remain editable, without changing backend validation. Draft values remain on failed saves. A lost response can leave the outcome uncertain; reload before repeating a possibly successful create/delete. No automatic mutation retries.

The browser prefix `/backend` exists only in the client proxy. Express endpoint names are unchanged. The selected home is a URL parameter, never global localStorage. Protected routes preserve the intended destination after login. API 401 clears the session; network/500 failures show retry without pretending the user logged out.

## Stages and exit criteria

1. **Foundation + homes:** React/TypeScript/Vite, shell, auth, CRUD, scoped overview, read-only detail. Build and isolated browser tests pass; live integration is verified separately against a suitable local test database.
2. **Rooms + devices:** nested URL navigation, room create/edit, device creation/default sensors and allowed state changes. Confirm user/admin/technician behavior against existing server rules.
3. **Sensors + readings:** real data tables, filters, simulation flows. Record where pagination or API changes would help without silently changing Express.
4. **Events + alerts:** safe text rendering, filters, resolve/reopen, coherent error states. Track existing backend access concerns separately.
5. **Analytics + role workspaces:** shared chart styling and tables, then specialist admin/technician actions and role navigation.
6. **Preview + cutover:** verify full feature parity, direct URL refresh, cookies, same-origin API routing, mobile/keyboard flows, and rollback. Only then replace the deployed frontend.

The first slice must not be described as a completed rewrite or production deployment. Database constraints, destructive cascades, and deployed behavior need live verification before cutover.


## Stage 2 — rooms and devices

- Nested routes: `/homes/:homeId` → `/homes/:homeId/rooms/:roomId` → `/homes/:homeId/rooms/:roomId/devices/:deviceId`.
- Home and room contexts are keyed by the selected parent. Descendants load only after verifying that their IDs belong to that parent. Reads are cancellable; mutations do not auto-retry.
- Rooms: create/edit, whole-number floor (including ground and basement), search, empty/error/loading states. There is no DELETE /rooms route, so no delete-room action is invented.
- Devices: create using seven existing types and four existing states; server creates default sensors. Search by type/model/serial and filter by state. Admin and technician can edit model/state. Type and serial are immutable after creation. Delete requires confirmation and returns from details to the room.
- Device details: real state, serial, installed date, sensor ranges and enabled state. Add-default-sensors uses the existing idempotent-intended server operation; it does not implement its own sensor insertion.
- Summary counts refresh after adding a room or adding/deleting a device.
- The personal workspace remains scoped to GET /api/homes for all roles. Global technician/admin tools are implemented in stages 4–5 below.

| Method / existing endpoint | Stage 2 use |
| --- | --- |
| POST /rooms | `{home_id, room_name, floor_no}` |
| PUT /rooms/:id | `{room_name, floor_no}` |
| GET /devices/:roomId | Devices in a verified room |
| POST /devices | `{room_id, device_type, brand_model, serial_no, status}` |
| PUT /devices/:id | `{device_type, brand_model, status}`; privileged roles only |
| DELETE /devices/:id | Confirmed deletion |
| GET /sensors/:deviceId | Sensor configuration for a verified device |
| POST /devices/:id/default-sensors | Create missing defaults, then reload sensors |

Acceptance coverage includes room create/edit and failed drafts, device create with duplicate-serial retry, role-specific editing, server permission denial, filters, deletion failure/cancel/success, default sensors, wrong-parent deep links, and responsive/keyboard flows. Browser tests mock API mutations; existing production/demo records are not changed for acceptance testing.

### Stage 2 verification

- TypeScript and production build passed.
- All 22 isolated browser scenarios passed (10 existing, 12 new).
- Desktop/mobile layouts and modal keyboard focus were inspected.
- Real local browser login, home/room/device/sensor reads, and direct device-page refresh passed with no browser exceptions. No real database mutations were used in this verification.
- Server-file hashes match the beginning of stage 2, including pre-existing local changes.


## Stage 3 — readings and simulator

- Sensor URL extends the verified home/room/device hierarchy. Sensors must belong to the device before their history is requested.
- History includes local-date filters, quality and range classification as separate filters, URL state, sort order, 25-row pagination, filtered summary, trend chart, CSV and manual refresh.
- The chart only plots finite numeric values with valid times; bounded min/max sampling preserves extremes for large histories. Missing values are never coerced into zero. Current sensor bounds are shown as reference, not historical bound versions.
- CSV exports all filtered loaded records with raw timestamps, quoted fields and spreadsheet formula protection for text.
- A newly simulated record is merged from the successful API response, with no mutation retry and no loss of active filters. Operator scope is checked in the UI; the server remains authoritative.
- `/simulator` is guarded for admin/technician and uses GET /technician/sensors. Single generation selects one sensor; bulk confirmation explicitly covers all homes and uses an integer 1–50000.
- Global operator tools can work even if the account owns no homes. Admin/technician management panels are implemented in stages 4–5 below.

New contracts used: GET /readings/:sensorId, POST /readings/simulate `{sensor_id}`, GET /technician/sensors, POST /readings/simulate-bulk `{count}`. Existing Express handlers are unchanged.

The user authorized useful client improvements and requested a separate API list. The evolving action matrix and server proposals are in [API follow-up notes](api-follow-up.md). API pagination, room deletion, sensor editing and audit-aware data correction are intentionally deferred there.

### Stage 3 verification

- Production build and formatting checks passed.
- Existing 22 browser scenarios passed; all 13 new history/simulator/data-handling scenarios passed after fixing explicit filter labels and consecutive URL-filter updates.
- Desktop/mobile history, chart, table scrolling, simulator and bulk dialog were inspected.
- Live local read-only verification passed: user login, a real sensor with 47 readings, chart, filter persistence on reload, and technician simulator list. No readings were generated or records modified.
- Server-file hashes match the beginning of stage 3. Existing unrelated local changes are preserved.


## Stages 4–5 — activity, alerts, analytics and role workspaces

- `/activity`: safe React text rendering, search, home-ID and event-type filters, pagination. Uses owner-scoped GET /events, never the unsafe /events/home/:homeId handler.
- `/alert-center`: active/resolved/all views, severity and text filters, accurate unfiltered counters, resolve/reopen, confirmed deletion. PATCH response is merged into the joined row to preserve location names. Failed actions remain visible and are not retried automatically.
- `/analytics`: all six existing reports, authorized home selection in the URL, independent refresh/error/retry per report, count bars and paginated tables. Scope changes unmount and abort previous requests. The alert report explicitly covers the last 30 days including resolved alerts; others use existing all-history semantics. Missing units are not invented, and averages of different sensor quantities are not plotted on one magnitude scale.
- `/admin?tab=users|homes|devices`: searchable system directories and confirmed deletion. Self-deletion and deleting the only loaded administrator are disabled as UI safeguards; backend enforcement remains a follow-up. Deleting a record refreshes the personal home collection and summary. Related directories load fresh when selected.
- `/technician`: global device fleet, counts, status/search filters, and status dialog supporting all four API states. Joined room/home names survive the raw update response. Existing simulator is linked from the operator workspace.
- Role-specific navigation and route guards prevent mounting restricted data views. Direct legacy clean paths /events, /alerts and /dashboard redirect within React. Legacy HTML/localStorage links are not a production migration contract.
- Shared tables render 15 rows per page; data is still fetched as complete API lists. Large tables scroll inside their panels, with a mobile hint for offscreen actions.

### Existing endpoints used

GET /events; GET /alerts?status=all; PATCH /alerts/:id/resolve `{is_resolved}`; DELETE /alerts/:id.
GET /analytics/homes and six /analytics reports: devices-per-home, rooms-per-home, latest-readings, abnormal-readings, alert-summary, average-reading-by-sensor-type. Optional `homeId` is validated against the loaded authorized home list.
GET /admin/users, /admin/homes, /admin/devices and corresponding DELETE /admin/{collection}/:id.
GET /technician/devices; PUT /technician/devices/:id `{status}`.

### Verification

- All 53 browser scenarios passed: 35 existing regression scenarios and 18 new operations scenarios.
- New coverage includes literal untrusted event text, pagination, role denial without restricted requests, alert merge/resolve/reopen/delete, cancel/error/retry, admin self-deletion protection and all deletion routes, technician state changes, partial analytics failure, scope replacement, unavailable scopes, and mobile document overflow.
- All five new screens inspected on desktop and mobile; wide tables scroll within their containers.
- Live local login and read-only API/page checks passed for user, technician and admin with zero browser exceptions. No domain records were mutated. User saw five accessible homes and operators six, matching existing role scoping.
- Server/controller/route/service/middleware/utility checksums match the start of this stage; pre-existing local changes remain intact.

### Remaining rollout work

React feature migration is complete for the existing UI actions. Root startup and deployed frontend have not been switched. Next rollout work: same-origin /backend routing, static asset/page fallback, production cookies and direct-link reload verification, build orchestration and rollback. Unsupported new actions are tracked separately in api-follow-up.md and are not part of frontend parity. Real destructive operations were verified with API mocks; database cascade policy still needs review in the API pass.
