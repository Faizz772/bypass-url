"use strict";

// Endpoint diagnostik: jalankan 1 request HTTP biasa dan laporkan durasi/status.
// Hapus file ini kalau tidak dibutuhkan lagi.

const { spawn } = require("node:child_process");
const { spawnSync } = require("node:child_process");

function findPython() {
  for (const bin of ["python3", "python"]) {
    const r = spawnSync(bin, ["--version"], { timeout: 5000 });
    if (!r.error && r.status === 0) return bin;
  }
  return null;
}

module.exports = async function handler(req, res) {
  const target = new URL(req.url, "http://x").searchParams.get("url") || "https://bicolink.com/wFFcZL";
  const t0 = Date.now();
  const out = { transport: null, status: null, error: null, ms: 0 };
  try {
    const r = await Promise.race([
      fetch(target, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html",
        },
        redirect: "manual",
        signal: AbortSignal.timeout(20000),
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("hard timeout 20s")), 20000)),
    ]);
    out.transport = "fetch";
    out.status = r.status;
  } catch (e) {
    out.error = e.message + " | " + String(e.cause && (e.cause.code || e.cause.message));
  }
  const bin = findPython();
  out.python = bin || "not found";
  out.ms = Date.now() - t0;

  if (bin) {
    const py = await new Promise((resolve) => {
      const p = spawn(bin, ["-c", "print('hello from py')"], { stdio: ["ignore", "pipe", "pipe"] });
      let o = "";
      p.stdout.on("data", (d) => (o += d));
      const killer = setTimeout(() => p.kill("SIGKILL"), 10000);
      p.on("exit", (code) => {
        clearTimeout(killer);
        resolve({ code, out: o.trim() });
      });
      p.on("error", (e) => resolve({ error: e.message }));
    });
    out.pySpawn = py;

    const pyFetch = await new Promise((resolve) => {
      const src = "import urllib.request,sys\ntry:\n r=urllib.request.urlopen('https://bicolink.com/wFFcZL',timeout=15)\n print('status',r.status)\nexcept Exception as e:\n print('err',type(e).__name__,e)";
      const p = spawn(bin, ["-u", "-c", src], { stdio: ["ignore", "pipe", "pipe"] });
      let o = "";
      p.stdout.on("data", (d) => (o += d));
      p.stderr.on("data", (d) => (o += d));
      const killer = setTimeout(() => p.kill("SIGKILL"), 20000);
      p.on("exit", (code) => {
        clearTimeout(killer);
        resolve({ code, out: o.trim().slice(0, 300) });
      });
      p.on("error", (e) => resolve({ error: e.message }));
    });
    out.pyFetch = pyFetch;
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(out));
};

module.exports.default = module.exports;
