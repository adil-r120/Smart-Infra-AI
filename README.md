# 📡 Smart-Infra v2: AI Infrastructure Monitoring

> [!IMPORTANT]
> **Next-Generation Surveillance**: Smart-Infra is a high-performance, AI-driven platform for infrastructure monitoring. It leverages YOLOv8 and OpenVINO to detect, track, and log infrastructure anomalies in real-time.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **AI Engine** | Python, YOLOv8, OpenVINO (Intel Optimized), OpenCV |
| **Backend** | Python, FastAPI, SQLAlchemy, SQLite/MySQL |
| **Frontend** | React, Vite, TailwindCSS-like HUD Styling, Lucide Icons |
| **Automation** | Batch/VBS Silent Launch Scripts |

---

## 📁 Repository Architecture

This project follows a **"Backend-as-the-Brain"** architecture, where all AI logic and data processing are encapsulated within the backend service for maximum reliability.

- 🖥️ **`backend/`** — The central intelligence hub.
    - 🧠 **`ai/`** — Core AI models (`.pt`, `.xml`), training scripts, and detection logic.
    - 📡 **`main.py`** — FastAPI server and real-time WebSocket orchestrator.
- 🎨 **`frontend/`** — The visual "Command Center" (HUD).
    - 📊 **`src/pages/`** — Advanced dashboards and monitoring views.
    - 🏗️ **`src/api/`** — Centralized backend configuration.
- ⚡ **`scripts/`** — One-click automation scripts for production-like deployment.

---

## 🚀 Quick Start (Production Mode)

The fastest way to launch the entire system is using the pre-configured automation scripts:

1. **Launch the System**:
   ```powershell
   ./scripts/start_silent.bat
   ```
   *This will start both the Backend (FASTAPI) and Frontend (Vite) in optimized modes.*

2. **Access the HUD**:
   Open your browser and navigate to `http://localhost:5173`.

---

## 💻 Developer Setup (Manual Mode)

If you prefer to run services individually for debugging:

### 1. Initialize Backend & AI
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Initialize Frontend HUD
```powershell
cd frontend
npm install
npm run dev
```

---

## 🧠 AI Features
- **Real-Time Pothole Detection**: Custom-trained YOLOv8 model for infrastructure safety.
- **Traffic Analytics**: General class tracking (Person, Car, Truck, Bus, Motorcycle).
- **OpenVINO Optimization**: High FPS inference on standard CPU hardware (Intel i5+).
- **HUD Mode**: Minimalist surveillance interface for operators.

---

## 🛡️ Security & Notes
- **API Configuration**: All API endpoints are centralized in `frontend/src/api/config.ts`.
- **Mirroring**: The surveillance view uses a smart-mirroring system to correctly display HUD elements over flipped video feeds.

---

*Built with Advanced Infrastructure Monitoring.*
