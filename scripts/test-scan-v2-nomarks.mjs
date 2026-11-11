#!/usr/bin/env node
// Proves the no-corner-squares path reads a card the same way the corner squares
// do. Runs one photo twice in scan-v2.html: once normally (marks auto-detected),
// then again in no-squares mode with the four handles placed exactly where the
// printed rules are, and diffs the two reads.
//
// Usage: node scripts/test-scan-v2-nomarks.mjs <photo-path>

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9833 + Math.floor(Math.random() * 400);
// Served over HTTP, not opened as a file: the scanner measures its ruler through
// an iframe, and file:// pages are cross-origin to each other.
const HTTP_PORT = PORT + 1;
const PAGE_URL = `http://127.0.0.1:${HTTP_PORT}/scan-v2.html`;

const args = process.argv.slice(2);
const photoArg = args.find(a => !a.startsWith("--"));
if (!photoArg) { console.error("Usage: node scripts/test-scan-v2-nomarks.mjs <photo-path> [--jitter=<mm>]"); process.exit(1); }
const photoPath = path.resolve(photoArg);
// How far a human hand misses by. Each handle is pushed this far in a different
// direction, which is the worst case: it tilts and stretches the quad rather
// than sliding it, and a slide is the only error the bubble refinement removes.
const jitterMM = Number((args.find(a => a.startsWith("--jitter=")) || "").split("=")[1]) || 0;

const httpJson = (url, opts) => fetch(url, opts).then(r => r.json());

async function waitForCdp(port, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { await httpJson(`http://127.0.0.1:${port}/json/version`); return; }
    catch { await new Promise(r => setTimeout(r, 100)); }
  }
  throw new Error("Chrome DevTools endpoint never came up");
}

class CdpSession {
  constructor(ws) {
    this.ws = ws; this.nextId = 1; this.pending = new Map();
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
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
}

async function evalExpr(session, expression) {
  const r = await session.send("Runtime.evaluate", { expression, returnByValue: true });
  if (r.exceptionDetails) throw new Error("Page error: " + JSON.stringify(r.exceptionDetails));
  return r.result.value;
}

async function pollUntil(session, expression, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = await evalExpr(session, expression);
    if (v) return v;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

// What a run actually decided, reduced to the part that must not change.
const summarise = (run) => ({
  error: run.error || null,
  badMarks: run.badMarks || null,
  side: run.side ?? null,
  groups: (run.groups || []).map(g => ({ name: g.name, value: g.value, flag: g.flag || null })),
});

const server = spawn("python3", ["-m", "http.server", String(HTTP_PORT), "--bind", "127.0.0.1",
  "--directory", path.join(REPO_ROOT, "public")], { stdio: "ignore" });

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox",
  `--remote-debugging-port=${PORT}`, "--window-size=1400,2000",
], { stdio: "ignore" });

let exitCode = 0;
try {
  await waitForCdp(PORT);
  const tab = await httpJson(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(PAGE_URL)}`, { method: "PUT" });
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
  const session = new CdpSession(ws);
  await session.send("Runtime.enable");
  await session.send("DOM.enable");

  await pollUntil(session, "window.__mapReady === true");

  const { root } = await session.send("DOM.getDocument");
  const { nodeId } = await session.send("DOM.querySelector", { nodeId: root.nodeId, selector: "#file" });
  const { object } = await session.send("DOM.resolveNode", { nodeId });
  await session.send("DOM.setFileInputFiles", { files: [photoPath], objectId: object.objectId });
  await pollUntil(session, "window.__cornersReady === true");

  // 1. the reference read: corner squares, found automatically
  await evalExpr(session, "window.__lastRun = null; document.getElementById('readBtn').click(); true");
  await pollUntil(session, "!!window.__lastRun");
  const withMarks = summarise(await evalExpr(session, "window.__lastRun"));

  // 2. the same card read as if the squares had never printed
  const truth = await evalExpr(session, "window.__anchorsInPhoto()");
  // How close the detector gets to where the corner squares say the rules are.
  const auto = await evalExpr(session, "window.__autoAnchors()");
  let autoErrMM = null;
  if (auto){
    const pxPerMM = Math.hypot(truth.tr.x-truth.tl.x, truth.tr.y-truth.tl.y) / 128;
    autoErrMM = {};
    for (const k of ["tl","tr","bl","br"])
      autoErrMM[k] = +(Math.hypot(auto[k].x-truth[k].x, auto[k].y-truth[k].y) / pxPerMM).toFixed(2);
  }
  // Read with whatever the detector found, exactly as the page would.
  const anchors = auto || truth;
  if (jitterMM){
    // mm -> photo pixels, via the width the card actually occupies in this shot
    const spanMM = 128;   // the anchors span the card's content width
    const scale = Math.hypot(anchors.tr.x - anchors.tl.x, anchors.tr.y - anchors.tl.y) / spanMM;
    const push = { tl:[-1,-1], tr:[1,-1], bl:[-1,1], br:[1,1] };
    for (const k of ["tl","tr","bl","br"]){
      anchors[k].x += push[k][0] * jitterMM * scale;
      anchors[k].y += push[k][1] * jitterMM * scale;
    }
  }
  await evalExpr(session, `window.__setNoMarks(true); window.__setCorners(${JSON.stringify(anchors)}); true`);
  await evalExpr(session, "window.__lastRun = null; document.getElementById('readBtn').click(); true");
  await pollUntil(session, "!!window.__lastRun");
  const noMarks = summarise(await evalExpr(session, "window.__lastRun"));
  const lineFit = await evalExpr(session, "window.__lineFit");

  const diffs = [];
  if (noMarks.error) diffs.push(`no-marks run errored: ${noMarks.error} (${(noMarks.badMarks||[]).join(", ")})`);
  if (withMarks.side !== noMarks.side) diffs.push(`side: ${withMarks.side} -> ${noMarks.side}`);
  withMarks.groups.forEach((g, i) => {
    const o = noMarks.groups[i];
    const a = JSON.stringify(g.value), b = JSON.stringify(o && o.value);
    if (a !== b) diffs.push(`${g.name}: ${a} -> ${b}`);
  });

  console.log(JSON.stringify({
    photo: path.basename(photoPath),
    jitterMM,
    autoFound: !!auto,
    autoErrMM,
    lineFit,                              // darkness ratio per checked rule, <0.75 passes
    groupsCompared: withMarks.groups.length,
    identical: diffs.length === 0,
    diffs,
  }, null, 2));
  if (diffs.length) exitCode = 1;
} catch (err) {
  console.error("FAILED:", err.message);
  exitCode = 1;
} finally {
  chrome.kill();
  server.kill();
}
process.exit(exitCode);
