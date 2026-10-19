# JARVIS Local ⚡

<div align="center">

# 🤖 JARVIS LOCAL

### Your local-first personal AI command center.

**More capable. More connected to your device. More feature-rich than JARVIS Web.**

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20Windows%20%7C%20macOS%20%7C%20Linux-111827)](#platform-support)
[![AI](https://img.shields.io/badge/AI-Gemini-4285F4?logo=google)](#ai--intelligence)
[![Mode](https://img.shields.io/badge/Mode-Local--First-00C853)](#local-first-design)

</div>

---

## 🧠 What is JARVIS Local?

**JARVIS Local** is the local-first edition of JARVIS — a personal AI assistant designed to work directly with the device that runs it.

Unlike a purely web-hosted assistant, JARVIS Local combines its futuristic interface with a **local Node.js command bridge**, allowing the interface to communicate with local files, device information, applications, system utilities, and other capabilities available on the host machine.

It also contains a broader feature set than **JARVIS Web**, bringing together AI, vision, voice, device controls, productivity tools, visual environments, and local automation in one JARVIS experience.

> **JARVIS Web is the web-focused experience. JARVIS Local is the deeper device-connected experience.**

---

## ✨ Why JARVIS Local?

| Capability | JARVIS Local | JARVIS Web |
|---|:---:|:---:|
| Local command execution | ✅ | Limited |
| Local files & device helpers | ✅ | Limited |
| Device status & utilities | ✅ | Limited |
| Local app launching | ✅ | Browser-dependent |
| Voice / wake phrase features | ✅ | ✅ |
| Camera & recording features | ✅ | ✅ |
| Vision Intelligence | ✅ | ✅ |
| Hand-gesture controls | ✅ | ✅ |
| AI-powered assistance | ✅ | ✅ |
| Local tasks, history & calculator | ✅ | ✅ |
| Diagnostics & focus tools | ✅ | ✅ |
| VELVE environment | ✅ | ✅ |
| Terra Nexus | ✅ | ✅ |
| Neon Nexus | ✅ | ✅ |
| 3D Core | ✅ | ✅ |
| Environment shortcuts | ✅ | ✅ |
| Local-first architecture | **✅** | — |

JARVIS Local is intended to be the **feature-rich, device-connected JARVIS environment**, while JARVIS Web focuses on the browser-based experience.

---

# 🚀 Core Features

## 🎙️ Voice & Wake Experience

- Voice interaction through the JARVIS interface
- Wake-phrase support
- Hands-free command flow
- Browser microphone integration
- Natural-language command handling

## 👁️ Vision Intelligence

JARVIS Local includes a vision-oriented experience for working with captured images and visual information.

- Image capture and analysis
- Visual inspection tools
- Key-fact discovery
- Uncertainty checking
- Visual explanations
- Camera integration

## 📷 Camera & Recording

JARVIS can interact with supported camera APIs for visual tasks and capture workflows.

- Photo capture
- Camera controls
- Recording-related functionality
- Vision analysis workflows

Actual camera capabilities depend on browser permissions and the device running JARVIS.

## 🖐️ Gesture Controls

JARVIS Local includes support for browser-based hand-gesture interaction, providing an additional way to interact with the interface beyond keyboard, mouse, and voice.

## 🧩 Local Device Control

Because the backend runs locally, JARVIS can provide functionality that a normal hosted webpage cannot safely perform by itself.

- Local command bridge
- File search and opening helpers
- Application launching
- Battery information
- Storage information
- Device status
- Timers
- Local utilities
- Diagnostics

> JARVIS executes local actions on the machine where its local server is running.

## 🧠 AI & Intelligence

JARVIS Local can use **Gemini** for general AI responses while keeping the local command layer available independently.

The Gemini API key is optional at startup:

- **Without a key:** local JARVIS commands can still work.
- **With a key:** AI-powered answers and Gemini-backed features become available.

Keep your real API key in `.env` and never commit it to GitHub.

---

# 🌌 JARVIS Environments

JARVIS Local is more than a chat interface. It includes multiple visual and interactive environments that are part of the JARVIS experience.

### 🌍 VELVE

A futuristic visual globe environment with simulated orbital markers and an immersive command-center presentation.

> The orbit markers are **simulated visual objects**, not live satellite telemetry or an authentic NORAD snapshot.

### 🌐 Terra Nexus

A JARVIS environment focused on Earth-oriented visual interaction and exploration.

### 💠 Neon Nexus

A futuristic visual environment designed around the JARVIS command-center aesthetic.

### 🧊 3D Core

A 3D-oriented JARVIS environment for immersive visual interaction and system presentation.

---

# 🛠️ Productivity & Utility Layer

JARVIS Local also brings together practical everyday tools:

- Local tasks
- Task history
- Calculator
- Diagnostics
- Focus detection
- Music search
- GitHub/platform search
- Universal service routing
- Environment shortcuts
- Device utilities

The goal is to make JARVIS feel like a **single command center instead of a collection of separate utilities**.

---

# 🔌 Local-First Design

JARVIS Local runs a small HTTP bridge bound to:

```text
127.0.0.1
```

This keeps the local interface connected to the local backend without exposing the command bridge publicly by default.

```text
┌─────────────────────────────┐
│        JARVIS Interface     │
│  Voice • Vision • HUD • 3D  │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      Local HTTP Bridge      │
│        127.0.0.1            │
└──────────────┬──────────────┘
               │
       ┌───────┼────────┐
       ▼       ▼        ▼
    Files    Device   System
             Tools    Actions
               │
               ▼
        Gemini / AI Layer
```

This architecture is what gives JARVIS Local capabilities that a normal browser-only assistant cannot directly provide.

---

# 📱 Platform Support

JARVIS Local is designed to run on the machine where the local server is started.

| Platform | Support |
|---|:---:|
| 🤖 Android / Termux | ✅ |
| 🪟 Windows | ✅ |
| 🍎 macOS | ✅ |
| 🐧 Linux | ✅ |
| 🌐 SSH-hosted Linux | ✅ |

Browser-dependent features such as microphone, camera, and gesture recognition require a compatible browser and the appropriate permissions.

---

# 📲 Android / Termux

JARVIS Local can run directly on Android through **Termux**.

```sh
pkg update
pkg install nodejs-lts git nano
termux-setup-storage
git clone https://github.com/anuveytq-sys/Jarvis-Local.git
cd Jarvis-Local
npm install
cp .env.example .env
nano .env
npm start
```

Then open:

```text
http://127.0.0.1:3000
```

on the same Android device.

For Termux storage access:

```sh
termux-setup-storage
```

For optional Termux battery/system integrations:

```sh
pkg install termux-api
```

---

# 🪟 Windows

Install Node.js 20+ and Git, then:

```powershell
git clone https://github.com/anuveytq-sys/Jarvis-Local.git
Set-Location Jarvis-Local
npm install
Copy-Item .env.example .env
notepad .env
npm start
```

Open `http://127.0.0.1:3000` on the same computer.

---

# 🍎 macOS / 🐧 Linux

```sh
git clone https://github.com/anuveytq-sys/Jarvis-Local.git
cd Jarvis-Local
npm install
cp .env.example .env
nano .env
npm start
```

For an SSH-hosted instance, use local port forwarding when needed:

```sh
ssh -L 3000:127.0.0.1:3000 user@your-host
```

Then open `http://127.0.0.1:3000` locally.

---

# ⚙️ Configuration

Create `.env` from the example file:

```dotenv
GEMINI_API_KEY=your_key_here
PORT=3000
```

### Environment variables

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Enables Gemini-backed AI responses |
| `PORT` | Local HTTP server port |

**Never commit your real `.env` file or expose your API key publicly.**

---

# 🧪 Checks

Run the project's checks with:

```sh
npm run check
```

Browser feature modules are syntax-checked in CI. Some web-backed capabilities require an Internet connection, while local commands continue to operate on the device running the server.

---

# 🗂️ Project Structure

```text
Jarvis-Local/
├── server.js              # Local JARVIS command / HTTP bridge
├── public/
│   ├── index.html         # JARVIS interface
│   └── modules/           # Feature modules
├── scripts/               # Checks and smoke tests
├── .env.example           # Environment configuration template
├── package.json
└── README.md
```

The local feature modules are kept under `public/modules/` so new JARVIS capabilities can be added without replacing the core local interface or backend.

---

# 🧭 JARVIS Roadmap

JARVIS Local is built to keep expanding toward a more capable personal command system.

- More local device integrations
- Better voice interaction
- More reliable camera and recording workflows
- Expanded Vision Intelligence
- More gesture controls
- More local automation
- Additional JARVIS environments
- Deeper Android / Termux integration
- More diagnostics and system tools
- Better cross-platform compatibility
- Continued feature parity and expansion beyond JARVIS Web

---

# 🔐 Security Notes

JARVIS Local is intentionally designed around a loopback address by default.

For safety:

- Keep the local server bound to `127.0.0.1` unless you understand the network implications.
- Never publish `.env` or API keys.
- Review local commands before granting additional system permissions.
- Use SSH port forwarding instead of exposing the local command bridge directly when remote access is required.

---

# 🤖 The JARVIS Philosophy

JARVIS Local is built around a simple idea:

> **One assistant. One command center. Your device, your tools, your AI.**

It combines the futuristic JARVIS interface with local execution, AI assistance, voice, vision, camera capabilities, gestures, utilities, immersive environments, and device-aware functionality.

**JARVIS Web brings JARVIS to the browser. JARVIS Local takes JARVIS closer to the device.**

---

<div align="center">

### ⚡ JARVIS LOCAL

**Local-first • AI-powered • Voice-enabled • Vision-aware • Device-connected**

Built to be more than a chatbot.

</div>
