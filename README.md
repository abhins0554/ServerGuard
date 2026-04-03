<div align="center">

# ServerGuard

**Self-hosted server monitoring and management with a modern web UI**

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://reactjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688.svg)](https://fastapi.tiangolo.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38b2ac.svg)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Real-time metrics, files, terminal, screen control, Docker, packages, and network tools in one place.

[Quick start](#quick-start) · [Features](#features) · [Development](#development) · [Screen sharing](#screen-sharing--remote-control) · [Configuration](#configuration)

</div>

---

## Overview

ServerGuard is a **FastAPI** backend and **React** dashboard for monitoring and managing a machine you control. It targets **macOS** and **Linux** (with best-effort support elsewhere). The UI uses a **glass-style**, Mac-like layout with light and dark themes.

**Production** mode serves the built React app from the same port as the API (typically **8000**). **Development** often runs the API on **8000** and Create React App on **3000**, with HTTP proxied to the API and WebSockets pointed at the API explicitly.

---

## Features

| Area | What you get |
|------|----------------|
| **Dashboard** | Live summary: CPU, memory, disk, network, and quick links into detail views. |
| **CPU / Memory / Disk / Network** | Detailed metrics, charts, and tables with a consistent frosted-card layout. |
| **OS info** | Platform details; on macOS, CPU naming prefers marketing strings (e.g. Apple M-series) where available. |
| **Processes** | Sortable process list with CPU/memory usage. |
| **Terminal** | WebSocket shell session with reconnection logic; falls back to HTTP where needed. |
| **File manager** | Browse directories, preview files, download; API validates directory responses. |
| **Screen sharing** | Low-latency JPEG stream over WebSockets; remote pointer, keyboard, scroll, and touch-friendly gestures (see below). |
| **Network tools** | Ping, traceroute, port scan, LAN device discovery, connection listing. |
| **Docker** | List containers and images, logs, stats, start/stop/restart/remove (when Docker is available). |
| **Packages** | Installed packages, update checks, and search (OS-dependent). |
| **Auth** | Login via `/api/auth/login`; the UI stores a bearer token for API calls. |

---

## Quick start

### Prerequisites

- **Python 3.8+**
- **Node.js 16+** and **npm** (for installing and building the frontend)

### Option A — Shell script (macOS / Linux)

```bash
git clone https://github.com/abhins0554/ServerGuard.git
cd ServerGuard
chmod +x start.sh
./start.sh
```

This runs `start.py`, which can set up a virtual environment, install dependencies, and start **both** the backend and the frontend dev server (see `start.py` for exact behavior).

### Option B — Python starter

```bash
cd ServerGuard
python3 start.py
```

### Option C — Production-style (API + static UI on one port)

```bash
cd ServerGuard/backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cd ../frontend
npm ci
npm run build

cd ../backend
# Ensure frontend/build exists (created by npm run build)
uvicorn main:app --host 0.0.0.0 --port 8000
```

Open **http://localhost:8000** — the app and API share that origin.

### Option D — Frontend and backend separately (development)

```bash
# Terminal 1 — API
cd ServerGuard/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — React (proxies /api to :8000 per frontend/package.json)
cd ServerGuard/frontend
npm install
npm start
```

Open **http://localhost:3000**. WebSockets for terminal and screen sharing resolve to **port 8000** automatically when the page is served from **:3000**; override with `REACT_APP_API_URL` if your API is elsewhere.

- **API interactive docs:** http://localhost:8000/docs  

---

## Development

| Topic | Notes |
|--------|--------|
| **Frontend proxy** | `frontend/package.json` includes `"proxy": "http://localhost:8000"` so browser calls to `/api/...` hit the backend during `npm start`. |
| **WebSockets** | Screen and terminal sockets should target the **FastAPI** host/port. The app uses `REACT_APP_API_URL` when set; otherwise on port **3000** it uses **`:8000`** on the same hostname. |
| **CRA + React 19** | `frontend/.npmrc` sets `legacy-peer-deps=true` because `react-scripts@5` still declares React 18 peers; installs remain valid. |
| **Webpack / ajv** | Direct dependencies **`ajv`** and **`ajv-keywords`** are pinned so `npm run build` works with current npm hoisting (avoids `ajv` v6/v9 conflicts under `react-scripts`). |
| **PWA manifest** | `frontend/public/manifest.json` is included for installable/metadata behavior; keep it valid JSON. |

---

## Screen sharing & remote control

Screen capture uses **mss** and **Pillow**; input uses **PyAutoGUI** on the server. **Accessibility / screen recording** permissions may be required on macOS for capture and control to work.

**Mouse / trackpad (viewer)**

- Move and click on the stream to move the remote cursor and click.
- **Wheel:** vertical scroll; combined horizontal + vertical deltas where the browser provides them; **Shift + wheel** for horizontal scroll.
- **Keyboard:** focus the dark viewer area, then type (modifiers are forwarded as mapped by the client).

**Touch (viewer)**

- **One finger:** press and drag — remote **mouse down / move / up** for dragging and tapping.
- **Two fingers — pan:** move both contacts together to send **vertical and horizontal** scroll at the midpoint.
- **Two fingers — pinch / spread:** keep the center of the gesture roughly still and pinch or spread to zoom the **remote** UI via **Cmd + / −** (macOS) or **Ctrl + / −** (other platforms).

Horizontal scrolling on the server depends on OS support for PyAutoGUI’s horizontal scroll API.

---

## Configuration

Copy **`.env.example`** to **`.env`** in the project root (or set the same variables in your environment).

| Variable | Purpose |
|----------|---------|
| `ADMIN_USERNAME` | Web login username |
| `ADMIN_PASSWORD` | Web login password |
| `SECRET_KEY` | Secret used by the app configuration (change in production) |
| `HOST` | Bind address (e.g. `0.0.0.0`) |
| `PORT` | API port (default `8000`) |
| `LOG_LEVEL` | Logging verbosity |
| `DEBUG` | Debug-oriented behavior where implemented |

**Frontend (optional)**

| Variable | Purpose |
|----------|---------|
| `REACT_APP_API_URL` | Base URL of the API, e.g. `http://192.168.1.10:8000` — use when the UI is **not** served from the same origin as the API. |

---

## Security

- Intended for **trusted networks** and **self-hosted** use. Lock down `HOST`/`PORT`, use strong passwords, and restrict exposure with a firewall or reverse proxy in production.
- After login, the UI uses a **static bearer token** (`valid-token` in the default flow), not a signed JWT. Treat this as a simple gate, not enterprise IAM.
- The terminal and file routes enforce **command/path policies** where implemented; review `backend/routers` before exposing broadly.
- **CORS** is currently permissive in code; tighten `allow_origins` for production.

---

## Tech stack

**Backend:** FastAPI, Uvicorn, psutil, WebSockets, python-jose, passlib, mss, Pillow, PyAutoGUI, pydantic, aiofiles.

**Frontend:** React 18, React Router, Tailwind CSS, Axios, Lucide icons, Recharts (where used).

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

1. Fork the repository  
2. Create a branch (`git checkout -b feature/your-feature`)  
3. Commit with clear messages  
4. Open a pull request  

---

## License

This project is released under the **MIT License** — see [LICENSE](LICENSE).

---

<div align="center">

If you use ServerGuard, consider starring the repo on [GitHub](https://github.com/abhins0554/ServerGuard).  
**Issues:** [github.com/abhins0554/ServerGuard/issues](https://github.com/abhins0554/ServerGuard/issues)

**Disclaimer:** ServerGuard is powerful (shell, files, screen control). Run it only on systems you own or are authorized to administer, and harden it before any production or internet-facing deployment.

</div>
