# Phase 4 — Deployment & Hosting

This directory contains the production deployment, containerization, and hosting configurations for **Sweety — Blood Glucose Tracker & Doctor Consultation Platform**.

---

## 1. Hosting Architecture Overview

1. **Frontend Hosting:**
   - **Render Static Site:** Automatically builds and serves the React production bundle (`dist`) with client-side SPA routing (`/* -> /index.html`).
   - **GitHub Pages:** Compatible with static prototype and client builds.
2. **Backend API Hosting:**
   - **Render Web Service:** Node.js Express service running on port `5000` with automated health checks at `/api/health`.
3. **Database Hosting:**
   - **Render Managed PostgreSQL:** High-availability PostgreSQL 15+ database instance connected securely via `DATABASE_URL`.
4. **Container Orchestration:**
   - **Docker Compose:** Multi-container configuration (`docker-compose.yml`) spinning up PostgreSQL, Node.js API, and Nginx-served frontend simultaneously.

---

## 2. Included Deployment Files
- `render.yaml` — Infrastructure-as-Code Blueprint for one-click deployment on Render.
- `docker-compose.yml` — Local/VPS container orchestration for PostgreSQL + Backend + Frontend.
- `docs/DEPLOYMENT_GUIDE.md` — Step-by-step instructions for deploying to Render and GitHub.
- `docs/DEMONSTRATION_SCRIPT.md` — 2–3 minute video recording walkthrough script for recruiters.
- `screenshots/` — 15 genuine application screenshots demonstrating all core workflows.

---

## 3. One-Click Render Blueprint Deployment
1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** -> **Blueprint**.
3. Connect repository: `https://github.com/chaitanyasivathmika19/Sweety-Blood-Glucose-Tracker`.
4. Render automatically parses `render.yaml` to provision the database, backend web service, and frontend static site.
5. Click **Apply**.
