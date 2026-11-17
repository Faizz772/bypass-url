import api from "./index.js";

/*
 * Adapter untuk Vercel Node runtime (req/res classic).
 * Domain: /api/mgvt, /api/umpc, dan /api (auto-detect).
 */
export default async function handler(req, res) {
  await api.handle(req, res);
}
