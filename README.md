# Smart Home IoT Database Management System

Live Demo: https://smart-home-iot-liard.vercel.app/

A full-stack smart home IoT management system built with Node.js, Express, PostgreSQL, and vanilla JavaScript. The project demonstrates how a relational database can power a real application with role-based access, CRUD workflows, device telemetry, alerts, event history, and analytics reports.

## Overview

This application models a smart home IoT environment where users can manage homes, rooms, devices, sensors, and sensor readings. Technicians can inspect devices, change device states, and simulate sensor readings. Admins can manage system-level data and review global analytics.

The database is the core of the project. Homes, rooms, devices, sensors, readings, events, alerts, users, and roles are connected through foreign keys. The application uses those relationships to provide meaningful workflows and reports instead of storing isolated records.

## Key Features

- Role-based login flow for user, technician, and admin views
- Cookie-based session authentication with a signed token and protected backend routes
- CRUD operations for homes, rooms, devices, sensors, and readings
- Smart home hierarchy: Home -> Room -> Device -> Sensor -> SensorReading
- Automatic default sensor creation based on selected device type
- Sensor reading simulation for testing IoT behavior without physical hardware
- Alerts for abnormal readings, offline devices, and maintenance state
- Resolve/reopen flow for active and resolved alerts
- Event history for important system actions
- Analytics reports built with SQL joins, grouping, aggregation, nested queries, and date filtering
- Clean URL routing for a more realistic web app experience
- Deployment-ready database configuration for local PostgreSQL or cloud PostgreSQL

## Tech Stack

- Backend: Node.js, Express
- Database: PostgreSQL
- Frontend: HTML, CSS, vanilla JavaScript
- Password hashing: bcrypt
- Session auth: signed HTTP cookie token with `JWT_SECRET`
- Hosting: Vercel
- Cloud database: Neon PostgreSQL

## Database Concepts Demonstrated

- Primary keys and foreign keys
- One-to-many relationships
- `ON DELETE CASCADE`, `ON DELETE SET NULL`, and `ON DELETE RESTRICT`
- Parameterized SQL queries
- Input validation before database writes
- CRUD operations
- Joins across multiple related tables
- `GROUP BY`, `COUNT`, `AVG`, `MIN`, `MAX`
- Date filtering for recent alerts
- Nested query for latest reading per sensor

## Analytics Reports

The analytics page demonstrates advanced SQL queries on top of the stored IoT data. Reports are scoped by selected home, so users can inspect analytics for a specific smart home instead of only seeing global totals.

- Devices per home
- Latest reading per sensor with home, room, and device context
- Abnormal reading summary by sensor
- Alert summary by type for the last 30 days
- Average reading value by sensor type
- Number of rooms per home

## Demo Access

The deployed version uses a demo PostgreSQL database. Demo accounts use:

```txt
Password: 123456
```

Recommended demo accounts:

```txt
Admin: admin@smarthome.local
User: aylin@smarthome.local
User: mert@smarthome.local
Technician: technician@smarthome.local
```

If a demo account is unavailable, a new regular user can be created from the registration form. Admin and technician roles are intended to be assigned directly in the database.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a PostgreSQL database.

3. Copy `.env.example` to `.env` and fill in your local database values:

```txt
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=smart_home_iot
DB_PORT=5432
JWT_SECRET=change_this_to_a_long_random_secret
```

`JWT_SECRET` is used to sign the session token stored in the browser as an HTTP cookie. Use a long random value locally and set a separate secret in production. Do not commit your real `.env` file.

4. Import the database schema and optional demo data:

```bash
psql -U postgres -d smart_home_iot -f database.sql
psql -U postgres -d smart_home_iot -f final_dump.sql
```

5. Start the app:

```bash
npm start
```

6. Open the app:

```txt
http://localhost:3000
```

For development with automatic restarts:

```bash
npm run dev
```

## Cloud Deployment Notes

The app supports both local PostgreSQL variables and a cloud database connection string.

For cloud deployment, set this environment variable in the hosting platform:

```txt
DATABASE_URL=postgresql://username:password@host/database?sslmode=require
JWT_SECRET=your_long_random_production_secret
```

When `DATABASE_URL` exists, the app uses it automatically. Otherwise it falls back to the local `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `DB_PORT` values. `JWT_SECRET` is required for consistent session signing across deployments.

## Authentication & Access Control

After login, the server signs a session token and stores it in an HTTP cookie. Protected API routes read that cookie, verify the token, and attach the current user to the request. Frontend pages call `/me` to get the current user instead of trusting role data from `localStorage`.

Access levels:

- User: manages only their own homes, rooms, devices, sensors, readings, alerts, events, and home-scoped analytics.
- Technician: can view system devices, change device status, simulate readings, and review analytics/events/alerts.
- Admin: can manage users, homes, devices, and review system-wide data.

## Project Structure

```txt
controllers/   Request handlers and database operations
routes/        Express route definitions
middleware/    Authentication and role access middleware
services/      Reusable event and alert logic
utils/         Validation, role helpers, session token helpers, and database error helpers
public/        HTML, CSS, and frontend JavaScript
api/           Vercel serverless entry point
db.js          PostgreSQL connection pool
server.js      Express app setup and routes
```

## Notes

This project was originally developed as a database management systems course project and later improved for portfolio presentation. It focuses on demonstrating relational database design, backend integration, and practical full-stack workflows.
