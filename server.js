import express from "express";
import { exec, execFile } from "child_process";
import { promisify } from "util";
import os from "os";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import geminiModule from "./gemini.cjs";

const { askGemini } = geminiModule;
const execAsync = promisify(exec);
const app = express();
const PORT = Number(process.env.PORT || 3000);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ═══════════════════════════════════════
// PLATFORM DETECTION
// ═══════════════════════════════════════

const PLATFORM = process.platform; // 'win32' | 'darwin' | 'linux'
const IS_WINDOWS = PLATFORM === "win32";
const IS_MAC = PLATFORM === "darwin";
const IS_LINUX = PLATFORM === "linux";
const IS_TERMUX = IS_LINUX && (
  Boolean(process.env.TERMUX_VERSION) ||
  String(process.env.PREFIX || "").toLowerCase().includes("com.termux") ||
  /android/i.test(os.release())
);

function run(command, timeout = 12000) {
  return new Promise((resolve) => {
    exec(command, { timeout, shell: true, windowsHide: true }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        output: (stdout || "").trim(),
        error: (stderr || error?.message || "").trim()
      });
    });
  });
}

function reply(res, text, extra = {}) {
  return res.json({
    ok: true,
    reply: text,
    ...extra
  });
}

function has(text, words) {
  return words.some((word) => text.includes(word));
}

