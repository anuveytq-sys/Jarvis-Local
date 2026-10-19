/* JARVIS Local Bridge: response panel + hands-free wake-word toggle.
   Keeps the local Express API authoritative and adds UI missing from the main HUD. */
(() => {
  "use strict";
  if (window.__JARVIS_LOCAL_BRIDGE__) return;
  window.__JARVIS_LOCAL_BRIDGE__ = true;
  const $ = id => document.getElementById(id);
  const clean = value => String(value || "").trim().replace(/\s+/g, " ");
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  function bootUI() {
    if (!$("jarvis-local-bridge-style")) {
      const style = document.createElement("style");
      style.id = "jarvis-local-bridge-style";
      style.textContent = `
        #jarvis-local-bridge{position:fixed;z-index:120;top:72px;left:50%;transform:translateX(-50%);width:min(430px,calc(100vw - 28px));max-height:24vh;overflow:auto;display:block;padding:10px 12px;border:1px solid rgba(0,220,255,.42);border-radius:9px;color:#d8fbff;background:linear-gradient(135deg,rgba(2,26,48,.95),rgba(0,7,18,.94));box-shadow:0 0 22px rgba(0,180,255,.13);backdrop-filter:blur(12px);font:11px/1.45 "Segoe UI",Roboto,Arial,sans-serif}
        #jarvis-local-bridge .jlb-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px;color:#62f5ff;font-size:8px;letter-spacing:1.5px}
        #jarvis-local-bridge .jlb-state{color:#65e9ff;white-space:nowrap}
        #jarvis-local-bridge .jlb-command{color:#7eafc4;font-size:10px;overflow-wrap:anywhere;margin-bottom:4px}
        #jarvis-local-bridge .jlb-response{white-space:pre-wrap;overflow-wrap:anywhere;max-height:13vh;overflow:auto}
        #jarvis-local-bridge .jlb-link{display:none;margin-top:8px;padding:7px 9px;border:1px solid rgba(0,220,255,.45);border-radius:5px;color:#c7fbff;background:rgba(0,100,160,.16);text-decoration:none;font-weight:600}
        #jarvis-local-bridge .jlb-link.visible{display:inline-block}
        #jarvis-local-bridge .jlb-close{border:0;background:transparent;color:#8adff0;font-size:16px;cursor:pointer}
        #jarvis-wake-word-toggle{min-width:84px;max-width:118px;white-space:nowrap;font-size:clamp(6px,1.6vw,9px)!important;letter-spacing:.4px!important;padding-left:7px!important;padding-right:7px!important}
        #jarvis-wake-word-toggle[aria-pressed="true"]{border-color:#00eaff!important;color:#bafaff!important;box-shadow:0 0 10px rgba(0,220,255,.22)}
        @media(max-width:520px){#jarvis-local-bridge{top:66px;width:calc(100vw - 24px);max-height:23vh;padding:8px 10px}#jarvis-wake-word-toggle{min-width:78px;max-width:88px;padding:0 5px!important;font-size:6px!important;letter-spacing:.2px!important}}
      `;
      document.head.appendChild(style);
    }
    if (!$("jarvis-local-bridge")) {
      const panel = document.createElement("section");
      panel.id = "jarvis-local-bridge";
      panel.setAttribute("role", "status");
      panel.setAttribute("aria-live", "polite");
      panel.innerHTML = '<div class="jlb-head"><span>JARVIS LOCAL BRIDGE</span><span class="jlb-state" id="jlb-state">READY</span><button class="jlb-close" type="button" aria-label="Hide response panel">×</button></div><div class="jlb-command" id="jlb-command">READY — local command bridge connected.</div><div class="jlb-response" id="jlb-response">Responses from the local JARVIS server will appear here.</div><a class="jlb-link" id="jlb-link" target="_blank" rel="noopener noreferrer">Open destination ↗</a>';
      panel.querySelector(".jlb-close").addEventListener("click", () => panel.style.display = "none");
      document.body.appendChild(panel);
    }
    let wake = $("jarvis-wake-word-toggle");
    const form = $("commandForm"), voice = $("voiceButton");
    if (!wake && form && voice) {
      wake = document.createElement("button");
      wake.id = "jarvis-wake-word-toggle";
      wake.className = "btn";
      wake.type = "button";
      wake.textContent = "ENABLE WAKE WORD";
      wake.title = 'Toggle hands-free "Hey Jarvis" commands';
      wake.setAttribute("aria-pressed", "false");
      form.insertBefore(wake, voice.nextSibling);
    }
    if (wake && !wake.dataset.localWakeBound) {
      wake.dataset.localWakeBound = "1";
      wake.addEventListener("click", toggleWakeWord);
    }
  }
  const show = () => { const p=$("jarvis-local-bridge"); if(p) p.style.display="block"; };
  function begin(command) {
    bootUI();
    $("jlb-command").textContent = "COMMAND / " + clean(command);
    $("jlb-response").textContent = "Sending command to the local JARVIS server…";
    $("jlb-state").textContent = "PROCESSING";
    $("jlb-link").classList.remove("visible");
    show();
  }
  function showResponse(message, data = {}) {
    bootUI();
    $("jlb-response").textContent = clean(message) || "The local server returned no response.";
    $("jlb-state").textContent = data.mode ? String(data.mode).toUpperCase() : "COMPLETE";
    show();
    if (data.openUrl) openExternal(data.openUrl, data.openLabel || "Open requested destination");
  }
  function showError(message) {
    bootUI();
    $("jlb-response").textContent = clean(message) || "The local JARVIS server could not be reached.";
    $("jlb-state").textContent = "ERROR";
    show();
  }
  function openExternal(url, label) {
    let target;
    try { target = new URL(String(url || ""), location.href); } catch (_) { return false; }
    if (!/^https?:$/.test(target.protocol)) return false;
    let opened = null;
    try { opened = window.open(target.href, "_blank"); } catch (_) {}
    const link = $("jlb-link");
    link.href = target.href;
    link.textContent = clean(label) || "Open requested destination ↗";
    link.classList.add("visible");
    if (opened) {
      try { opened.opener = null; } catch (_) {}
      $("jlb-state").textContent = "OPENED";
      return true;
    }
    $("jlb-state").textContent = "TAP LINK";
    $("jlb-response").textContent += "\nIf your browser blocked the new tab, use the link below.";
    show();
    return false;
  }

  let wakeEnabled = false, wakePaused = false, wakeStarting = false;
  let wakeRecognition = null, wakeRetry = 0, awaitingCommandUntil = 0, pauseWaiter = null;
  function setWakeLabel(text) {
    const b = $("jarvis-wake-word-toggle");
    if (!b) return;
    b.textContent = text;
    b.setAttribute("aria-pressed", wakeEnabled ? "true" : "false");
    b.setAttribute("aria-label", wakeEnabled ? "Disable JARVIS wake word" : "Enable JARVIS wake word");
  }
  function finishPause() { if (pauseWaiter) { const resolve = pauseWaiter; pauseWaiter = null; resolve(); } }
  function startWakeRecognition() {
    if (!wakeEnabled || wakePaused || wakeStarting || wakeRecognition) return;
    if (!Recognition) {
      wakeEnabled = false; setWakeLabel("TAP TO RETRY WAKE WORD");
      showError("Hands-free speech recognition is not supported here. Use the VOICE button instead."); return;
    }
    clearTimeout(wakeRetry); wakeStarting = true; setWakeLabel("STARTING MICROPHONE…");
    const current = new Recognition(); wakeRecognition = current;
    current.lang = "en-IN"; current.continuous = true; current.interimResults = true; current.maxAlternatives = 3;
    current.onstart = () => { if (wakeRecognition === current) { wakeStarting = false; setWakeLabel("WAKE WORD: ON"); } };
    current.onresult = event => {
      if (wakeRecognition !== current || wakePaused || !wakeEnabled) return;
      for (let i = event.resultIndex || 0; i < event.results.length; i++) {
        const result = event.results[i]; if (!result || !result.isFinal) continue;
        const heard = Array.from(result).map(x => String(x.transcript || "")).join(" ").trim();
        if (!heard) continue;
        const normalized = heard.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
        const match = normalized.match(/^(?:hey\s+)?jarvis\b[ ,.:;-]*(.*)$/i);
        if (match) {
          const command = clean(match[1]);
          if (command) { awaitingCommandUntil = 0; dispatchWakeCommand(command); }
          else {
            awaitingCommandUntil = Date.now() + 9000;
            if (typeof window.speak === "function") window.speak("I'm listening. What can I do for you?");
            $("jlb-command").textContent = "WAKE WORD / COMMAND REQUESTED";
            $("jlb-response").textContent = "Listening for your command…";
            $("jlb-state").textContent = "LISTENING";
            show();
          }
          return;
        }
        if (Date.now() < awaitingCommandUntil) { awaitingCommandUntil = 0; dispatchWakeCommand(heard); return; }
      }
    };
    current.onerror = event => {
      if (wakeRecognition !== current) return;
      wakeStarting = false;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        wakeEnabled = false; setWakeLabel("TAP TO RETRY WAKE WORD");
        showError("Allow microphone access in browser settings, then tap the wake-word button again.");
      } else if (event.error !== "aborted" && wakeEnabled && !wakePaused) setWakeLabel("WAKE WORD RETRYING…");
    };
    current.onend = () => {
      if (wakeRecognition !== current) return;
      wakeRecognition = null; wakeStarting = false; finishPause();
      if (wakeEnabled && !wakePaused) { setWakeLabel("WAKE WORD RETRYING…"); wakeRetry = setTimeout(startWakeRecognition, 450); }
    };
    try { current.start(); }
    catch (error) {
      wakeRecognition = null; wakeStarting = false; setWakeLabel("TAP TO RETRY WAKE WORD");
      showError("The wake-word microphone could not start. Tap to retry. " + (error?.message || "")); finishPause();
    }
  }
  async function pauseForCore() {
    wakePaused = true; clearTimeout(wakeRetry);
    const current = wakeRecognition;
    if (!current) { finishPause(); return; }
    return new Promise(resolve => { pauseWaiter = resolve; try { current.stop(); } catch (_) { try { current.abort(); } catch (_) {} } setTimeout(finishPause, 700); });
  }
  function resumeAfterCore() {
    wakePaused = false;
    if (wakeEnabled && !wakeRecognition && !wakeStarting) { clearTimeout(wakeRetry); wakeRetry = setTimeout(startWakeRecognition, 650); }
  }
  async function dispatchWakeCommand(command) {
    if (!wakeEnabled || wakePaused || !clean(command)) return;
    await pauseForCore();
    try {
      if (typeof window.sendCommand === "function") await window.sendCommand(command);
      else showError("The local command handler is not available.");
    } catch (error) { showError(error?.message || "The command could not be sent."); }
    finally { setTimeout(resumeAfterCore, 900); }
  }
  function toggleWakeWord() {
    wakeEnabled = !wakeEnabled; clearTimeout(wakeRetry);
    if (wakeEnabled) {
      wakePaused = false; setWakeLabel("STARTING MICROPHONE…"); startWakeRecognition();
      if (typeof window.speak === "function") window.speak("Wake word enabled. Say Hey Jarvis followed by your command.");
    } else {
      const current = wakeRecognition; wakeRecognition = null; wakeStarting = false;
      if (current) { current.onstart = current.onresult = current.onerror = current.onend = null; try { current.stop(); } catch (_) { try { current.abort(); } catch (_) {} } }
      setWakeLabel("ENABLE WAKE WORD"); finishPause();
      if (typeof window.speak === "function") window.speak("Wake word disabled.");
    }
  }
  window.JARVISLocalBridge = { begin, showResponse, showError, openExternal };
  window.JARVISLocalWakeWord = { pauseForCore, resumeAfterCore, isEnabled: () => wakeEnabled, disable: () => { wakeEnabled = false; const b=$("jarvis-wake-word-toggle"); if(b) setWakeLabel("ENABLE WAKE WORD"); const c=wakeRecognition; wakeRecognition=null; if(c) try{c.stop()}catch(_){} } };
  window.__jarvisPauseWakeWordForEnvironment = pauseForCore;
  window.__jarvisResumeWakeWordAfterEnvironment = resumeAfterCore;

  function loadScript(src, key) {
    if (document.querySelector('script[data-jlb="'+key+'"]')) return;
    const s=document.createElement('script'); s.src=src; s.async=false; s.dataset.jlb=key; document.body.appendChild(s);
  }
  function loadStyle(href, key) {
    if (document.querySelector('link[data-jlb="'+key+'"]')) return;
    const l=document.createElement('link'); l.rel='stylesheet'; l.href=href; l.dataset.jlb=key; document.head.appendChild(l);
  }
  function bootLocalFeatureModules(){
    loadScript('/modules/jarvis-local-settings.js?v=local-20261019a','settings');
    loadScript('/modules/jarvis-environment-voice-fix.js?v=local-20261019a','envvoice');
    loadStyle('/modules/jarvis-vision-intelligence.css?v=local-vision-20261019a','visioncss');
    loadStyle('/modules/jarvis-vision-intelligence-enhancement.css?v=local-vision-20261019a','visionenhance');
    loadScript('/modules/jarvis-vision-intelligence.js?v=local-vision-20261019a','visionjs');
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { bootUI(); bootLocalFeatureModules(); }, { once: true });
  else { bootUI(); bootLocalFeatureModules(); }
})();