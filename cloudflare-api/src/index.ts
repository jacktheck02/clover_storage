import { assertAuthorized, handleAuth } from "./auth";
import { handleFileObject } from "./objects";
import { handleFiles } from "./files";
import { handleUploads } from "./uploads";
import { json } from "./http";
import type { Env } from "./types";

const worker = {
  async fetch(request: Request, env: Env) {
    try {
      if (request.method === "OPTIONS") return new Response(null, { status: 204 });
      assertAuthorized(request, env);

      const path = new URL(request.url).pathname;
      const response =
        (await handleAuth(request, env, path)) ||
        (await handleFiles(request, env, path)) ||
        (await handleUploads(request, env, path)) ||
        (await handleFileObject(request, env, path));

      return response || json({ error: "Not found" }, { status: 404 });
    } catch (error) {
      if (error instanceof Response) return error;
      console.error(error);
      return json({ error: "Internal server error" }, { status: 500 });
    }
  },
};

export default worker;
