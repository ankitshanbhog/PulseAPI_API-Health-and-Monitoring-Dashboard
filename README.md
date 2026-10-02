# PulseAPI — Full-Stack API Health & Monitoring Dashboard

A production-ready, full-stack API Health & Monitoring Dashboard allowing engineering teams to register and track REST APIs, monitor response times, uptime percentages, service failures, and execute automated scheduled health checks.

---

## Key Features

### 1. REST API Registration & Tracking
- Register endpoints with custom **HTTP methods** (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`).
- Configure custom **HTTP request headers** (JSON format) and **request payloads**.
- Set custom **expected status codes** (e.g. `200`, `201`, `204`).
- Configurable **check frequency/interval** (`1m`, `5m`, `15m`, `30m`, `60m`) and **timeout limits** (in milliseconds).
- Pause or resume monitoring at any time with one click.

### 2. API Health-Status Monitoring
- Real-time status indicators with glowing pulse animations:
  - **UP**: Operational, status code matches expected code, latency < 1000ms.
  - **DEGRADED**: Responding with high latency (> 1000ms) or unexpected client status code.
  - **DOWN**: Connection refused, timeout exceeded, DNS lookup failure, or `5xx` server error.
- Instant on-demand **"Check Now"** trigger button.

### 3. Response-Time Monitoring
- Accurate latency tracking in milliseconds (`ms`) for every health check ping.
- Interactive **SVG Latency Trend Chart** with hover tooltips and average reference line.
- Real-time calculation of **Minimum**, **Average**, and **Maximum** latency metrics.

### 4. Uptime Monitoring
- Calculated uptime percentage over all recorded check cycles.
- **30-Check Segment Bar Visualizer** (Datadog/Statuspage style) with hover inspect displaying exact timestamp, status code, and latency.

### 5. Service-Failure Detection & Alerting
- Automatic detection of network failures, timeouts, DNS resolution issues, and HTTP status mismatches.
- Consecutive failure counter that triggers visual alert banners when consecutive failures occur.
- Error diagnostics logged for every failure.

### 6. Automated Health Checks with `node-cron`
- Background scheduling engine powered by `node-cron`.
- Evaluates due check intervals dynamically across all active registered APIs.

### 7. Monitoring History & Raw Payloads
- Detailed historical check log table displaying timestamp, status badge, response time, HTTP status code, and failure reason.
- Raw response payload snippet viewer modal.
- Paginated history records.

### 8. JWT Authentication & User-Specific Access
- Secure registration and login with bcrypt-hashed passwords.
- JSON Web Token (JWT) stateless authentication.
- Strict multi-tenant isolation: standard users can only view and manage their own APIs.

### 9. Role-Based Access Control (RBAC)
- **`user` role**: Can register, edit, pause, delete, trigger, and view history for their own monitored endpoints.
- **`admin` role**:
  - Global system health overview and aggregate uptime metrics across all platform monitors.
  - Full visibility into all registered APIs across all users.
  - User management: inspect all registered user accounts and modify user roles (`user` ↔ `admin`).
  - Protected backend routes returning `403 Forbidden` for unauthorized users.

---

##  Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, JavaScript, Vite, Lucide Icons, Custom CSS Design System |
| **Backend** | Node.js, Express.js, REST APIs, `node-cron`, Axios |
| **Database** | PostgreSQL (`pg` pool) with SQL migrations + zero-config local SQLite fallback |
| **Authentication** | JWT (`jsonwebtoken`), Password Hashing (`bcryptjs`), RBAC middleware |
| **Testing** | Postman Collection v2.1.0 (`postman/API_Health_Monitoring_Dashboard.postman_collection.json`) |
| **Deployment** | Docker, Multi-stage Dockerfiles, Docker Compose |

---

##  Quick Start Guide

### Default Pre-Seeded Credentials

The application automatically seeds the database with the following accounts upon initial launch:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@healthcheck.io` | `Admin@12345` |
| **Demo User** | `demo@healthcheck.io` | `Demo@12345` |

*(Quick autofill buttons for these credentials are built directly into the login screen!)*

---

### Option A: Running with Docker & PostgreSQL (Recommended for Deployment)

Make sure Docker and Docker Compose are installed:

```bash
# Build and start PostgreSQL, Backend, and Frontend containers
docker-compose up --build
```

- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **PostgreSQL**: `localhost:5432` (`api_monitoring` database)

---

### Option B: Running Locally (Fast Development)

#### 1. Backend Setup
```bash
cd backend
npm install
npm start
```
*The backend automatically initializes tables, seeds demo and admin accounts, and starts the `node-cron` scheduler on port `5000`.*

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*The React application will launch at [http://localhost:3000](http://localhost:3000).*

---

##  Postman API Testing

A complete Postman collection is included in:
[`postman/API_Health_Monitoring_Dashboard.postman_collection.json`](file:///d:/API-Health-and-Monitoring-Dashboard/postman/API_Health_Monitoring_Dashboard.postman_collection.json)

### Included Request Suites:
1. **Authentication**: Register, Login Demo, Login Admin, Get Profile (`/me`).
2. **Monitors Management**: List APIs, Register New API, Check Now, Update, Toggle, Delete.
3. **Metrics & History**: Dashboard Summary, Health History Logs, Latency Time Series.
4. **Admin RBAC**: System Stats, User List, All APIs, Role Update (`403` permission tests).
5. **Mock Test Services**: Healthy (`200`), Slow (`DEGRADED`), Failing (`500 DOWN`), and Flaky endpoints.

To import:
1. Open Postman.
2. Click **Import** and select `postman/API_Health_Monitoring_Dashboard.postman_collection.json`.
3. Run the **Login - Demo User** or **Login - Admin User** request to automatically populate the `authToken` and `adminToken` collection variables!

---

##  Built-In Mock API Endpoints

The backend includes mock routes to demonstrate monitoring behavior without relying on external networks:

- `GET /api/mock/healthy` — Responds with `200 OK` in < 50ms (demonstrates **UP** status).
- `GET /api/mock/slow` — Introduces an artificial 1200ms delay (demonstrates **DEGRADED** status).
- `GET /api/mock/failing` — Returns HTTP `500 Internal Server Error` (demonstrates **DOWN** status).
- `GET /api/mock/flaky` — Randomly alternates between 200 and 503 (demonstrates intermittent failures).
- `ALL /api/mock/echo` — Echoes request headers and JSON body (demonstrates custom headers and payload monitoring).

---

##  Project Structure

```
API-Health-and-Monitoring-Dashboard/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                 # PostgreSQL Pool & local fallback adapter
│   │   │   └── env.js                # Environment config variables
│   │   ├── controllers/
│   │   │   ├── authController.js     # User registration, login, JWT issuance
│   │   │   ├── apiController.js      # CRUD APIs, check trigger, pause/resume
│   │   │   ├── monitorController.js  # History logs, charts, dashboard summary
│   │   │   └── adminController.js    # RBAC user management & global telemetry
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js     # JWT token verification
│   │   │   └── roleMiddleware.js     # RBAC role authorization
│   │   ├── models/
│   │   │   ├── schema.sql            # PostgreSQL schema definition
│   │   │   └── initDb.js             # DB seeder for default users & sample APIs
│   │   ├── services/
│   │   │   ├── healthChecker.js      # HTTP check engine, latency measurement, failure logging
│   │   │   └── scheduler.js          # node-cron scheduled monitoring cycles
│   │   ├── routes/                   # Express REST endpoints
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   │   └── verifyApi.js              # Automated backend test suite
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/               # HealthBadge, UptimeBar, ResponseChart, HistoryTable, ApiModal, ApiCard, Navbar
│   │   ├── context/                  # AuthContext (JWT session & RBAC)
│   │   ├── pages/                    # DashboardPage, ApiDetailPage, AdminPage, LoginPage, RegisterPage
│   │   ├── services/api.js           # Axios API client with auth interceptors
│   │   ├── App.jsx
│   │   ├── index.css                 # Dark glassmorphic design system
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── vite.config.js
│   └── package.json
├── postman/
│   └── API_Health_Monitoring_Dashboard.postman_collection.json
├── docker-compose.yml
└── README.md
```
