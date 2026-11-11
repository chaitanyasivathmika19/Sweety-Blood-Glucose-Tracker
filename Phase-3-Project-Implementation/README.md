# Phase 3 — Full-Stack Project Implementation

This directory contains the production-ready full-stack application for **Sweety — Blood Glucose Tracker & Doctor Consultation Platform**.

Built using **Node.js, Express, PostgreSQL, and React 18 (Vite)**, this implementation strictly fulfills both the **Kenpath Engineering Assignment** requirements and the complete **Phase 1 & Phase 2 Sweety specifications**.

---

## Directory Overview
- `client/` — React 18 + Vite frontend with responsive healthcare UI matching the Phase 2 prototype (`https://chaitanyasivathmika19.github.io/Glucose-tracker-prototype/`).
- `server/` — Express REST API with bcrypt authentication, rate limiting, and 4-hour window validation.
- `database/` — Normalized PostgreSQL schema (`schema.sql`) and seeding engine (`seed.js`).
- `tests/` — Automated test suites using Vitest, Supertest, and React Testing Library (34 tests passing).
- `.env.example` — Environment variables configuration template.

---

## Quick Start (Phase 3)

### 1. Install Dependencies
```bash
# In Phase-3-Project-Implementation:
npm install --prefix server
npm install --prefix client
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Default configuration connects to real PostgreSQL via `DATABASE_URL` or automatically falls back to high-fidelity in-memory PostgreSQL for zero-friction local development and testing.

### 3. Run Automated Tests (34 Tests Passing)
```bash
# Run backend tests (29 tests)
npm test --prefix server

# Run frontend React Testing Library tests (5 tests)
npm test --prefix client
```

### 4. Start Development Servers
```bash
# In one terminal (or concurrently):
npm run dev --prefix server   # Backend on http://localhost:5000
npm run dev --prefix client   # Frontend on http://localhost:5173
```

---

## Kenpath Validation & Business Rules Enforced

| Rule | Exact UI / API Error Message |
|---|---|
| Value is empty | `"Please enter a glucose value."` |
| Value not whole number 40–600 | `"Value must be between 40 and 600 mg/dl."` |
| Reading already exists for slot & date | `"You already have an [slot name] reading for this date."` |
| Maximum 4 readings per calendar day | `"You can add only 4 readings per day."` |
| Date in future | `"Date cannot be in the future."` |
| Edited after 4 hours of creation | `"Editing is available only within 4 hours of recording."` |
| Past date entry attempt | New readings restricted strictly to current date (past dates read-only) |

---

## Demo Accounts
- **Patient Account:** `patient@sweety.com` / `Password123!`
- **Doctor Account:** `doctor@sweety.com` / `Password123!`

