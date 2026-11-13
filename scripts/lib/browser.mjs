import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export async function until(predicate, label, timeout = 20000) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeout) {
    try { const value = await predicate(); if (value) return value; } catch (error) { lastError = error; }
    await delay(100);
  }
  throw new Error(`Timed out: ${label}${lastError ? ` (${lastError.message})` : ""}`);
}
export function availablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}
export class BrowserPage {
  constructor(socket) {
    this.socket = socket; this.id = 0; this.pending = new Map(); this.errors = [];
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        clearTimeout(pending.timer);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
      } else if (message.method === "Runtime.exceptionThrown") this.errors.push(message.params.exceptionDetails);
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timed out: ${method}`)); }, 25000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  }
  async navigate(url) {
    await this.send("Page.navigate", { url });
    await until(() => this.evaluate(`document.readyState === 'complete' && location.href === ${JSON.stringify(new URL(url).href)}`), `load ${url}`);
    await delay(200);
  }
  async waitText(text) {
    await this.send("Page.bringToFront");
    return until(() => this.evaluate(`document.body.innerText.toLowerCase().includes(${JSON.stringify(text.toLowerCase())})`), `text ${text}`);
  }
  async clickText(selector, text) {
    await this.evaluate(`(() => { const element = [...document.querySelectorAll(${JSON.stringify(selector)})].find(e => e.textContent.trim() === ${JSON.stringify(text)}); if (!element) throw new Error('Missing control: ' + ${JSON.stringify(text)}); element.click(); return true; })()`);
  }
  async submit(selector, values, buttonText) {
    await this.evaluate(`(() => {
      const form = document.querySelector(${JSON.stringify(selector)}); if (!form) throw new Error('Missing form: ' + ${JSON.stringify(selector)});
      for (const [name, value] of Object.entries(${JSON.stringify(values)})) {
        const input = form.elements.namedItem(name); if (!input) throw new Error('Missing input: ' + name);
        if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement || input instanceof HTMLTextAreaElement) {
          const proto = input instanceof HTMLInputElement ? HTMLInputElement.prototype : input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLTextAreaElement.prototype;
          Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, value);
        } else input.value = value;
        for (const element of input instanceof Element ? [input] : [...input]) { element.dispatchEvent(new Event('input', {bubbles:true})); element.dispatchEvent(new Event('change', {bubbles:true})); }
      }
      const button = [...form.querySelectorAll('button[type=submit]')].find(b => ${JSON.stringify(buttonText ?? null)} == null || b.textContent.trim() === ${JSON.stringify(buttonText ?? null)});
      if (!button) throw new Error('Missing submit button');
      form.requestSubmit(button); return true;
    })()`);
  }
  async screenshot(file, width = 1360, height = 1000) {
    await this.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 700 });
    await delay(150);
    const result = await this.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    await writeFile(file, Buffer.from(result.data, "base64"));
    return this.evaluate("({width:innerWidth, scroll:document.documentElement.scrollWidth})");
  }
  close() { this.socket.close(); }
}
export async function launchBrowser(directory) {
  const port = await availablePort();
  const profile = path.join(directory, "chrome-profile");
  await mkdir(profile, { recursive: true });
  const executable = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const child = spawn(executable, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, "--window-size=1360,1000"], { stdio: "ignore" });
  child.on("error", () => {});
  await until(async () => (await fetch(`http://127.0.0.1:${port}/json/version`)).ok, "Chrome startup");
  const pages = [];
  return {
    child,
    async page() {
      const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
      const socket = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
      const page = new BrowserPage(socket);
      await page.send("Runtime.enable"); await page.send("Page.enable");
      pages.push(page);
      return page;
    },
    close() { for (const page of pages) page.close(); child.kill("SIGTERM"); },
  };
}
