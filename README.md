<div align="center">

# 🛡️ ServerGuard

**A Modern, Premium Server Monitoring & Management Platform**

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://reactjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.68+-009688.svg)](https://fastapi.tiangolo.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0+-38b2ac.svg)](https://tailwindcss.com)
[![Design](https://img.shields.io/badge/UI-Premium_Glassmorphism-purple.svg)](#-ui-overhaul)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

*Real-time system monitoring, file management, and terminal access in one powerful, visually stunning interface*

[🚀 Quick Start](#-quick-start) • [📊 Features](#-features) • [🎨 UI Overhaul](#-ui-overhaul) • [🔒 Security](#-security)

</div>

---

## 🎯 Overview

**ServerGuard** is a comprehensive monitoring platform optimized for **macOS** and Linux. It provides real-time system metrics, advanced network discovery, remote screen control, and a secure web terminal—all served through a **premium, glassmorphic UI overhaul** that prioritizes both aesthetics and functionality.

### 🌟 Key Enhancements
- **🎨 Premium UI Overhaul**: Transitioned to a sophisticated glassmorphic design system with deep indigos and vibrant accents.
- **🚀 Single-Port Architecture**: Backend and Frontend unified on port 8000.
- **🍎 macOS Optimized**: Native support for battery status, active application monitoring, and Mac-specific system metrics.
- **🔍 Advanced Network Tools**: High-performance device discovery with ARP/Ping scanning and asynchronous port scanning.

---

## ✨ Key Features

| **Modern Dashboard** | **Network Intelligence** | **Terminal & Control** |
|:---:|:---:|:---:|
| Premium Glassmorphic Analytics | Parallel device discovery (ARP/Ping) | WebSocket-based real-time terminal |
| **macOS Native**: Battery & Thermal info | Async port scanning (Common & Full) | Remote Screen Share & Control |
| Smooth Animations & Transitions | Real-time Packet Rate analysis | Command security & isolation |

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+**
- **Node.js 16+** (Only for initial build)

### ⚡ Automatic Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/abhins0554/ServerGuard
cd ServerGuard

# Run the startup script (Handles venv, deps, and build)
./start.sh    # macOS/Linux
start.bat     # Windows
```

The script will automatically:
1. Create a Python virtual environment.
2. Install all backend and frontend dependencies.
3. Build the React production bundle.
4. Launch the application on **http://localhost:8000**.

### 💼 Access
- **Dashboard**: [http://localhost:8000](http://localhost:8000)
- **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Authentication**: Configured via `.env` (See `.env.example`)

---

## 🍎 macOS Optimized Features

ServerGuard is designed with a "Mac-First" philosophy, providing features specifically for macOS users:

- **Battery Analytics**: Monitor health, percentage, and power source for MacBooks.
- **App Lifecycle**: Track user-facing applications currently running on your system.
- **Terminal Integration**: Native shell access optimized for Zsh and Bash on Darwin.
- **Thermal Monitoring**: (In progress) Support for Apple Silicon thermal sensors.

---

## 🛠️ Tech Stack

### Backend
- **FastAPI**: Modern, high-performance Python framework.
- **psutil**: Cross-platform system and process utilities.
- **uvicorn**: Lightning-fast ASGI server implementation.
- **AsyncIO**: Batched parallel task execution for network tools.

### Frontend
- **React 18**: Component-based UI with ultra-fast responsiveness.
- **Tailwind CSS**: Modern utility-first styling for a premium feel.
- **Lucide**: Clean and consistent iconography.
- **Axios**: Optimized API communication with custom timeout management.

---

## 🔒 Security & Configuration

### Environment Variables
Configure your server using `.env` (use `.env.example` as a template):

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
SECRET_KEY=generate_a_random_string
HOST=0.0.0.0
PORT=8000
```

### Protection Layers
- **No-Timeout Discovery**: Deep network scans are supported via custom timeout overrides.
- **Command Blocking**: Dangerous CLI commands are blocked by the terminal router.
- **JWT Ready**: Prepared for full token-based OAuth2 integration.

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**⭐ Star this repository if you find it useful!**

**🔗 [Report Issues](https://github.com/abhins0554/ServerGuard/issues) • [View on GitHub](https://github.com/abhins0554/ServerGuard)**

</div>
ub](https://github.com/abhins0554/ServerGuard) • [Star Repository](https://github.com/abhins0554/ServerGuard)**

---

**⚠️ Note**: This tool is designed for self-hosted environments. For production use, ensure proper security configurations and consider implementing additional authentication mechanisms.

</div> 