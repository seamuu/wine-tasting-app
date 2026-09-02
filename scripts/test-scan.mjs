#!/usr/bin/env node
// Drives scan-test.html in headless Chrome against a real photo file and prints
// back exactly what the tool would show in a browser (corner detection, per-block
// calibration, every bubble's read) as JSON, plus a screenshot for a visual check.
//
// Usage: node scripts/test-scan.mjs <photo-path> [--corners tl_x,tl_y,tr_x,tr_y,bl_x,bl_y,br_x,br_y]
//
// The --corners override lets you pin the four corner points (in the photo's own
// pixel space, before downscaling) instead of trusting auto-detection, so you can
// test the warp/read pipeline in isolation from corner detection.

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const HTML_PATH = path.join(REPO_ROOT, "card", "scan-test.html");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333 + Math.floor(Math.random() * 500); // avoid clobbering a concurrent run

const args = process.argv.slice(2);
const photoArg = args.find(a => !a.startsWith("--"));
if (!photoArg) {
  console.error("Usage: node scripts/test-scan.mjs <photo-path> [--corners x,y,x,y,x,y,x,y]");
  process.exit(1);
}
const photoPath = path.resolve(photoArg);
const cornersArg = args.find(a => a.startsWith("--corners="));
let cornerOverride = null;
if (cornersArg) {
  const nums = cornersArg.slice("--corners=".length).split(",").map(Number);
  if (nums.length !== 8 || nums.some(Number.isNaN)) {
    console.error("--corners needs 8 numbers: tl_x,tl_y,tr_x,tr_y,bl_x,bl_y,br_x,br_y");
    process.exit(1);
  }
  cornerOverride = {
    tl: { x: nums[0], y: nums[1] }, tr: { x: nums[2], y: nums[3] },
    bl: { x: nums[4], y: nums[5] }, br: { x: nums[6], y: nums[7] }
  };
}

function httpJson(url, opts) {
  return fetch(url, opts).then(r => r.json());
}

async function waitForCdp(port, tries = 50) {
  for (let i = 0; i < tries; i++) {
    try { await httpJson(`http://127.0.0.1:${port}/json/version`); return; }
    catch { await new Promise(r => setTimeout(r, 100)); }
  }
  throw new Error("Chrome DevTools endpoint never came up");
}

class CdpSession {
  constructor(ws) { this.ws = ws; this.nextId = 1; this.pending = new Map(); this.listeners = new Map();
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
      } else if (msg.method) {
        const fns = this.listeners.get(msg.method);
        if (fns) fns.forEach(fn => fn(msg.params));
      }
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
  }
}

async function evalExpr(session, expression, awaitPromise = false) {
  const result = await session.send("Runtime.evaluate", {
    expression, returnByValue: true, awaitPromise
  });
  if (result.exceptionDetails) {
    throw new Error("Page error: " + JSON.stringify(result.exceptionDetails));
  }
  return result.result.value;
}

async function pollUntil(session, expression, timeoutMs = 8000, intervalMs = 100) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = await evalExpr(session, expression);
    if (v) return v;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox",
  `--remote-debugging-port=${PORT}`, "--window-size=1400,2000"
], { stdio: "ignore" });

let exitCode = 0;
try {
  await waitForCdp(PORT);
  const tab = await httpJson(`http://127.0.0.1:${PORT}/json/new?file://${encodeURIComponent(HTML_PATH)}`, { method: "PUT" });
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener("open", resolve); ws.addEventListener("error", reject); });
  const session = new CdpSession(ws);
  await session.send("Runtime.enable");
  await session.send("Page.enable");
  await session.send("DOM.enable");

  await pollUntil(session, "window.__mapReady === true", 8000);

  // Load the photo as base64 and inject it via a synthetic File, since
  // DOM.setFileInputFiles needs a real filesystem path Chrome can read directly —
  // which works fine here since we already have one.
  const { root } = await session.send("DOM.getDocument");
  const { nodeId } = await session.send("DOM.querySelector", { nodeId: root.nodeId, selector: "#photoInput" });
  const { object } = await session.send("DOM.resolveNode", { nodeId });
  await session.send("DOM.setFileInputFiles", { files: [photoPath], objectId: object.objectId });

  await pollUntil(session, "document.getElementById('stage').hidden === false", 8000);

  if (cornerOverride) {
    await evalExpr(session, `window.__setCorners(${JSON.stringify(cornerOverride)}); true`);
  }

  await evalExpr(session, "document.getElementById('warpBtn').click(); true");
  await pollUntil(session, "!!window.__lastRun", 8000);

  const lastRun = await evalExpr(session, "window.__lastRun");
  const srcSize = await evalExpr(session, "({w: srcCanvas.width, h: srcCanvas.height})");

  const outDir = path.join(REPO_ROOT, "card", "test-photos", "_results");
  mkdirSync(outDir, { recursive: true });
  const base = path.basename(photoPath).replace(/\.[^.]+$/, "");

  const { data: shotBase64 } = await session.send("Page.captureScreenshot", { format: "png" });
  const shotPath = path.join(outDir, `${base}.png`);
  writeFileSync(shotPath, Buffer.from(shotBase64, "base64"));

  const report = { photo: photoPath, srcSize, ...lastRun };
  const jsonPath = path.join(outDir, `${base}.json`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify({ ok: true, jsonPath, screenshotPath: shotPath, blockResults: lastRun.blockResults, blockCalib: lastRun.blockCalib }, null, 2));
} catch (err) {
  console.error("FAILED:", err.message);
  exitCode = 1;
} finally {
  chrome.kill();
}
process.exit(exitCode);
