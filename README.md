# BlinkMark — Windows Setup Guide

## Prerequisites

### 1. Python (3.8–3.10 recommended)

Download from: https://www.python.org/downloads/

During installation, **tick "Add Python to PATH"**.

Verify:
```powershell
python --version
```

### 2. MongoDB Community Server

Download from: https://www.mongodb.com/try/download/community

Install with default settings (runs MongoDB as a Windows Service).

Verify it is running:
```powershell
Get-Service -Name MongoDB
```

Or start it manually:
```powershell
net start MongoDB
```

### 3. Node.js (LTS)

Download from: https://nodejs.org/

Verify:
```powershell
node --version
npm --version
```

---

## Backend Setup

Open a PowerShell or Command Prompt window and run:

```powershell
# 1. Navigate to backend folder
cd C:\Users\ATHARVA\.gemini\antigravity\scratch\attendance-system\backend

# 2. Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

> On first run, InsightFace will download the `buffalo_l` model (~300 MB).  
> The API will be available at: http://localhost:8000  
> Swagger docs at: http://localhost:8000/docs

---

## Frontend Setup

Open a **second** PowerShell window:

```powershell
# 1. Navigate to frontend folder
cd C:\Users\ATHARVA\.gemini\antigravity\scratch\attendance-system\frontend

# 2. Install Node dependencies
npm install

# 3. Start the development server
npm start
```

> The app will open at: http://localhost:3000

---

## Quick Start (Both together)

```powershell
# Terminal 1 — Backend
cd C:\Users\ATHARVA\.gemini\antigravity\scratch\attendance-system\backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd C:\Users\ATHARVA\.gemini\antigravity\scratch\attendance-system\frontend
npm start
```

---

## PowerShell Execution Policy (if venv activation fails)

If you see "cannot be loaded because running scripts is disabled", run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## Usage Flow

1. Open http://localhost:3000
2. Click **Register Student** → fill details → Capture Face (blink during the 3-second window)
3. Click **Mark Attendance** → select a course → Capture Face (blink again)
4. Click **Teacher Login** → Register a teacher account → Login → view Dashboard panels

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `ModuleNotFoundError: mediapipe` | Run `pip install mediapipe` inside the venv |
| InsightFace download stuck | Check internet connection; model downloads to `~/.insightface/` |
| `MongoServerError: connect ECONNREFUSED` | Start MongoDB: `net start MongoDB` |
| Camera not accessible | Allow browser camera access in Windows Settings → Privacy → Camera |
| `npm ERR! ERESOLVE` | Run `npm install --legacy-peer-deps` |
| PowerShell venv error | Run `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |
