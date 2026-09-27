# Deploying React and Express on Vercel

## Configuration

Deploy from the repository root in the existing `smart-home-iot` project. Do not change Root Directory to `client`: the API function, Express code and backend dependencies are outside that directory.

The versioned configuration overrides the framework preset, install/build commands and output directory. Vercel installs the root dependencies and the client dependencies, builds `client/dist`, and bundles `api/index.js` as a Node.js function. No new database or schema migration is required.

Request flow:

- `/`, `/login`, `/homes/...`, `/analytics`, `/admin`, etc. → React static entrypoint.
- `/assets/*` and the favicon → built static files.
- `/backend/me` → API adapter → existing Express `/me` handler.
- `/backend/api/homes` → API adapter → existing Express `/api/homes` handler.
- `/backend/analytics/devices-per-home?homeId=6` → same query on the existing analytics handler.

The adapter preserves HTTP methods, bodies and cookies and marks API responses private/no-store. Auth uses the existing HttpOnly, Secure, SameSite=Lax cookie in production. Local `npm run dev` still starts the original Express server; run the Vite client separately.

## Environment variables

Keep the current `DATABASE_URL` and `JWT_SECRET` values in Vercel. They are server secrets, not `VITE_*` variables. A preview requires matching variables in the Preview environment. If previews share the production database, their write actions affect the same records; use a separate test database when isolation is needed.

Neither the database contents nor environment-variable values are part of a Git commit. Do not re-import a database dump to publish the frontend.

## Verification before and after publication

1. Locally: `npm ci`, `npm ci --prefix client`, `npm run build`, `npm test`, and `npm test --prefix client`.
2. On Vercel, ensure the deployment corresponds to the intended commit and reaches Ready.
3. Open the deployment and verify the React login page, loaded JS/CSS, login and session restoration after refreshing.
4. Open a home and refresh a nested room/device URL. Confirm the page and API both load.
5. Review analytics, events and alerts with a regular user. Verify administrator and technician workspaces with their respective accounts.
6. Confirm logout returns to the login page. Use read-only verification against shared data; mutation tests use isolated fixtures.

Protected previews require a Vercel-authenticated browser or explicitly configured automation access. A Ready build alone does not prove database access or application login. After a production deployment, check the existing public domain as well as build status.

## Rollback

The last pre-React production Git revision was `9584e61`. Vercel can roll back to the previous successful production deployment. For a persistent source rollback, revert the rollout commits in Git and push the revert; do not force-reset shared history. Application rollback does not undo database writes.

The original frontend remains in `public/` as a reference, but reverting only the React assets is insufficient: routing and the API adapter must stay consistent with the selected frontend.