function clean(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s:/.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function quote(text) {
  const value = String(text);
  if (IS_WINDOWS) return '"' + value.replace(/"/g, '\\"') + '"';
  return "'" + value.replace(/'/g, "'\\''") + "'";
}


// ═══════════════════════════════════════
// CROSS-PLATFORM APP CATALOG + LAUNCHER
// Android uses package IDs; desktop systems use native launchers.
// Unknown app names are handled dynamically and never installed silently.
// ═══════════════════════════════════════

const KNOWN_APPS = {
  whatsapp: "com.whatsapp", "whats app": "com.whatsapp",
  instagram: "com.instagram.android", facebook: "com.facebook.katana",
  messenger: "com.facebook.orca", telegram: "org.telegram.messenger",
  twitter: "com.twitter.android", x: "com.twitter.android",
  snapchat: "com.snapchat.android", linkedin: "com.linkedin.android",
  discord: "com.discord", reddit: "com.reddit.frontpage",
  youtube: "com.google.android.youtube", "youtube music": "com.google.android.apps.youtube.music",
  gmail: "com.google.android.gm", chrome: "com.android.chrome",
  "google chrome": "com.android.chrome", maps: "com.google.android.apps.maps",
  "google maps": "com.google.android.apps.maps", drive: "com.google.android.apps.docs",
  "google drive": "com.google.android.apps.docs", photos: "com.google.android.apps.photos",
  "google photos": "com.google.android.apps.photos", playstore: "com.android.vending",
  "play store": "com.android.vending", "google play": "com.android.vending",
  settings: "com.android.settings", camera: "com.android.camera",
  gallery: "com.google.android.apps.photos", files: "com.google.android.documentsui",
  "file manager": "com.google.android.documentsui", phone: "com.google.android.dialer",
  contacts: "com.google.android.contacts", messages: "com.google.android.apps.messaging",
  sms: "com.google.android.apps.messaging", calculator: "com.google.android.calculator",
  clock: "com.google.android.deskclock", calendar: "com.google.android.calendar",
  firefox: "org.mozilla.firefox", brave: "com.brave.browser",
  opera: "com.opera.browser", spotify: "com.spotify.music",
  netflix: "com.netflix.mediaclient", amazon: "in.amazon.mShop.android.shopping",
  flipkart: "com.flipkart.android", truecaller: "com.truecaller",
  paytm: "net.one97.paytm", phonepe: "com.phonepe.app",
  gpay: "com.google.android.apps.nbu.paisa.user", "google pay": "com.google.android.apps.nbu.paisa.user",
  uber: "com.ubercab", ola: "com.olacabs.customer",
  zoom: "us.zoom.videomeetings", teams: "com.microsoft.teams",
  "microsoft teams": "com.microsoft.teams", slack: "com.Slack",
  notion: "notion.id", chatgpt: "com.openai.chatgpt",
  claude: "com.anthropic.claude", grok: "ai.x.grok", termux: "com.termux",
  capcut: "com.lemon.lvoverseas", pinterest: "com.pinterest",
  tiktok: "com.zhiliaoapp.musically", "microsoft outlook": "com.microsoft.office.outlook",
  outlook: "com.microsoft.office.outlook", onedrive: "com.microsoft.skydrive",
  "one drive": "com.microsoft.skydrive", word: "com.microsoft.office.word",
  excel: "com.microsoft.office.excel", powerpoint: "com.microsoft.office.powerpoint",
  "google docs": "com.google.android.apps.docs.editors.docs",
  "google sheets": "com.google.android.apps.docs.editors.sheets",
  "google slides": "com.google.android.apps.docs.editors.slides",
  minecraft: "com.mojang.minecraftpe", roblox: "com.roblox.client",
  steam: "com.valvesoftware.android.steam.community",
  "play games": "com.google.android.play.games"
};

const APP_ALIASES = {
  "music": "spotify", "play music": "spotify", "email": "gmail", "mail": "gmail",
  "web browser": "chrome", "internet browser": "chrome", "photos app": "photos",
  "messages app": "messages", "text messages": "messages", "ai": "chatgpt",
  "ai assistant": "chatgpt", "video app": "youtube", "video player": "youtube",
  "social media": "instagram", "video calls": "zoom", "meeting app": "zoom",
  "file browser": "file manager", "documents": "files", "app store": "play store"
};

const DESKTOP_APPS = {
  chrome: { win: "chrome", mac: "Google Chrome", linux: "google-chrome" },
  "google chrome": { win: "chrome", mac: "Google Chrome", linux: "google-chrome" },
  firefox: { win: "firefox", mac: "Firefox", linux: "firefox" },
  edge: { win: "msedge", mac: "Microsoft Edge", linux: "microsoft-edge" },
  "microsoft edge": { win: "msedge", mac: "Microsoft Edge", linux: "microsoft-edge" },
  spotify: { win: "Spotify", mac: "Spotify", linux: "spotify" },
  discord: { win: "Discord", mac: "Discord", linux: "discord" },
  slack: { win: "slack", mac: "Slack", linux: "slack" },
  vscode: { win: "code", mac: "Visual Studio Code", linux: "code" },
  "vs code": { win: "code", mac: "Visual Studio Code", linux: "code" },
  code: { win: "code", mac: "Visual Studio Code", linux: "code" },
  notepad: { win: "notepad", mac: "TextEdit", linux: "gedit" },
  calculator: { win: "calc", mac: "Calculator", linux: "gnome-calculator" },
  terminal: { win: "wt", mac: "Terminal", linux: "x-terminal-emulator" },
  files: { win: "explorer", mac: "Finder", linux: "nautilus" },
  "file manager": { win: "explorer", mac: "Finder", linux: "nautilus" },
  word: { win: "winword", mac: "Microsoft Word", linux: "libreoffice --writer" },
  excel: { win: "excel", mac: "Microsoft Excel", linux: "libreoffice --calc" },
  powerpoint: { win: "powerpnt", mac: "Microsoft PowerPoint", linux: "libreoffice --impress" },
  outlook: { win: "outlook", mac: "Microsoft Outlook", linux: "thunderbird" },
  paint: { win: "mspaint", mac: "Preview", linux: "pinta" },
  taskmanager: { win: "taskmgr", mac: "Activity Monitor", linux: "gnome-system-monitor" },
  "task manager": { win: "taskmgr", mac: "Activity Monitor", linux: "gnome-system-monitor" },
  settings: { win: "ms-settings:", mac: "System Settings", linux: "gnome-control-center" },
  zoom: { win: "Zoom", mac: "zoom.us", linux: "zoom" },
  teams: { win: "ms-teams", mac: "Microsoft Teams", linux: "teams" },
  chatgpt: { win: "ChatGPT", mac: "ChatGPT", linux: "chatgpt" }
};

const normalizeAppName = name => String(name || "")
  .toLowerCase().replace(/^[\s"'“”]+|[\s"'“”]+$/g, "")
  .replace(/\s+/g, " ").trim();

async function getInstalledPackages() {
  if (!IS_TERMUX) return [];
  const result = await run("pm list packages");
  if (!result.ok) return [];
  return result.output.split("\n").map(line => line.replace(/^package:/, "").trim()).filter(Boolean);
}

async function findPackageByName(appName) {
  const raw = normalizeAppName(appName);
  const wanted = (APP_ALIASES[raw] || raw).replace(/[^a-z0-9]/g, "");
  if (!wanted) return null;
  const packages = await getInstalledPackages();
  const ranked = packages.map(pkg => {
    const normalized = pkg.toLowerCase().replace(/[^a-z0-9]/g, "");
    const score = normalized === wanted ? 0
      : normalized.endsWith(wanted) ? 1
      : normalized.includes(wanted) ? 2
      : wanted.includes(normalized.split(/(?=[a-z])/) .pop() || "!") ? 5 : 99;
    return { pkg, score };
  }).filter(item => item.score < 3).sort((a,b) => a.score-b.score || a.pkg.length-b.pkg.length);
  return ranked[0]?.pkg || null;
}

async function launchAndroidPackage(packageName) {
  const launch = await run("monkey -p " + quote(packageName) + " -c android.intent.category.LAUNCHER 1");
  if (launch.ok) return true;
  const intent = await run("am start --user 0 -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -p " + quote(packageName));
  return intent.ok;
}

async function launchDesktopApp(name) {
  const normalized = normalizeAppName(name);
  const config = DESKTOP_APPS[normalized];
  const target = config ? (IS_WINDOWS ? config.win : IS_MAC ? config.mac : config.linux) : String(name).trim();
  let result;
  if (IS_WINDOWS) {
    const escaped = String(target).replace(/'/g, "''");
    result = await run("powershell -NoProfile -Command \"Start-Process -FilePath '" + escaped + "'\"", 12000);
  } else if (IS_MAC) {
    result = await run("open -a " + quote(target), 12000);
  } else {
    // Try desktop app IDs first, then the executable name supplied by the user.
    result = await run("gtk-launch " + quote(target) + " 2>/dev/null", 12000);
    if (!result.ok) result = await run(quote(target) + " >/dev/null 2>&1 &", 12000);
  }
  return result.ok;
}

async function launchKnownApp(name) {
  const normalized = normalizeAppName(name).replace(/^the\s+/, "").replace(/\s+(?:application|app)$/i, "").trim();
  const aliased = APP_ALIASES[normalized] || normalized;
  console.log("[JARVIS APP] Requested: " + normalized + " (" + PLATFORM + ")");
  if (IS_TERMUX) {
    const installedPackages = await getInstalledPackages();
    const knownPackage = KNOWN_APPS[aliased];
    let packageName = knownPackage && installedPackages.includes(knownPackage)
      ? knownPackage
      : await findPackageByName(aliased);
    if (!packageName) return { ok: false, reason: "not-installed", appName: normalized };
    const success = await launchAndroidPackage(packageName);
    return { ok: success, appName: normalized, packageName, reason: success ? undefined : "launch-failed" };
  }
  const success = await launchDesktopApp(aliased);
  return { ok: success, appName: normalized, reason: success ? undefined : "launch-failed" };
}

async function openAppStoreSearch(appName) {
  const term = encodeURIComponent(String(appName || "").trim());
  if (IS_TERMUX) {
    // Use the official Google Play listing search; installation is always confirmed by the user.
    const market = await run("am start -a android.intent.action.VIEW -d " + quote("market://search?q=" + term + "&c=apps"));
    if (market.ok) return true;
    return (await openUrl("https://play.google.com/store/search?q=" + term + "&c=apps")).ok;
  }
  if (IS_WINDOWS) return (await openUrl("ms-windows-store://search/?query=" + term)).ok;
  if (IS_MAC) return (await openUrl("https://apps.apple.com/us/search?term=" + term)).ok;
  return (await openUrl("https://flathub.org/apps/search?q=" + term)).ok;
}

// ═══════════════════════════════════════
// DESKTOP OPEN URL / APP
// ═══════════════════════════════════════

async function openUrl(url) {
  let cmd;
  if (IS_WINDOWS) cmd = `start "" ${quote(url)}`;
  else if (IS_MAC) cmd = `open ${quote(url)}`;
  else if (IS_TERMUX) cmd = `if command -v termux-open-url >/dev/null 2>&1; then termux-open-url ${quote(url)}; elif command -v am >/dev/null 2>&1; then am start -a android.intent.action.VIEW -d ${quote(url)}; else echo 'Install termux-tools to open URLs from JARVIS.' >&2; exit 127; fi`;
  else cmd = `xdg-open ${quote(url)}`;
  return run(cmd);
}

async function openPath(filePath) {
  let cmd;
  if (IS_WINDOWS) cmd = `start "" ${quote(filePath)}`;
  else if (IS_MAC) cmd = `open ${quote(filePath)}`;
  else if (IS_TERMUX) cmd = `if command -v termux-open >/dev/null 2>&1; then termux-open ${quote(filePath)}; elif command -v am >/dev/null 2>&1; then am start -a android.intent.action.VIEW -d ${quote('file://' + filePath)}; else echo 'Install termux-tools to open files from JARVIS.' >&2; exit 127; fi`;
  else cmd = `xdg-open ${quote(filePath)}`;
  return run(cmd);
}
// Common desktop apps (cross-platform where possible)




// ═══════════════════════════════════════
// TIMERS
// ═══════════════════════════════════════

const timers = new Map();
let timerId = 1;

function createTimer(seconds, label) {
  const id = timerId++;
  const timeout = setTimeout(async () => {
    timers.delete(id);
    // TTS is handled by the browser; we just mark it done
    console.log(`[JARVIS TIMER] Timer ${id} complete`);
  }, seconds * 1000);

  timers.set(id, {
    id,
    label,
    seconds,
    created: Date.now(),
    timeout
  });
  return id;
}

function cancelAllTimers() {
  for (const timer of timers.values()) clearTimeout(timer.timeout);
  timers.clear();
}

// ═══════════════════════════════════════
// FILE HELPERS (desktop home + common folders)
// ═══════════════════════════════════════

const HOME = os.homedir();
const FILE_ROOTS = [
  HOME,
  path.join(HOME, "Desktop"),
  path.join(HOME, "Documents"),
  path.join(HOME, "Downloads"),
  path.join(HOME, "Pictures"),
  ...(IS_TERMUX ? [
    path.join(HOME, "storage", "shared"),
    path.join(HOME, "storage", "downloads"),
    "/storage/emulated/0",
    "/sdcard"
  ] : [])
];

const MAX_FILE_RESULTS = 40;
const MAX_SEARCH_DEPTH = 6;

function normalizeFileQuery(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[“”"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shellSafeFileName(text) {
  return String(text || "")
    .replace(/[^a-zA-Z0-9._ -]/g, "")
    .trim();
}

async function searchFiles(fileQuery, options = {}) {
  const queryText = normalizeFileQuery(fileQuery);
  if (!queryText) return [];

  const safeQuery = shellSafeFileName(queryText);
  if (!safeQuery) return [];

  const results = [];
  for (const root of FILE_ROOTS) {
    if (!fs.existsSync(root)) continue;

    let command;
    if (IS_WINDOWS) {
      // PowerShell recursive search (limited depth approximation)
      command = `powershell -NoProfile -Command "Get-ChildItem -Path '${root}' -Recurse -File -ErrorAction SilentlyContinue | Where-Object { \( _.Name -like '* \){safeQuery}*' } | Select-Object -First ${MAX_FILE_RESULTS} -ExpandProperty FullName"`;
    } else {
      command =
        `find ${quote(root)} -maxdepth ${MAX_SEARCH_DEPTH} -type f -iname \( {quote("*" + safeQuery + "*")} -print 2>/dev/null | head - \){MAX_FILE_RESULTS}`;
    }

    const result = await run(command, 20000);
    if (result.ok && result.output) {
      results.push(
        ...result.output
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean)
      );
    }
    if (results.length >= MAX_FILE_RESULTS) break;
  }
  return [...new Set(results)].slice(0, MAX_FILE_RESULTS);
}

async function searchAllFilesByExtension(extension) {
  const safeExt = shellSafeFileName(extension).replace(/^\./, "").toLowerCase();
  if (!safeExt) return [];

  const results = [];
  for (const root of FILE_ROOTS) {
    if (!fs.existsSync(root)) continue;
    let command;
    if (IS_WINDOWS) {
      command = `powershell -NoProfile -Command "Get-ChildItem -Path '\( {root}' -Recurse -File -Filter '*. \){safeExt}' -ErrorAction SilentlyContinue | Select-Object -First ${MAX_FILE_RESULTS} -ExpandProperty FullName"`;
    } else {
      command =
        `find ${quote(root)} -maxdepth ${MAX_SEARCH_DEPTH} -type f -iname \( {quote("*." + safeExt)} -print 2>/dev/null | head - \){MAX_FILE_RESULTS}`;
    }
    const result = await run(command, 20000);
    if (result.ok && result.output) {
      results.push(
        ...result.output
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean)
      );
    }
  }
  return [...new Set(results)].slice(0, MAX_FILE_RESULTS);
}

function formatFileResults(results) {
  if (!results.length) return "I couldn't find any matching files.";
  if (results.length === 1) return `I found it here: ${results[0]}`;
  const shown = results.slice(0, 8);
  let text = `I found ${results.length} matching files. Here are the first ${shown.length}:\n`;
  shown.forEach((f, i) => (text += `${i + 1}. ${f}\n`));
  if (results.length > shown.length) text += `…and ${results.length - shown.length} more.`;
  return text.trim();
}

async function handleFileCommand(query, res) {
  const normalized = normalizeFileQuery(query);

  // Open file manager
  if (
    /^(?:please\s+)?(?:open|launch|start|show)\s+(?:the\s+)?(?:file\s+manager|files|file\s+browser|explorer|finder)$/i.test(
      normalized
    )
  ) {
    const result = await launchKnownApp("file manager");
    return reply(res, result.ok ? "Opening the file manager." : "I couldn't open the file manager.", {
      mode: "offline",
      fileAction: "open_manager"
    });
  }

  // Find / locate
  const findMatch = normalized.match(
    /^(?:please\s+)?(?:find|search\s+for|locate|where\s+is|where's|show\s+me)\s+(?:the\s+)?(?:file\s+)?(.+?)\s*$/i
  );
  if (findMatch) {
    let name = findMatch[1].trim().replace(/\s+(?:file|document)$/i, "").trim();

    const extensionMatch = name.match(/^all\s+([a-z0-9]+)\s*(?:files?)?$/i);
    if (extensionMatch) {
      const results = await searchAllFilesByExtension(extensionMatch[1]);
      return reply(res, formatFileResults(results), {
        mode: "offline",
        fileAction: "search",
        query: name,
        count: results.length,
        results
      });
    }

    name = name.replace(/^my\s+/i, "").replace(/^the\s+/i, "").trim();
    const results = await searchFiles(name);
    return reply(res, formatFileResults(results), {
      mode: "offline",
      fileAction: "search",
      query: name,
      count: results.length,
      results
    });
  }

  // Open specific file
  const openMatch = normalized.match(/^(?:please\s+)?open\s+(?:the\s+)?file\s+(.+)$/i);
  if (openMatch) {
    const name = openMatch[1].trim();
    const results = await searchFiles(name);
    if (!results.length) {
      return reply(res, `I couldn't find a file named ${name}.`, {
        mode: "offline",
        fileAction: "open_file",
        count: 0
      });
    }
    const filePath = results[0];
    const result = await openPath(filePath);
    return reply(
      res,
      result.ok ? `Opening ${filePath}.` : `I found ${filePath} but could not open it.`,
      { mode: "offline", fileAction: "open_file", path: filePath }
    );
  }

  return null;
}

// ═══════════════════════════════════════
// SYSTEM INFO HELPERS
// ═══════════════════════════════════════

async function getBattery() {
  try {
    if (IS_TERMUX) {
      const r = await run("termux-battery-status");
      if (r.output) {
        try {
          const data = JSON.parse(r.output);
          const pct = Number(data.percentage);
          if (Number.isFinite(pct)) {
            const status = data.status ? " (" + String(data.status).toLowerCase() + ")" : "";
            return "Battery approximately " + pct + "% remaining" + status + ".";
          }
        } catch {}
      }
    }
    if (IS_LINUX) {
      const r = await run("upower -i $(upower -e | grep BAT) 2>/dev/null | grep -E 'percentage|state'");
      if (r.output) return r.output.replace(/\n/g, ". ");
    }
    if (IS_MAC) {
      const r = await run("pmset -g batt");
      if (r.output) return r.output.split("\n").slice(0, 2).join(". ");
    }
    if (IS_WINDOWS) {
      const r = await run('powershell -NoProfile -Command "(Get-CimInstance Win32_Battery).EstimatedChargeRemaining"');
      if (r.output) return "Battery approximately " + r.output + "% remaining.";
    }
  } catch {}
  return null;
}

async function getStorage() {
  try {
    if (IS_WINDOWS) {
      const r = await run('powershell -NoProfile -Command "Get-PSDrive C | Select-Object Used,Free"');
      return r.output || null;
    }
    if (IS_TERMUX) {
      const target = fs.existsSync("/storage/emulated/0") ? "/storage/emulated/0" : HOME;
      const r = await run("df -h " + quote(target) + " 2>/dev/null | tail -1");
      const parts = r.output.split(/\s+/);
      if (parts.length >= 5) return "Android storage usage is " + parts[4] + ", with " + parts[3] + " available.";
      return null;
    }
    const r = await run("df -h / 2>/dev/null | tail -1");
    const parts = r.output.split(/\s+/);
    if (parts.length >= 5) return "Storage usage is " + parts[4] + ", with " + parts[3] + " available.";
  } catch {}
  return null;
}

async function getDeviceInfo() {
  const hostname = os.hostname();
  const platform = os.platform();
  const release = os.release();
  const arch = os.arch();
  const cpus = os.cpus()?.[0]?.model || "Unknown CPU";
  const mem = Math.round(os.totalmem() / 1024 / 1024 / 1024);
  return `Device: ${hostname}. Platform: ${platform} \( {release} ( \){arch}). CPU: ${cpus}. Memory: ${mem} GB.`;
}

// ═══════════════════════════════════════
// COMMAND ENGINE
// ═══════════════════════════════════════

app.post("/api/command", async (req, res) => {
  const original = String(req.body.command || "").trim();
  if (!original) return reply(res, "I didn't hear a command.");

  const command = clean(original);
  const query = command
    .replace(/\b(jarvis|hey jarvis|okay jarvis|ok jarvis)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Local file assistant
  const fileResponse = await handleFileCommand(query, res);
  if (fileResponse !== null) return fileResponse;

  // Greetings
  if (has(query, ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"])) {
    return reply(res, "Good to hear from you. JARVIS is online and ready.");
  }

  // Status
  if (has(query, ["are you online", "are you there", "system status", "jarvis status", "status"])) {
    return reply(res, "All core JARVIS systems are online. Running in " + (IS_TERMUX ? "Termux" : IS_WINDOWS ? "Windows" : IS_MAC ? "macOS" : "Linux") + " mode.");
  }

  // Time
  if (
    has(query, [
      "what time is it",
      "what is the time",
      "current time",
      "time now",
      "tell me the time"
    ])
  ) {
    const time = new Date().toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit"
    });
    return reply(res, `The current time is ${time}.`);
  }

  // Date
  if (
    has(query, [
      "what is today's date",
      "what is the date",
      "today's date",
      "current date",
      "what day is it"
    ])
  ) {
    const date = new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
    return reply(res, `Today is ${date}.`);
  }

  // Battery
  if (has(query, ["battery", "battery level", "battery percentage", "how much battery"])) {
    const bat = await getBattery();
    return reply(res, bat || "I couldn't retrieve battery status on this machine.");
  }

  // Storage
  if (has(query, ["storage", "free space", "disk space", "how much storage"])) {
    const stor = await getStorage();
    return reply(res, stor || "I couldn't retrieve storage information.");
  }

  // Device info
  if (
    has(query, [
      "device information",
      "device info",
      "system information",
      "system info",
      "tell me about my device"
    ])
  ) {
    return reply(res, await getDeviceInfo());
  }

  // Network
  if (
    has(query, [
      "network",
      "internet status",
      "am i connected",
      "check internet",
      "wifi status"
    ])
  ) {
    const r = await run(IS_WINDOWS ? "ping -n 1 8.8.8.8" : "ping -c 1 -W 2 8.8.8.8");
    return reply(
      res,
      r.ok ? "Internet connection is active." : "I couldn't confirm an active Internet connection."
    );
  }

  // Google search
  const search = query.match(/^(?:search google for|google search for|search for|google)\s+(.+)$/);
  if (search) {
    const text = encodeURIComponent(search[1]);
    await openUrl(`https://www.google.com/search?q=${text}`);
    return reply(res, `Searching Google for ${search[1]}.`);
  }

  // YouTube / Google / URL
  if (has(query, ["open youtube", "launch youtube"])) {
    if (IS_TERMUX) {
      const native = await launchKnownApp("youtube");
      if (native.ok) return reply(res, "Opening the YouTube app.", { mode: "offline", appAction: "open", app: "youtube" });
    }
    await openUrl("https://youtube.com");
    return reply(res, "Opening YouTube.");
  }
  if (has(query, ["open google", "launch google"])) {
    await openUrl("https://google.com");
    return reply(res, "Opening Google.");
  }

  const urlMatch = query.match(/^(?:open|launch|visit)\s+(https?:\/\/\S+)$/);
  if (urlMatch) {
    await openUrl(urlMatch[1]);
    return reply(res, "Opening the requested website.");
  }

  // Timer
  const timer = query.match(/(?:set )?(?:a )?timer (?:for )?(\d+)\s*(seconds?|minutes?|hours?)/i);
  if (timer) {
    let seconds = Number(timer[1]);
    const unit = timer[2].toLowerCase();
    if (unit.startsWith("minute")) seconds *= 60;
    if (unit.startsWith("hour")) seconds *= 3600;
    const id = createTimer(seconds, "");
    return reply(res, `Timer ${id} set for ${timer[1]} ${unit}.`);
  }

  if (has(query, ["cancel timer", "cancel all timers", "stop timer", "stop all timers"])) {
    const count = timers.size;
    cancelAllTimers();
    return reply(res, count ? `Cancelled \( {count} timer \){count === 1 ? "" : "s"}.` : "There were no active timers.");
  }

  // Native app launch and official-store install/search. Accept natural-language variants.
  const installMatch = query.match(/^(?:please\s+)?(?:install|download|get)\s+(?:the\s+)?(?:app\s+)?(.+?)\s*$/i);
  if (installMatch) {
    const appName = installMatch[1].trim().replace(/\s+(?:application|app)$/i, "");
    if (!appName) return reply(res, "Tell me which app you want to install.");
    const opened = await openAppStoreSearch(appName);
    return reply(res, opened
      ? "I opened the official app-store search for " + appName + ". Review the publisher and confirm installation in the store."
      : "I couldn't open the app store. Please open your device's official store and search for " + appName + ".", {
        mode: "offline", appAction: "install-search", appName
      });
  }

  const launchMatch = query.match(/^(?:please\s+)?(?:(?:can|could|would) you\s+)?(?:open|launch|start|run|switch to|bring up|show|load)\s+(?:the\s+)?(?:app\s+)?(.+?)\s*$/i);
  const bareApp = (() => {
    const name = normalizeAppName(query).replace(/^the\s+/, "").replace(/\s+(?:application|app)$/i, "");
    return Object.prototype.hasOwnProperty.call(KNOWN_APPS, name) ||
      Object.prototype.hasOwnProperty.call(DESKTOP_APPS, name) ||
      Object.prototype.hasOwnProperty.call(APP_ALIASES, name);
  })();
  const dynamicAndroidApp = !launchMatch && !bareApp && IS_TERMUX &&
    query.length <= 48 && !/[?]/.test(query)
    ? await findPackageByName(normalizeAppName(query).replace(/^the\s+/, "").replace(/\s+(?:application|app)$/i, ""))
    : null;
  if (launchMatch || bareApp || dynamicAndroidApp) {
    const appName = launchMatch ? launchMatch[1].trim().replace(/\s+(?:application|app)$/i, "") : query;
    const result = await launchKnownApp(appName);
    if (result.ok) return reply(res, "Opening " + appName + ".", { mode: "offline", appAction: "open", app: appName, packageName: result.packageName });
    if (result.reason === "not-installed" && IS_TERMUX) {
      return reply(res, appName + " doesn't appear to be installed. Say 'install " + appName + "' to open its official Play Store search.", {
        mode: "offline", appAction: "not-installed", appName
      });
    }
    return reply(res, "I couldn't launch " + appName + " on this device. Check that it is installed and that its app launcher is available.", {
      mode: "offline", appAction: "launch-failed", appName
    });
  }

  // Help
  if (has(query, ["what can you do", "help", "commands"])) {
    return reply(
      res,
      "I can tell the time and date, check battery and storage, open websites and apps, search Google, set timers, find local files, and answer general questions with my AI core."
    );
  }

  // Gemini fallback
  try {
    console.log(`[JARVIS AI] User: ${original}`);
    const aiResponse = await askGemini(original);
    console.log(`[JARVIS AI] JARVIS: ${aiResponse}`);
    return reply(res, aiResponse, { mode: "gemini" });
  } catch (error) {
    console.error("[JARVIS AI] Error:", error.message);
    return reply(res, "My AI core is temporarily unavailable. Local command systems are still operational.", {
      mode: "offline"
    });
  }
});

// ═══════════════════════════════════════
// VOICE ENDPOINT (now just a pass-through)
// The browser does the actual speech recognition.
// This endpoint exists so the frontend can stay compatible.
// ═══════════════════════════════════════

app.post("/api/voice", async (req, res) => {
  // On desktop the browser sends the already-recognized text via /api/command.
  // This endpoint is kept for compatibility; it simply returns a friendly message.
  return reply(res, "Use the VOICE button — speech recognition runs in the browser on desktop.");
});

// Timers & status (unchanged)
app.get("/api/timers", (req, res) => {
  const active = [...timers.values()].map((timer) => ({
    id: timer.id,
    label: timer.label,
    seconds: timer.seconds,
    remaining: Math.max(
      0,
      Math.ceil((timer.created + timer.seconds * 1000 - Date.now()) / 1000)
    )
  }));
  res.json({ ok: true, timers: active });
});

app.get("/api/status", (req, res) => {
  res.json({
    online: true,
    name: "JARVIS",
    mode: IS_TERMUX ? "termux" : "desktop",
    platform: PLATFORM,
    voice: true,
    timers: timers.size,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`JARVIS ONLINE (Desktop) → http://127.0.0.1:${PORT}`);
  console.log(`Platform: ${PLATFORM}`);
});
