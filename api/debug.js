"use strict";

// Endpoint diagnostik: jalankan 1 request HTTP biasa dan laporkan durasi/status.
// Hapus file ini kalau tidak dibutuhkan lagi.

const umpc = require("./umpc");

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
  out.ms = Date.now() - t0;
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(out));
};

module.exports.default = module.exports;
