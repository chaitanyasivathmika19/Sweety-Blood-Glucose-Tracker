# Sweety Architecture & System Design

## 1. System Overview
**Sweety** is a healthcare web platform designed for daily diabetes management and continuous clinician consultations. It couples authentic, server-validated patient glucose tracking with subscription-based doctor care.

```
+-------------------------------------------------------------------------+
|                              SWEETY WEB UI                              |
|   (React 18, Vite, React Router, Recharts, Plus Jakarta Sans, CSS Sys)  |
+------------------------------------+------------------------------------+
                                     |  REST API / JSON / Cookies / JWT
                                     v
+-------------------------------------------------------------------------+
|                            EXPRESS BACKEND                              |
|           (Node.js 20+, JWT Auth, Express Middleware, Multer)          |
+-------------------+----------------+------------------+-----------------+
| Input Validators  | Ownership Auth | 4h Window Check  | Cron Scheduler  |
+-------------------+----------------+------------------+-----------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                          PERSISTENCE LAYER                              |
|  - Production: Render / Cloud PostgreSQL 15+ (pg connection pool)       |
|  - Test / Offline: pg-mem High-Fidelity PostgreSQL In-Memory Engine     |
+-------------------------------------------------------------------------+
```

## 2. Core Modules
- **Authentication & Role Authorization**: Multi-role support (`patient`, `doctor`). Passwords encrypted with `bcrypt` (10 salt rounds). Authorization tokens delivered through HTTP-only SameSite cookies and Bearer tokens.
- **Reading Engine**:
  - Exactly 4 daily slots: `Morning (fasting)`, `After breakfast`, `After lunch`, `After dinner`.
  - Range: 40–600 mg/dL (integers only).
  - Current-date-only rule: No backdated entries.
  - 4-Hour Editing Window: Enforced via immutable server `created_at` timestamp.
- **Reporting Engine**:
  - Daily: Selected date readings + count + lowest + highest + average (rounded to 1 decimal).
  - Month-to-date: 1st of current month to selected date.
  - Monthly: Full preceding calendar month.
  - CSV Export: Standard headers `Date, Time Slot, Glucose Value (mg/dL), Created At, Updated At`.
- **Doctor Consultation & Subscriptions**:
  - Plans: ₹250 (30d), ₹400 (15d), ₹600 (7d).
  - Validity: Full 2 calendar months.
  - Payment verification audit trail (Approve / Reject with reason).
  - Continuous chat messaging with auto-lock on expiration.
- **Two-Way Notifications**:
  - PostgreSQL-persisted events for readings, payments, schedule reminders, and messages.
  - Background scheduler (`node-cron`) for remaining daily slots.
