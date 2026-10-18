# JARVIS Local

JARVIS Local is a **terminal-run personal assistant**. It is not a public/hosted web service. It starts a small HTTP bridge bound only to `127.0.0.1` so its preserved `public/index.html` interface can call local device commands safely.

## What is preserved and added

- Preserves the existing local command engine in `server.js`, the current `public/index.html`, file search/open helpers, app launching, battery/storage/device status, timers, and Gemini backend.
- Adds compatible JARVIS-Web feature modules: universal service routing, GitHub/platform search, wake phrase, hand-gesture controls, camera and recording fixes, music search, local tasks/history/calculator/diagnostics, focus detector, VELVE globe, Terra Nexus, Neon Nexus, 3D core, Vision Intelligence, and environment shortcuts.
- Keeps all new browser modules under `public/modules/`; they do not replace the local HTML or the local system-command backend.
- VELVE includes 240 **simulated** orbit markers for offline reliability. They are visual simulation objects, not live telemetry or an authentic NORAD snapshot.
- The Gemini key is optional at startup. Local commands remain available without it; general AI answers require a key in `.env`.

## Requirements

- Node.js **20 or newer**
- Git
- For microphone/camera features, use a browser that supports the relevant APIs and grant permission when prompted.
- For Termux file access, run `termux-setup-storage` once and approve Android's permission prompt.
- For Termux battery reporting, optionally install the Termux:API companion app and run `pkg install termux-api`.

## Android / Termux

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

Put your own key in `.env` if you want Gemini answers:

```dotenv
GEMINI_API_KEY=your_key_here
PORT=3000
```

Leave `GEMINI_API_KEY=` blank to use local commands without online AI. Never commit your real `.env` file.

On the same Android device, open `http://127.0.0.1:3000` in your browser while JARVIS is running in Termux. Keep the terminal session running.

## Windows PowerShell

Install Node.js 20+ and Git, then run:

```powershell
git clone https://github.com/anuveytq-sys/Jarvis-Local.git
Set-Location Jarvis-Local
npm install
Copy-Item .env.example .env
notepad .env
npm start
```

Open `http://127.0.0.1:3000` on that same computer. PowerShell/system actions execute on the computer running JARVIS.

## macOS / Linux / SSH

```sh
git clone https://github.com/anuveytq-sys/Jarvis-Local.git
cd Jarvis-Local
npm install
cp .env.example .env
nano .env
npm start
```

For an SSH-hosted terminal, JARVIS remains bound to the remote loopback interface. From your own computer, use SSH port forwarding, for example:

```sh
ssh -L 3000:127.0.0.1:3000 user@your-host
```

Then open `http://127.0.0.1:3000` locally. Do not change the bind address to `0.0.0.0` unless you deliberately configure authentication and network security.

## Checks

```sh
npm run check
```

The browser-only feature modules are syntax-checked in CI. Some web-backed features need an Internet connection; local file/system commands continue to run on the device that started the terminal server.
