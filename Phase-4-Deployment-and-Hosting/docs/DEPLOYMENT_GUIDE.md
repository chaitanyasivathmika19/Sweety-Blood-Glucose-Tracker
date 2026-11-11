# Sweety Render Deployment Guide

Sweety is architected for deployment on Render using modern, decoupled cloud services:

1. **Frontend:** Render Static Site (React 18 / Vite build)
2. **Backend:** Render Web Service (Node.js / Express API)
3. **Database:** Render Managed PostgreSQL 15+

---

## 1. One-Click Blueprint Deployment (`render.yaml`)

The repository includes a root `render.yaml` Blueprint specification. To deploy automatically:

1. Log into your Render dashboard at [render.com](https://render.com).
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repository:
   `https://github.com/chaitanyasivathmika19/Sweety-Blood-Glucose-Tracker`
4. Render will parse `render.yaml` and configure:
   - `sweety-postgres` database instance
   - `sweety-backend` web service
   - `sweety-frontend` static site
5. Click **Apply**.

---

## 2. Manual Step-by-Step Deployment

If deploying individual services manually:

### A. Deploy Managed PostgreSQL Database
1. Go to **New +** -> **PostgreSQL**.
2. Name: `sweety-postgres`
3. Database: `sweety_db`
4. User: `sweety_user`
5. Select **Free tier**.
6. Once provisioned, copy the **Internal Database URL** (e.g. `postgresql://sweety_user:password@dpg-xxx:5432/sweety_db`).

### B. Deploy Backend Web Service
1. Go to **New +** -> **Web Service**.
2. Connect `Sweety-Blood-Glucose-Tracker`.
3. Settings:
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/server.js`
   - **Health Check Path:** `/api/health`
4. Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `DATABASE_URL`: *(paste the Internal Database URL from step A)*
   - `JWT_SECRET`: *(enter any secure random string)*
   - `FRONTEND_URL`: `https://your-frontend-name.onrender.com`
5. Click **Create Web Service**.

### C. Deploy Frontend Static Site
1. Go to **New +** -> **Static Site**.
2. Connect `Sweety-Blood-Glucose-Tracker`.
3. Settings:
   - **Root Directory:** `client`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Environment Variables:
   - `VITE_API_BASE_URL`: `https://your-backend-name.onrender.com/api`
5. Rewrites / Redirects:
   - Add a rewrite rule:
     - **Source:** `/*`
     - **Destination:** `/index.html`
     - **Action:** `Rewrite`
6. Click **Create Static Site**.

---

## 3. Production Verification Checklist
- [x] Access `https://your-backend.onrender.com/api/health` -> returns `status: "ok"`
- [x] Access `https://your-frontend.onrender.com` -> UI renders cleanly
- [x] Test Registration and Login
- [x] Add daily glucose readings with range validation
- [x] Verify report calculations and download CSV
- [x] Browse doctors, submit payment reference, and test review flow
