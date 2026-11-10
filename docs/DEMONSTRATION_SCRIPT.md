# Sweety 2–3 Minute Application Demonstration Script

This concise script guides you through demonstrating the completed **Sweety** application for evaluation, assignment submission, or client presentations.

---

## Pre-Requisites & Starting the App
```bash
# In Sweety-Blood-Glucose-Tracker root directory
npm run dev
# Backend runs on http://localhost:5000
# Frontend runs on http://localhost:5173
```

---

## 2–3 Minute Walkthrough

### 0:00 – 0:30 | Authentication & Role Switch
1. **Open** `http://localhost:5173/login`.
2. Notice the clean healthcare UI (Teal & Lavender branding).
3. Click the **"Demo Patient"** button (or enter `patient@sweety.com` / `Password123!`).
4. Click **Sign In**.
5. Point out the top bar with patient credentials, notifications badge, and top-right **"Patient view / Doctor view"** role switcher.

### 0:30 – 1:15 | Kenpath Mandatory Features: Glucose Logging & Validation
1. Click **Glucose tracking** (`/tracking`) or view the 4 daily slots on the Overview dashboard.
2. Demonstrate the 4 daily slots:
   - `Morning (fasting)`
   - `After breakfast`
   - `After lunch`
   - `After dinner`
3. Click **"+ Record"** on an empty slot to show the modal dialog:
   - Submit without typing a number -> Highlights exact required error:
     `"Please enter a glucose value."`
   - Enter `35` (below 40) -> Highlights exact required error:
     `"Value must be between 40 and 600 mg/dl."`
   - Enter `650` (above 600) -> Highlights exact required error:
     `"Value must be between 40 and 600 mg/dl."`
   - Enter a valid integer, e.g., `118` -> Click **Save reading**.
4. Show that the slot updates to **Recorded** with the current timestamp.
5. Click **"Edit"** on a recently recorded reading:
   - Note the active 4-hour countdown window.
   - Explain that editing after 4 hours is rejected with the exact error:
     `"Editing is available only within 4 hours of recording."`
   - Note that editing does not extend or reset the 4-hour deadline.

### 1:15 – 1:45 | Reports, Analytics & CSV Export
1. Click **Reports & exports** (`/reports`):
   - Toggle **Daily report** -> displays today's readings, highest, lowest, average (rounded to 1 decimal), and reading count.
   - Toggle **Month-to-date report** -> shows full month progression from 1st of month.
   - Toggle **Previous full month** -> shows previous calendar month data.
2. Click **"Export CSV Report"** button:
   - File downloads immediately (`sweety-glucose-report.csv`).
   - Open or inspect the CSV headers:
     `"Date","Time Slot","Glucose Value (mg/dL)","Created At","Updated At"`
3. Navigate to **Charts & statistics** (`/analytics`) to show the interactive Recharts glucose trend line chart.

### 1:45 – 2:30 | Doctor Portal, Consultation Plans & Subscriptions
1. Click **My consultation** (`/subscriptions`):
   - Show the 3 consultation tiers:
     - ₹250 (Every 30 days)
     - ₹400 (Every 15 days)
     - ₹600 (Every 7 days)
   - Explain the business rule: **Fee covers a full 2-calendar-month validity, not an individual consultation.**
   - Show doctor's UPI payment QR placeholder.
   - Show the transaction reference submission workflow.
2. Use the top-right role switcher to click **"Doctor view"**:
   - Switches instantly to `Dr. Ananya Rao` (`/doctor`).
   - Open **Requests & payments** (`/doctor/requests`) to see pending payment verification queue.
   - Demonstrate the **Approve** button (activates 2-month subscription) and **Reject** button (requires rejection reason and notifies patient).
   - Open **Authorized patients** (`/doctor/patients`) to inspect real patient records.
3. Open **Messages** (`/chat`):
   - Show continuous patient-doctor consultation messaging.
   - Note the follow-up request feature that handles temporary chat unlocks when subscriptions expire.
