import { z } from "zod";
import { MAX_JSON_BODY_SIZE } from "./constants";
import type { D1Value } from "./types";

const decoder = new TextDecoder();

export function nowIso() {
  return new Date().toISOString();
}

export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function bindAll(statement: D1PreparedStatement, values: D1Value[]) {
  return values.length ? statement.bind(...values) : statement;
}

export async function readJsonBody(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_JSON_BODY_SIZE) {
    throw new Response("Request body too large", { status: 413 });
  }

  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_JSON_BODY_SIZE) {
    throw new Response("Request body too large", { status: 413 });
  }

  if (!body.byteLength) return {};
  return JSON.parse(decoder.decode(body));
}

export async function bodyJson<T>(request: Request) {
  return (await readJsonBody(request).catch((error) => {
    if (error instanceof Response) throw error;
    return {};
  })) as T;
}

export async function parseBody<T extends z.ZodType>(request: Request, schema: T) {
  const body = await readJsonBody(request).catch((error) => {
    if (error instanceof Response) throw error;
    return {};
  });
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new Response("Invalid request", { status: 400 });
  }
  return result.data;
}
