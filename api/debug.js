"use strict";

const http = require("node:http");
const https = require("node:https");
const umpc = require("./umpc");

module.exports = async function handler(req, res) {
  const target = new URL(req.url, "http://x").searchParams.get("url") || "https://bicolink.com/wFFcZL";
  const out = {};
  const t0 = Date.now();
  try {
    const r = await fetch(target, {
      headers: { "User-Agent": umpc.CREDIT ? "Mozilla/5.0 Chrome/120" : "x" },
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    out.fetch = { status: r.status, ms: Date.now() - t0 };
  } catch (e) {
    out.fetch = { error: e.message, ms: Date.now() - t0 };
  }

  const t1 = Date.now();
  out.http = await new Promise((resolve) => {
    const lib = target.startsWith("https") ? https : http;
    const req2 = lib.request(target, { method: "GET", headers: { "User-Agent": "Mozilla/5.0 Chrome/120" } }, (r) => {
      let n = 0;
      r.on("data", (c) => (n += c.length));
      r.on("end", () => resolve({ status: r.statusCode, bytes: n, ms: Date.now() - t1 }));
    });
    req2.setTimeout(8000, () => {
      req2.destroy(new Error("socket timeout"));
    });
    req2.on("error", (e) => resolve({ error: e.message, ms: Date.now() - t1 }));
    req2.end();
  });

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(out));
};

module.exports.default = module.exports;
