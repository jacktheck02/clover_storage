const BACKEND_SECRET_HEADER = "X-Clover-Backend-Secret";

function getBackendUrl() {
  const url = process.env.CLOVER_BACKEND_URL;
  if (!url) {
    throw new Error("Missing CLOVER_BACKEND_URL");
  }
  return url.replace(/\/$/, "");
}

function getBackendSecret() {
  const secret = process.env.CLOVER_BACKEND_SECRET;
  if (!secret) {
    throw new Error("Missing CLOVER_BACKEND_SECRET");
  }
  return secret;
}

export function getAuthCookieName() {
  return process.env.AUTH_COOKIE_NAME || "clover-session";
}

export async function backendJson<T>(
  path: string,
  init: RequestInit & { body?: BodyInit | null } = {}
) {
  const headers = new Headers(init.headers);
  headers.set(BACKEND_SECRET_HEADER, getBackendSecret());
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const requestUrl = `${getBackendUrl()}${path}`;
  const response = await fetch(requestUrl, {
    ...init,
    headers,
    cache: "no-store",
  });

  const text = await response.text();
  const data = text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return { error: text };
        }
      })()
    : null;

  if (!response.ok) {
    throw new Error(data?.error || `Backend request failed: ${response.status}`);
  }

  return data as T;
}

export async function backendRaw(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set(BACKEND_SECRET_HEADER, getBackendSecret());

  return fetch(`${getBackendUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}
