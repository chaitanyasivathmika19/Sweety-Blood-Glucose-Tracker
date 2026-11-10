# Sweety — Blood Glucose Tracker & Doctor Consultation Platform

![Sweety Banner](screenshots/03_patient_dashboard.png)

> **Sweety** is a healthcare web platform that enables diabetes patients to record, monitor, and analyze daily blood glucose levels across four routine time slots while connecting them with verified endocrinologists and diabetologists through subscription-based consultation plans.

Built with **React 18, Node.js, Express, and PostgreSQL**, Sweety implements both the mandatory **Kenpath Engineering Assignment** requirements and the broader **Phase 1 & Phase 2 Sweety Platform vision**.

---

## 1. Project Objectives

1. **Kenpath Engineering Mandatory Goals:**
   - Real user authentication with `bcrypt` password hashing.
   - Comprehensive CRUD operations on patient blood glucose readings across 4 mandatory daily slots (`Morning (fasting)`, `After breakfast`, `After lunch`, `After dinner`).
   - Strict backend validation with exact error messages.
   - Authoritative reporting: Daily, Month-to-date, and Previous-month relative to selected date.
   - Pagination, Recharts interactive line charts, Docker Compose, automated Vitest/Supertest test suites, and React Testing Library frontend tests.

2. **Sweety Healthcare Platform Vision:**
   - Patient health dashboard with daily completion tracking (0/4 to 4/4).
   - Interactive monthly calendar with view-only past date preservation.
   - Strict 4-hour editing window rule enforced by server timestamp.
   - Standard clinical CSV export (`Date, Time Slot, Glucose Value (mg/dL), Created At, Updated At`).
   - Doctor discovery directory with specialization filtering and verified credential status.
   - Three consultation plans (₹250, ₹400, ₹600) with **two calendar months validity**.
   - Two-way notification system and automated daily slot reminder jobs.
   - Consultation chat messaging with access locking upon expiry and doctor-reviewed follow-up requests.
   - Secure payment verification workflow with reviewer audit logging.

---

## 2. Features

### Patient Portal
- **Authentication**: JWT-based login, registration, and session management via HTTP-only cookies and Authorization headers.
- **Daily Glucose Logging**: Record readings for Morning, Breakfast, Lunch, and Dinner.
- **Real-Time Validation**:
  - Empty input -> `"Please enter a glucose value."`
  - Range < 40 or > 600 -> `"Value must be between 40 and 600 mg/dl."`
  - Future dates -> `"Date cannot be in the future."`
  - Duplicate slot -> `"You already have an [slot name] reading for this date."`
  - Daily limit -> `"You can add only 4 readings per day."`
  - Past dates -> Read-only (new readings restricted to current date).
  - Editing window -> `"Editing is available only within 4 hours of recording."`
- **Calendar & Trends**: Interactive calendar displaying completion dots, trends, and Recharts line visualizations.
- **Reports & CSV**: Export clinical CSV files matching exact required column headers.
- **Doctor Consultation**: Select doctors, choose consultation plans, view UPI QR code, and submit payment reference IDs.
- **Care Messaging**: Two-way encrypted chat with consulting doctors.
- **Notification Center**: Alerts for saved readings, reminders, payment reviews, and messages.

### Doctor Portal
- **Doctor Dashboard**: Summary of authorized patients, pending payment submissions, and review items.
- **Authorized Patients**: Read-only inspection of assigned patients' full glucose logs and daily trends.
- **Payment Verification Queue**: Review transaction reference IDs and approve or reject subscriptions with mandatory rejection reasons.
- **Follow-Up Management**: Review follow-up inquiries when a patient's normal chat is locked, granting temporary 48-hour access extensions.

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, React Router DOM 6, Recharts, Lucide React, Modern CSS System |
| **Backend** | Node.js 20+, Express.js, JWT, bcryptjs, cookie-parser, multer, node-cron |
| **Database** | PostgreSQL 15+ (`pg` connection pool with SSL) / `pg-mem` in-memory fallback |
| **Testing** | Vitest, Supertest, React Testing Library, JSDOM |
| **DevOps** | Docker, Docker Compose, Nginx, Render (`render.yaml` Blueprint) |

---

## 4. Architecture & Directory Structure

