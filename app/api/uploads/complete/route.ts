import { getCurrentUser } from "@/lib/actions/user.actions";
import { backendJson } from "@/lib/backend/client";
import { revalidatePath } from "next/cache";
import {
  fileIdBodySchema,
  getActorHeaders,
  getSafeRevalidationPath,
  parseJsonRequest,
} from "@/lib/security";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await parseJsonRequest(request);
  } catch (error) {
    if (error instanceof Response) return error;
    body = {};
  }

  const result = fileIdBodySchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: "Missing file id" }, { status: 400 });
  }

  await backendJson("/uploads/complete", {
    method: "POST",
    headers: getActorHeaders(currentUser),
    body: JSON.stringify({
      fileId: result.data.fileId,
    }),
  });

  const revalidationPath = getSafeRevalidationPath(result.data.path);
  if (revalidationPath) revalidatePath(revalidationPath);

  return Response.json({ status: "success" });
}
