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
  const commandResponse = await fetch(base + "/api/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command: "what time is it" })
  });
  const command = await commandResponse.json();
  assert.equal(command.ok, true, "local command endpoint should respond");
  assert.match(command.reply, /current time/i, "time command should work without a Gemini key");
  console.log("JARVIS Local smoke test passed: server starts without an API key, HUD loads, and local commands respond.");
} finally {
  child.kill("SIGTERM");
  await Promise.race([new Promise(resolve => child.once("exit", resolve)), pause(2000)]);
}
