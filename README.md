# Smart Home IoT Database Management System

A full-stack smart home IoT management system built with Node.js, Express, PostgreSQL, and vanilla JavaScript.

The application includes role-based dashboards, CRUD operations, smart home hierarchy management, sensor reading simulation, alerts, event history, and analytics reports powered by SQL joins and aggregations.

## Features

- Login and registration flow with user roles
- User dashboard for homes, rooms, devices, sensors, and readings
- Admin dashboard for system-level management
- Technician dashboard for device status changes and reading simulation
- Automatic default sensor creation by device type
- Alerts for abnormal readings, offline devices, and maintenance state
- Event history for important system actions
- Analytics reports using joins, grouping, aggregation, date filtering, and nested queries

## Tech Stack

- Backend: Node.js, Express
- Database: PostgreSQL
- Frontend: HTML, CSS, vanilla JavaScript
- Auth/passwords: bcrypt
- Deployment-ready database config: local `.env` or cloud `DATABASE_URL`

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a PostgreSQL database.

3. Copy `.env.example` to `.env` and fill in your local database values:

```bash
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=smart_home_iot
DB_PORT=5432
```

4. Import the database schema and demo data if SQL files are included with the project package:

```bash
psql -U postgres -d smart_home_iot -f database.sql
psql -U postgres -d smart_home_iot -f final_dump.sql
```

5. Start the app:

```bash
npm start
```

6. Open:

```txt
http://localhost:3000
```

## Cloud Deployment

For services like Render + Neon, set this environment variable in the hosting dashboard:

```txt
DATABASE_URL=postgresql://username:password@host/database?sslmode=require
```

The app will automatically use `DATABASE_URL` when it exists. For local development, it will use the separate `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `DB_PORT` values.

## Demo Accounts

Use the demo users from the imported database dump. If the dump was generated for the final presentation, the password is:

```txt
123456
```

Recommended demo roles:

- User: view and manage own smart home data
- Technician: inspect devices, change device states, simulate sensor readings
- Admin: manage users, homes, devices, analytics, alerts, and events
