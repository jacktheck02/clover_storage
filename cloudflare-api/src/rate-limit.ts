import { nowIso } from "./http";
import type { Env } from "./types";

export async function assertRateLimit(
  env: Env,
  key: string,
  action: string,
  limit: number,
  windowSeconds: number
) {
  const windowStart = Math.floor(Date.now() / (windowSeconds * 1000));
  const result = await env.DB.prepare(
    `SELECT count FROM auth_rate_limits
     WHERE key = ? AND action = ? AND window_start = ?`
  )
    .bind(key, action, windowStart)
    .first<{ count: number }>();

  if ((result?.count || 0) >= limit) {
    throw new Response("Too many attempts. Please try again later.", {
      status: 429,
    });
  }

  await env.DB.prepare(
    `INSERT INTO auth_rate_limits (key, action, window_start, count)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(key, action, window_start)
     DO UPDATE SET count = count + 1`
  )
    .bind(key, action, windowStart)
    .run();
}

export { nowIso };
