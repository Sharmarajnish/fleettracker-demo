# FleetTracker - Automotive Fleet Management Demo

[![CI Tests](https://github.com/your-org/fleettracker/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/fleettracker/actions/workflows/ci.yml)
[![Security Scan](https://github.com/your-org/fleettracker/actions/workflows/security.yml/badge.svg)](https://github.com/your-org/fleettracker/actions/workflows/security.yml)

A realistic automotive fleet management application designed for **security scanning demonstration purposes**. This application intentionally contains CWE Top 25 vulnerabilities to showcase security scanning tools like Precogs AI.

> ⚠️ **WARNING**: This application contains intentional security vulnerabilities. **DO NOT** deploy to production or expose to the internet.

## Features

- 🚗 **Fleet Dashboard** - View and manage vehicle fleet
- 🔍 **Vehicle Search** - Search by model or VIN
- 📝 **Maintenance Logs** - Track vehicle maintenance history  
- 📤 **Data Export** - Export reports in various formats
- 🔐 **User Authentication** - JWT-based login system
- 📁 **File Management** - Upload maintenance documents

## Tech Stack

- **Frontend**: Next.js 15 with React Server Components
- **Backend**: Express.js API
- **Database**: PostgreSQL
- **Testing**: Jest + Supertest
- **CI/CD**: GitHub Actions

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/fleettracker.git
cd fleettracker

# Install dependencies
npm install

# Set up database
createdb fleettracker
npm run db:migrate

# Start development servers
npm run dev      # Frontend (port 3000)
npm run server   # API (port 3001)
```

### Environment Variables

Create a `.env` file:

```env
DATABASE_URL=postgresql://localhost:5432/fleettracker
NODE_ENV=development
PORT=3001
```

## Intentional Vulnerabilities

This application contains the following security vulnerabilities for demonstration:

| CWE | Vulnerability | Location | Severity |
|-----|---------------|----------|----------|
| CWE-89 | SQL Injection | `/api/vehicles/search` | 🔴 Critical |
| CVE-2025-55182 | React2Shell | `dashboard/[id]/page.js` | 🔴 Critical |
| CWE-78 | Command Injection | `/api/export` | 🔴 Critical |
| CWE-79 | Cross-Site Scripting | Dashboard vehicle notes | 🟠 High |
| CWE-22 | Path Traversal | `/api/files/:filename` | 🟠 High |
| CWE-502 | Insecure Deserialization | `/api/session` | 🟠 High |
| CWE-287 | Improper Authentication | `auth.js` (weak JWT) | 🟠 High |
| CWE-798 | Hard-coded Credentials | `db.js` | 🟠 High |
| CWE-862 | Missing Authorization | `DELETE /api/vehicles/:id` | 🟡 Medium |
| CWE-778 | Insufficient Logging | Login endpoint | 🟡 Medium |

### Vulnerability Examples

**SQL Injection (CWE-89)**
```javascript
// /api/vehicles/search - VULNERABLE
const sql = `SELECT * FROM vehicles WHERE model LIKE '%${query}%'`;
```

**XSS (CWE-79)**
```jsx
// Dashboard - VULNERABLE  
<div dangerouslySetInnerHTML={{ __html: vehicle.notes }} />
```

**Command Injection (CWE-78)**
```javascript
// /api/export - VULNERABLE
exec(`convert data.csv ${filename}.${format}`);
```

## API Documentation

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login with email/password |
| `/api/auth/register` | POST | Register new user |
| `/api/auth/logout` | POST | Logout user |

### Vehicles

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/vehicles` | GET | No | List all vehicles |
| `/api/vehicles/search` | GET | No | Search vehicles ⚠️ SQL Injection |
| `/api/vehicles/:id` | GET | No | Get vehicle details |
| `/api/vehicles` | POST | Yes | Create vehicle |
| `/api/vehicles/:id` | PUT | Yes | Update vehicle |
| `/api/vehicles/:id` | DELETE | Yes | Delete vehicle ⚠️ Missing AuthZ |

### Files

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/files/:filename` | GET | No | Download file ⚠️ Path Traversal |
| `/api/files/upload` | POST | Yes | Upload file |

### Export

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/export` | POST | Yes | Export data ⚠️ Command Injection |

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## CI/CD Pipeline

### Testing Workflow (`ci.yml`)
- Runs on push/PR to main
- Sets up PostgreSQL service container
- Runs database migrations
- Executes test suite
- Uploads coverage to Codecov

### Security Workflow (`security.yml`)
- Runs on push/PR to main
- Executes Precogs AI security scan
- Uploads SARIF results to GitHub Security tab
- Comments on PRs with vulnerability summary

## Demo Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@jlr.com | password123 | Admin |
| fleet@jlr.com | password123 | User |
| manager@jlr.com | password123 | Manager |

## Project Structure

```
fleettracker/
├── .github/workflows/     # CI/CD pipelines
│   ├── ci.yml            # Testing workflow
│   └── security.yml      # Security scan workflow
├── database/
│   ├── schema.sql        # PostgreSQL schema
│   └── migrate.js        # Migration script
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── dashboard/    # Dashboard pages
│   │   ├── layout.js     # Root layout
│   │   └── page.js       # Login page
│   ├── components/       # React components
│   ├── lib/
│   │   ├── auth.js       # Auth utilities ⚠️ Weak JWT
│   │   └── db.js         # DB connection ⚠️ Hard-coded creds
│   ├── routes/           # Express API routes
│   │   ├── auth.js       # Auth endpoints ⚠️ No logging
│   │   ├── export.js     # Export endpoint ⚠️ Cmd Injection
│   │   ├── files.js      # File endpoint ⚠️ Path Traversal
│   │   ├── session.js    # Session endpoint ⚠️ Deserialization
│   │   └── vehicles.js   # Vehicle endpoints ⚠️ SQLi, AuthZ
│   ├── middleware.js     # Auth middleware
│   └── server.js         # Express server
├── tests/
│   ├── api.test.js       # API unit tests
│   └── integration.test.js
└── package.json
```

## Security Scanning Demo Flow

1. **Show the running application** (2 min)
   - Navigate to fleet dashboard
   - Demonstrate realistic functionality

2. **Run Precogs AI scan** (5-10 min)
   - Trigger via GitHub Action or CLI
   - Show real-time scanning progress

3. **Review findings** (5 min)
   - Critical: SQL Injection, Command Injection
   - High: XSS, Path Traversal, Auth issues

4. **Apply suggested fixes** (3 min)
   - Review Precogs AI fix suggestions
   - Create PR with secure implementations

5. **Re-scan to verify** (2 min)
   - Run scan again to confirm fixes
   - Show passing tests

## License

This project is for demonstration purposes only. Not licensed for production use.

---

Built for JLR security scanning demonstration.