```
Sweety-Blood-Glucose-Tracker/
├── client/                     # React 18 + Vite frontend
│   ├── src/
│   │   ├── components/         # Sidebar, TopBar, ReadingModal, Toast
│   │   ├── context/            # AuthContext (state, role switcher, toast)
│   │   ├── pages/              # Dashboard, Tracking, Calendar, Analytics, Reports,
│   │   │                       # Doctors, Subscriptions, Chat, Notifications,
│   │   │                       # Profile, DoctorDashboard, DoctorPatients, DoctorRequests, Login, Register
│   │   ├── __tests__/          # Frontend React Testing Library tests
│   │   ├── api.js              # Centralized REST API client
│   │   ├── index.css           # Healthcare design system & responsive styling
│   │   └── main.jsx
│   ├── Dockerfile
│   └── vite.config.js
├── server/                     # Node.js + Express backend
│   ├── src/
│   │   ├── database/           # db.js (PostgreSQL + pg-mem adapter), seed.js
│   │   ├── middleware/         # auth.js (JWT authentication, role enforcement)
│   │   ├── routes/             # auth, readings, doctors, subscriptions, chat, notifications
│   │   ├── services/           # scheduler.js (daily slot reminders, subscription expiry)
│   │   ├── app.js              # Express app configuration & middleware
│   │   └── server.js           # Server entrypoint (PORT, bootstrap, 0.0.0.0 binding)
│   ├── tests/                  # Backend tests (auth.test.js, readings.test.js, platform.test.js)
│   └── Dockerfile
├── database/
│   └── schema.sql              # Normalized PostgreSQL DDL schema & indexes
├── docs/                       # Comprehensive technical documentation
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── API_SPECIFICATION.md
│   ├── DEPLOYMENT_GUIDE.md
│   └── DEMONSTRATION_SCRIPT.md
├── screenshots/                # 15 genuine captured application screenshots
├── scripts/                    # Automation and utility scripts
├── docker-compose.yml          # Multi-container orchestration (PostgreSQL + API + Client)
├── render.yaml                 # Render Infrastructure-as-Code Blueprint
├── .env.example                # Environment variables template
├── .gitignore
├── README.md
└── package.json                # Root workspace orchestration
```

---

## 5. Getting Started & Installation

### Prerequisites
- **Node.js** (v18 or higher recommended; v22 verified)
- **npm** (v9 or higher)
- **Git**
- *(Optional)* PostgreSQL 14+ or Docker (the backend automatically falls back to high-fidelity in-memory PostgreSQL for zero-friction local development)

### Step 1: Clone Repository
```bash
git clone https://github.com/chaitanyasivathmika19/Sweety-Blood-Glucose-Tracker.git
cd Sweety-Blood-Glucose-Tracker
```

### Step 2: Install Dependencies
```bash
# Install root, server, and client dependencies
npm install
npm run install:all
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration:
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sweety_db
JWT_SECRET=sweety_dev_secret_key_12345
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
APP_TIMEZONE=Asia/Kolkata
```

### Step 4: Run Database Seed (Optional)
```bash
npm run seed
```

