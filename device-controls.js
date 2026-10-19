import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);
const IS_WINDOWS = process.platform === "win32";
const IS_MAC = process.platform === "darwin";
const IS_LINUX = process.platform === "linux";
const IS_TERMUX = IS_LINUX && (Boolean(process.env.TERMUX_VERSION) || String(process.env.PREFIX || "").toLowerCase().includes("com.termux") || /android/i.test(os.release()));
const HOME = os.homedir();
const ROOTS = [
  HOME,
  path.join(HOME, "Desktop"),
  path.join(HOME, "Documents"),
  path.join(HOME, "Downloads"),
  path.join(HOME, "Pictures"),
  ...(IS_TERMUX ? [path.join(HOME, "storage", "shared"), "/storage/emulated/0", "/sdcard"] : [])
];
const MAX_RESULTS = 30;
const MAX_VISITED = 50000;

const clean = s => String(s || "").toLowerCase().replace(/[“”"'`]/g, "").replace(/\s+/g, " ").trim();
const escapePowerShell = s => String(s).replace(/'/g, "''");

async function command(file, args = [], timeout = 12000) {
  try {
    const { stdout, stderr } = await execAsync([file, ...args].map(x => JSON.stringify(String(x))).join(" "), { timeout, windowsHide: true, shell: true });
    return { ok: true, output: String(stdout || "").trim(), error: String(stderr || "").trim() };
  } catch (e) {
    return { ok: false, output: String(e.stdout || "").trim(), error: String(e.stderr || e.message || "").trim() };
  }
}

function matchesName(fileName, wanted) {
  const a = clean(fileName);
  const b = clean(wanted);
  if (!b) return false;
  if (a === b || path.parse(a).name === b) return true;
  return a.includes(b) || path.parse(a).name.includes(b);
}

async function findFiles(wanted) {
  const query = clean(wanted).replace(/^the\s+/, "").replace(/\s+(?:file|document)$/i, "").trim();
  if (!query) return [];
  const results = [];
  const seen = new Set();
  let visited = 0;

  const walk = async root => {
    if (results.length >= MAX_RESULTS || visited >= MAX_VISITED) return;
    let entries;
    try { entries = await fs.promises.readdir(root, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (results.length >= MAX_RESULTS || visited >= MAX_VISITED) break;
      visited++;
      if (entry.name === "." || entry.name === ".." || entry.name === "node_modules" || entry.name === ".git" || entry.name === "Android/data") continue;
      const full = path.join(root, entry.name);
      if (entry.isFile()) {
        if (matchesName(entry.name, query) && !seen.has(full)) { seen.add(full); results.push(full); }
      } else if (entry.isDirectory()) {
        await walk(full);
      }
    }
  };

  for (const root of ROOTS) {
    if (results.length >= MAX_RESULTS || visited >= MAX_VISITED) break;
    try { if (fs.existsSync(root)) await walk(root); } catch {}
  }
  return results;
}

async function openFile(filePath) {
  if (IS_TERMUX) {
    const r = await command("sh", ["-lc", `if command -v termux-open >/dev/null 2>&1; then termux-open "$1"; elif command -v am >/dev/null 2>&1; then am start -a android.intent.action.VIEW -d "file://$1"; else exit 127; fi`, "jarvis", filePath]);
    return r.ok;
  }
  if (IS_WINDOWS) return (await command("powershell", ["-NoProfile", "-Command", `Start-Process -LiteralPath '${escapePowerShell(filePath)}'`])).ok;
  if (IS_MAC) return (await command("open", [filePath])).ok;
  return (await command("xdg-open", [filePath])).ok;
}

async function battery() {
  if (IS_TERMUX) {
    const r = await command("termux-battery-status");
    if (r.ok && r.output) {
      try { return JSON.parse(r.output); } catch {}
    }
  }
  if (IS_WINDOWS) {
    const r = await command("powershell", ["-NoProfile", "-Command", "(Get-CimInstance Win32_Battery | Select-Object -First 1 -ExpandProperty EstimatedChargeRemaining)"]);
    if (r.ok && r.output) return { percentage: Number(r.output), source: "windows" };
  }
  if (IS_MAC) {
    const r = await command("pmset", ["-g", "batt"]);
    return { raw: r.output, source: "macos" };
  }
  return null;
}

async function volumeInfo() {
  if (IS_TERMUX) {
    const r = await command("termux-volume");
    if (r.ok && r.output) { try { return JSON.parse(r.output); } catch {} }
  }
  return null;
}

function pickStream(data, requested = "music") {
  const list = Array.isArray(data) ? data : [];
  return list.find(x => String(x.stream).toLowerCase() === requested) || list.find(x => String(x.stream).toLowerCase() === "music") || list[0];
}

async function setVolume(percent, stream = "music") {
  if (!IS_TERMUX) return { ok: false, message: "Direct Android volume control is available when JARVIS is running through Termux." };
  const info = await volumeInfo();
  const current = pickStream(info, stream);
  if (!current) return { ok: false, message: "I couldn't read the Android volume controls. Make sure Termux:API is available." };
  const max = Number(current.max_volume);
  const value = Math.round(Math.max(0, Math.min(100, percent)) * max / 100);
  const r = await command("termux-volume", [stream, String(value)]);
  return { ok: r.ok, value, max, percent: Math.round(value * 100 / Math.max(1, max)), message: r.ok ? `Set ${stream} volume to ${Math.round(value * 100 / Math.max(1, max))}%.` : (r.error || "I couldn't change the volume.") };
}

async function setBrightness(percent) {
  if (!IS_TERMUX) return { ok: false, message: "Direct Android brightness control is available when JARVIS is running through Termux." };
  const p = Math.max(0, Math.min(100, percent));
  const value = Math.round(p * 255 / 100);
  const r = await command("termux-brightness", [String(value)]);
  return { ok: r.ok, percent: p, value, message: r.ok ? `Set screen brightness to ${p}%.` : (r.error || "I couldn't change screen brightness.") };
}

async function storageInfo() {
  const target = IS_TERMUX && fs.existsSync("/storage/emulated/0") ? "/storage/emulated/0" : HOME;
  const r = IS_WINDOWS
    ? await command("powershell", ["-NoProfile", "-Command", "Get-PSDrive C | Select-Object Used,Free,CurrentLocation | ConvertTo-Json -Compress"])
    : await command("df", ["-h", target]);
  return r.output || null;
}

async function deviceInfo() {
  const bat = await battery();
  const storage = await storageInfo();
  const lines = [
    `Device: ${os.hostname()}`,
    `Platform: ${process.platform} ${os.release()} (${os.arch()})`,
    `CPU: ${os.cpus()?.[0]?.model || "Unknown"}`,
    `Memory: ${Math.round(os.totalmem() / 1073741824)} GB total`,
  ];
  if (bat?.percentage != null) lines.push(`Battery: ${bat.percentage}%${bat.status ? ` (${String(bat.status).toLowerCase()})` : ""}`);
  if (storage) lines.push(`Storage: ${String(storage).replace(/\s+/g, " ").slice(0, 300)}`);
  if (IS_TERMUX) lines.push("Android control bridge: Termux / Termux:API");
  return lines.join(". ") + ".";
}

function extractPercent(q, fallback = null) {
  const m = q.match(/(?:to|at|by|set(?: it)? to)?\s*(\d{1,3})\s*(?:%|percent)\b/i);
  if (!m) return fallback;
  return Math.max(0, Math.min(100, Number(m[1])));
}

export async function handleDeviceCommand(query, res, reply) {
  const q = clean(query);

  if (/^(?:open|launch|show)\s+(?:the\s+)?(?:device|system)\s+info(?:rmation)?$/.test(q) || /^(?:device|system)\s+(?:information|info|specs|specifications)$/.test(q) || /^(?:tell|show)\s+me\s+(?:about\s+)?(?:my\s+)?device$/.test(q)) {
    return reply(res, await deviceInfo(), { mode: "offline", deviceAction: "info" });
  }

  if (/^(?:what(?:'s| is)|check|show|tell me)\s+(?:my\s+)?(?:battery|battery status|battery level)$/.test(q) || /^(?:battery|battery status|battery level)$/.test(q)) {
    const b = await battery();
    if (!b) return reply(res, "I couldn't read the battery status on this device.", { mode: "offline", deviceAction: "battery" });
    if (b.percentage != null) return reply(res, `Battery is at ${b.percentage}%.${b.status ? ` Status: ${String(b.status).toLowerCase()}.` : ""}`, { mode: "offline", deviceAction: "battery", battery: b });
    return reply(res, `Battery information: ${JSON.stringify(b)}.`, { mode: "offline", deviceAction: "battery", battery: b });
  }

  const brightness = q.match(/^(?:set|change|turn)\s+(?:the\s+)?(?:screen\s+)?brightness\s+(?:to\s+)?(\d{1,3})\s*(?:%|percent)?$/i);
  if (brightness) {
    const result = await setBrightness(Number(brightness[1]));
    return reply(res, result.message, { mode: "offline", deviceAction: "brightness", ...result });
  }
  if (/^(?:increase|raise|make)\s+(?:the\s+)?brightness$/.test(q)) {
    const result = await setBrightness(80);
    return reply(res, result.message, { mode: "offline", deviceAction: "brightness", ...result });
  }
  if (/^(?:decrease|lower|dim)\s+(?:the\s+)?brightness$/.test(q)) {
    const result = await setBrightness(30);
    return reply(res, result.message, { mode: "offline", deviceAction: "brightness", ...result });
  }

  const vol = q.match(/^(?:set|change|turn)\s+(?:the\s+)?(?:(music|media|ring|alarm|notification|system|call)\s+)?volume\s+(?:to\s+)?(\d{1,3})\s*(?:%|percent)?$/i);
  if (vol) {
    const stream = vol[1] === "media" ? "music" : (vol[1] || "music");
    const result = await setVolume(Number(vol[2]), stream);
    return reply(res, result.message, { mode: "offline", deviceAction: "volume", stream, ...result });
  }
  if (/^(?:increase|raise|turn up)\s+(?:(music|media|ring|alarm|notification|system|call)\s+)?volume$/.test(q)) {
    const result = await setVolume(80, q.match(/^(?:increase|raise|turn up)\s+(music|media|ring|alarm|notification|system|call)/)?.[1] || "music");
    return reply(res, result.message, { mode: "offline", deviceAction: "volume", ...result });
  }
  if (/^(?:decrease|lower|turn down|mute)\s+(?:(music|media|ring|alarm|notification|system|call)\s+)?volume$/.test(q)) {
    const stream = q.match(/^(?:decrease|lower|turn down|mute)\s+(music|media|ring|alarm|notification|system|call)/)?.[1] || "music";
    const result = await setVolume(q.startsWith("mute") ? 0 : 30, stream);
    return reply(res, result.message, { mode: "offline", deviceAction: "volume", ...result });
  }

  if (/^(?:what(?:'s| is)|check|show|tell me)\s+(?:the\s+)?(?:volume|sound volume)$/.test(q) || q === "volume") {
    const info = await volumeInfo();
    if (!info) return reply(res, "I couldn't read Android volume information. Make sure Termux:API is available.", { mode: "offline", deviceAction: "volume-info" });
    return reply(res, info.map(x => `${x.stream}: ${x.volume}/${x.max_volume}`).join(". ") + ".", { mode: "offline", deviceAction: "volume-info", volume: info });
  }

  const open = q.match(/^(?:please\s+)?(?:open|launch|start|show)\s+(?:the\s+)?(?:(?:file|document)\s+)?(.+?)\s*$/i);
  if (open && !/^(?:file\s+manager|files|file\s+browser|explorer|finder)$/.test(open[1])) {
    const wanted = open[1].replace(/^file\s+/i, "").replace(/\s+file$/i, "").trim();
    if (wanted && wanted.length <= 180) {
      const results = await findFiles(wanted);
      if (results.length) {
        const success = await openFile(results[0]);
        return reply(res, success ? `Opening ${results[0]}.` : `I found ${results[0]}, but Android did not accept the open request.`, { mode: "offline", deviceAction: "open-file", path: results[0], count: results.length, results: results.slice(0, 10) });
      }
      return reply(res, `I couldn't find a file matching ${wanted}. I searched the accessible device storage and common folders.`, { mode: "offline", deviceAction: "open-file", count: 0 });
    }
  }

  return null;
}
