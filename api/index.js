"use strict";

/*
 * Router tunggal untuk deployment serverless (Vercel, Node runtime).
 * Endpoint:
 *   GET /api/mgvt?url=<link sfl.gl>   -> safelinku
 *   GET /api/umpc?url=<link bicolink> -> bicolink
 *   GET /api?url=...&engine=auto      -> deteksi otomatis berdasarkan hostname
 */

const mgvt = require("./mgvt");
const umpc = require("./umpc");

const ENGINE_BY_HOST = [
  { test: /(^|\.)sfl\.gl$/i, engine: "mgvt" },
  { test: /(^|\.)bicolink\.com$/i, engine: "umpc" },
];

const ENGINES = {
  mgvt: { run: (u) => mgvt.bypass(u), label: "safelink (sfl.gl)" },
  umpc: { run: (u, o) => umpc.bypass(u, o), label: "bicolink" },
};

function pickEngine(url) {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch (e) {
    return null;
  }
  const hit = ENGINE_BY_HOST.find((e) => e.test.test(host));
  return hit ? hit.engine : null;
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

async function resolveRequest(req) {
  const u = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (!u.pathname.startsWith("/api")) {
    return { status: 404, payload: { status: false, error: "Gunakan /api/mgvt atau /api/umpc." } };
  }

  const target = u.searchParams.get("url");
  const engineParam = u.searchParams.get("engine") || "";
  const pathEngine = u.pathname.split("/")[2] || "";

  let engine = pathEngine && ENGINES[pathEngine] ? pathEngine : "";
  if (!engine && engineParam && ENGINES[engineParam]) engine = engineParam;
  if (!engine && target) engine = pickEngine(target);

  if (!target) {
    return {
      status: 400,
      payload: {
        status: false,
        error: "Parameter url wajib diisi.",
        engines: Object.entries(ENGINES).map(([k, v]) => ({ id: k, label: v.label })),
      },
    };
  }
  if (!engine) {
    return {
      status: 422,
      payload: {
        status: false,
        error: "Engine tidak dikenal untuk host tersebut. Pakai ?engine=mgvt atau ?engine=umpc.",
      },
    };
  }

  try {
    const result = await ENGINES[engine].run(target, {});
    return { status: result.status ? 200 : 502, payload: result };
  } catch (e) {
    return { status: 500, payload: { status: false, error: (e && e.message) || "Internal error" } };
  }
}

async function handle(req, res) {
  const { status, payload } = await resolveRequest(req);
  sendJson(res, status, payload);
}

module.exports = handle;
module.exports.handle = handle;
module.exports.resolveRequest = resolveRequest;
module.exports.pickEngine = pickEngine;