### Step 5: Start Development Servers
```bash
# Concurrently start backend API (port 5000) and frontend (port 5173)
npm run dev
```
- Open [http://localhost:5173](http://localhost:5173) in your browser.
- Health Check: [http://localhost:5000/api/health](http://localhost:5000/api/health).

---

## 6. Running Automated Tests

The application includes automated tests covering authentication, glucose validation rules, reports, 4-hour editing window, ownership enforcement, and frontend modals:

```bash
# Run all tests (Server + Client)
npm test

# Run backend tests individually
cd server && npm test

# Run frontend React Testing Library tests individually
cd client && npm test
```

### Test Coverage Highlights
- **21 Backend API Tests**:
  - Registration, password hashing, duplicate email handling.
  - Glucose value boundaries (40 and 600).
  - Out-of-bounds rejection (< 40 and > 600).
  - Decimal value rejection.
  - Empty value rejection.
  - Future date rejection.
  - Duplicate time slot rejection.
  - Maximum 4 readings per day limit.
  - Cross-user data isolation (User A cannot view User B).
  - Daily, Month-to-date, Monthly report calculations.
  - Standard clinical CSV export formatting.
  - 4-hour editing window deadline enforcement.
- **8 Platform Integration Tests**:
  - Doctor-patient authorization.
  - Subscription fee and duration verification.
  - Payment approval / rejection workflows.
  - Chat locking upon expiry and follow-up requests.
- **5 Frontend Component Tests**:
  - Reading form validation, range enforcement, and error rendering.

---

## 7. Demo Accounts & Walkthrough

The development database is pre-seeded with sample patient records and verified doctor profiles:

| Account Type | Email | Password | Role |
|---|---|---|---|
| **Demo Patient** | `patient@sweety.com` | `Password123!` | Patient (`Chaitanya Sivathmika`) |
| **Demo Doctor** | `doctor@sweety.com` | `Password123!` | Doctor (`Dr. Ananya Rao - Endocrinologist`) |

> **Tip:** You can also use the one-click **"Patient view"** / **"Doctor view"** switcher located in the top bar to instantly toggle views during evaluation.

---

## 8. Consultation Plans & Business Rules

| Plan Name | Total Fee | Consultation Frequency | Subscription Validity |
|---|---|---|---|
| **Essential Care** | **₹250** | Every 30 days | **2 calendar months** |
| **Regular Care** | **₹400** | Every 15 days | **2 calendar months** |
| **Frequent Care** | **₹600** | Every 7 days | **2 calendar months** |

### Critical Business Logic
1. **Total Fee Coverage:** The fee covers the entire 2-month subscription period, not an individual consultation session.
2. **Consultation Frequency:** Determines how frequently clinical review checkpoints are scheduled during the active subscription.
3. **Calendar Month Expiry:** Expiry dates are calculated by adding exactly two calendar months to the activation timestamp.
4. **Authorized Access:** Doctors can only inspect glucose logs and reports of patients who have an active, verified subscription with them.
5. **Chat Locking:** Normal consultation chat locks when a subscription expires. Patients can submit follow-up requests which doctors may approve for a temporary 48-hour access extension.

---

## 9. Docker Deployment

To launch the full stack with local PostgreSQL using Docker:

```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`
- PostgreSQL: `localhost:5432`

---

## 10. Render Deployment Configuration

Sweety is ready for deployment on **Render**:

1. Fork or push to your GitHub repository:
   `https://github.com/chaitanyasivathmika19/Sweety-Blood-Glucose-Tracker`
2. In Render, select **New +** -> **Blueprint** and connect the repository.
3. Render automatically provisions:
   - **PostgreSQL Database** (`sweety-postgres`)
   - **Node.js Web Service** (`sweety-backend` on port `5000`, health path `/api/health`)
   - **Static Site** (`sweety-frontend`, build command `npm install && npm run build`, publish dir `dist`, SPA rewrite rule `/* -> /index.html`)
4. Refer to [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for full instructions.

### Deployment URLs
- **GitHub Repository**: [https://github.com/chaitanyasivathmika19/Sweety-Blood-Glucose-Tracker](https://github.com/chaitanyasivathmika19/Sweety-Blood-Glucose-Tracker)
- **Live Frontend**: Render Static Site (Configured via `render.yaml`)
- **Live Backend API**: Render Web Service (`/api/health`)

---

## 11. Screenshots

All screenshots are genuine captures of the running application:

| Screen | Description |
|---|---|
| `screenshots/01_login.png` | Clean login with 1-click demo access |
| `screenshots/02_register.png` | Patient / Doctor role registration |
| `screenshots/03_patient_dashboard.png` | Patient overview with daily progress, trend chart, slots, and stats |
| `screenshots/04_glucose_tracking.png` | Daily tracking slots with 4-hour countdown window |
| `screenshots/05_tracking_calendar.png` | Interactive monthly completion calendar (0/4 to 4/4) |
| `screenshots/06_analytics_charts.png` | Recharts trend visualization and summary analytics |
| `screenshots/07_reports_export.png` | Report generator with CSV export preview |
| `screenshots/08_doctor_discovery.png` | Doctor directory with specialization and experience |
| `screenshots/09_subscriptions_payment.png` | Consultation plan selection & payment submission |
| `screenshots/10_consultation_chat.png` | Real-time care conversations and follow-up requests |
| `screenshots/11_notifications.png` | Two-way notification center |
| `screenshots/12_doctor_dashboard.png` | Doctor portal overview with authorized patient activity |
| `screenshots/13_doctor_patients.png` | Authorized patient records inspector |
| `screenshots/14_doctor_payment_requests.png` | Payment verification queue with approve/reject workflow |
| `screenshots/15_mobile_layout.png` | Responsive mobile dashboard layout |

---

## 12. Notes & Assumptions

### Assumptions
- **Timezone**: Dates and daily slot caps are evaluated in the configured application timezone (`Asia/Kolkata` / Indian Standard Time by default) to guarantee that midnight rollover matches patient clinical expectations.
- **Two Calendar Months Calculation**: Expiry adds exactly 2 calendar months to the activation date using JavaScript `date.setMonth(date.getMonth() + 2)`. If activated on August 31, it expires on October 31.
- **Payment Verification**: Manual verification workflow is utilized to allow doctor confirmation of external UPI/bank transfers without third-party gateway credential dependencies.
- **Zero-Friction Fallback**: When `DATABASE_URL` is configured (such as on Render or local PostgreSQL), the backend connects directly to real PostgreSQL via `pg`. When running locally without a PostgreSQL server, it seamlessly falls back to `pg-mem` high-fidelity PostgreSQL engine so that tests and local inspection run out-of-the-box.

### What Could Be Improved With More Time
- **Automated Payment Gateway**: Integration with Razorpay or Stripe Webhooks for instant real-time reconciliation.
- **Push & SMS Alerts**: Integration with Firebase Cloud Messaging (FCM) or Twilio for WhatsApp/SMS medication and slot reminders.
- **Continuous Glucose Monitor (CGM) Sync**: Bluetooth / HealthKit API sync with Freestyle Libre or Dexcom sensors.
- **Redis Cache Layer**: Caching heavy historical aggregate reports with automated cache invalidation when a reading is created or updated.

---

## 13. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
