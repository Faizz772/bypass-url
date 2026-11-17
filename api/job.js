"use strict";

/*
 * Endpoint job untuk engine yang bisa lewat batas waktu fungsi serverless.
 *
 *   POST /api/job?url=...            mulai job, balas 202 + { id, poll }
 *   GET  /api/job?id=<id>            ambil status: running / done / error
 *
 * Catatan penyimpanan: hasil disimpan di memori instance. Di serverless artinya
 * hanya andal kalau instance yang sama menangani polling. Halaman web memakai
 * mode sinkron untuk safelink dan mode job untuk bicolink, sehingga saat job
 * hilang karena instance berpindah, halaman menampilkan error yang jelas.
 */

const crypto = require("node:crypto");
const api = require("./index");

const TTL_MS = 5 * 60 * 1000;
const jobs = new Map();

function sweep() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.touched > TTL_MS) jobs.delete(id);
  }
}

function start(target, engine, options) {
  sweep();
  const id = crypto.randomBytes(12).toString("hex");
  const job = {
    id,
    status: "running",
    created: Date.now(),
    touched: Date.now(),
    data: null,
    error: null,
  };
  jobs.set(id, job);

  const entry = api.ENGINES[engine];
  Promise.resolve()
    .then(() => entry.run(target, options || {}))
    .then((result) => {
      job.touched = Date.now();
      if (result && result.status) {
        job.status = "done";
        job.data = result;
      } else {
        job.status = "error";
        job.error = (result && result.error) || "Engine tidak mengembalikan hasil.";
        job.raw = result && (result.raw || (result.trace || []).join("\n"));
      }
    })
    .catch((e) => {
      job.touched = Date.now();
      job.status = "error";
      job.error = (e && e.message) || "Internal error";
    });

  return job;
}

function view(job) {
  const out = { id: job.id, status: job.status };
  if (job.status === "done") {
    out.data = job.data.data;
    out.source = job.data.source;
    out.execution_time_ms = job.data.execution_time_ms;
  }
  if (job.status === "error") {
    out.error = job.error;
    if (job.raw) out.raw = job.raw;
  }
  return out;
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

async function handle(req, res) {
  const u = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET") {
    const job = jobs.get(u.searchParams.get("id") || "");
    if (!job) {
      sendJson(res, 404, {
        status: "error",
        error: "Job tidak ditemukan atau sudah kedaluwarsa. Jalankan lagi dari halaman utama.",
      });
      return;
    }
    sendJson(res, 200, view(job));
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Gunakan GET atau POST." });
    return;
  }

  const { target, engine } = api.parse(req);
  if (!target) {
    sendJson(res, 400, { error: "Parameter url wajib diisi." });
    return;
  }
  if (!engine) {
    sendJson(res, 422, { error: "Engine tidak dikenal untuk host tersebut." });
    return;
  }

  const job = start(target, engine, {});
  sendJson(res, 202, { id: job.id, status: "running", poll: `/api/job?id=${job.id}` });
}

module.exports = handle;
module.exports.default = handle;
module.exports.handle = handle;
module.exports.start = start;
module.exports.view = view;
