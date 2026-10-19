import { spawn } from "node:child_process";
import assert from "node:assert/strict";

const port = 30000 + Math.floor(Math.random() * 20000);
const base = "http://127.0.0.1:" + port;
const child = spawn(process.execPath, ["server.js"], {
  env: { ...process.env, PORT: String(port), GEMINI_API_KEY: "" },
  stdio: ["ignore", "pipe", "pipe"]
});
let logs = "";
child.stdout.on("data", chunk => { logs += chunk.toString(); });
child.stderr.on("data", chunk => { logs += chunk.toString(); });

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (child.exitCode !== null) throw new Error("JARVIS exited before startup.\n" + logs);
    try {
      const response = await fetch(base + "/api/status");
      if (response.ok) return response;
    } catch {}
    await pause(200);
  }
  throw new Error("JARVIS did not start within 12 seconds.\n" + logs);
}

try {
  const statusResponse = await waitForServer();
  const status = await statusResponse.json();
  assert.equal(status.online, true, "status endpoint should report online");
  const pageResponse = await fetch(base + "/");
  assert.equal(pageResponse.status, 200, "local HUD should load");
  const page = await pageResponse.text();
  assert.ok(page.includes('id="commandInput"'), "original local command input must remain");
  assert.ok(page.includes("modules/jarvis-velve.js"), "VELVE module must be referenced");
  assert.ok(page.includes("modules/jarvis-local-bridge.js"), "local bridge module must be loaded");
  assert.ok(page.includes("JARVISVisionIntelligence"), "local HUD should expose direct Vision Intelligence routing");

  const bridgeResponse = await fetch(base + "/modules/jarvis-local-bridge.js");
  assert.equal(bridgeResponse.status, 200, "local bridge module should be served");
  const bridgeSource = await bridgeResponse.text();
  assert.ok(bridgeSource.includes("jarvis-wake-word-toggle"), "wake-word control should be implemented");
  assert.ok(bridgeSource.includes("JARVIS LOCAL BRIDGE"), "response panel should be implemented");

  const visionResponse = await fetch(base + "/modules/jarvis-vision-intelligence.js");
  assert.equal(visionResponse.status, 200, "Vision Intelligence module should be served");
  const visionSource = await visionResponse.text();
  assert.ok(visionSource.includes("window.JARVISVisionIntelligence"), "Vision Intelligence should expose a stable local API");

  const routerResponse = await fetch(base + "/modules/jarvis-universal-service-router.js");
  assert.equal(routerResponse.status, 200, "universal service router should be served");
  const routerSource = await routerResponse.text();
  assert.ok(routerSource.includes("WEB_FIRST_NAMES"), "web services should prefer browser routing on the local HUD");
  assert.ok(routerSource.includes("JARVISLocalBridge?.showResponse"), "browser-routed commands should update the response panel");

  const commandResponse = await fetch(base + "/api/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command: "what time is it" })
  });
  const command = await commandResponse.json();
  assert.equal(command.ok, true, "local command endpoint should respond");
  assert.match(command.reply, /current time/i, "time command should work without a Gemini key");

  const installResponse = await fetch(base + "/api/command", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1"
    },
    body: JSON.stringify({ command: "install BGMI on my iPhone" })
  });
  const install = await installResponse.json();
  assert.equal(install.appAction, "install-search", "installer intent should be recognized");
  assert.equal(install.storePlatform, "ios", "iPhone user agent should select the Apple App Store");
  assert.match(install.storeUrl, /^itms-apps:\/\//, "iPhone should try the native App Store scheme first");
  assert.match(install.storeFallbackUrl, /^https:\/\/apps\.apple\.com\//, "iPhone should have an HTTPS App Store fallback");
  assert.match(install.storeUrl, /BGMI/i, "store search should include the requested app");

  const deviceInfoResponse = await fetch(base + "/api/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command: "device info" })
  });
  const deviceInfo = await deviceInfoResponse.json();
  assert.match(deviceInfo.reply, /Platform: .+ \(.+\)/, "device information should include platform, release, and architecture");

  const timerResponse = await fetch(base + "/api/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command: "set timer for 1 minute" })
  });
  const timer = await timerResponse.json();
  assert.match(timer.reply, /Timer .* set for 1 minute/i, "timer creation should return a valid response");
  const cancelTimerResponse = await fetch(base + "/api/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command: "cancel all timers" })
  });
  const cancelTimer = await cancelTimerResponse.json();
  assert.match(cancelTimer.reply, /Cancelled 1 timer\./, "timer cancellation should format its count correctly");

  const websiteResponse = await fetch(base + "/api/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command: "open youtube" })
  });
  const website = await websiteResponse.json();
  assert.equal(website.ok, true, "website command should respond");
  assert.equal(website.openUrl, "https://www.youtube.com/", "website navigation should be returned to the browser instead of launched from the Termux shell");

  const searchResponse = await fetch(base + "/api/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command: "search Google for local JARVIS" })
  });
  const search = await searchResponse.json();
  assert.match(search.openUrl || "", /^https:\/\/www\.google\.com\/search\?q=/, "Google search should route through the browser");

  const vagueInstallResponse = await fetch(base + "/api/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command: "install this" })
  });
  const vagueInstall = await vagueInstallResponse.json();
  assert.equal(vagueInstall.appAction, "install-needs-name", "install this should ask for an app name rather than search for an app literally named this");

  const androidResponse = await fetch(base + "/api/command", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36"
    },
    body: JSON.stringify({ command: "download WhatsApp on my Android" })
  });
  const androidInstall = await androidResponse.json();
  assert.equal(androidInstall.storePlatform, "android", "Android user agent should select Google Play");
  assert.match(androidInstall.storeUrl, /^market:\/\//, "Android should try the native Play Store scheme first");
  assert.match(androidInstall.storeFallbackUrl, /^https:\/\/play\.google\.com\//, "Android should have a Google Play HTTPS fallback");

  console.log("JARVIS Local smoke test passed: server/HUD, local bridge + wake UI, Vision API, browser navigation, vague install handling, and iOS/Android store routing are verified.");
} finally {
  child.kill("SIGTERM");
  await Promise.race([new Promise(resolve => child.once("exit", resolve)), pause(2000)]);
}
