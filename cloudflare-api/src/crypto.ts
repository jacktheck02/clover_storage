import type { Env } from "./types";

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function generateOtp() {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return value.toString().padStart(6, "0");
}

function getSecretPepper(env: Env) {
  return env.AUTH_HASH_PEPPER || env.CLOVER_BACKEND_SECRET;
}

export async function hashSecret(env: Env, secret: string, salt: string) {
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${getSecretPepper(env)}:${salt}:${secret}`)
  );
  return toHex(buffer);
}

export async function deriveOpaqueUuid(env: Env, purpose: string, value: string) {
  const hex = await hashSecret(env, value, purpose);
  const variant = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}
