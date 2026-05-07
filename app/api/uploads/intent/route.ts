import { MAX_FILE_SIZE } from "@/constants";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { backendJson } from "@/lib/backend/client";
import { getActorHeaders, uploadIntentSchema } from "@/lib/security";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = uploadIntentSchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!result.success) {
    return Response.json({ error: "Invalid file metadata" }, { status: 400 });
  }

  if (result.data.size > MAX_FILE_SIZE) {
    return Response.json({ error: "File too large" }, { status: 413 });
  }

  const intent = await backendJson<{
    fileId: string;
    r2Key: string;
    uploadUrl: string | null;
    method: "PUT";
    directToR2: boolean;
  }>("/uploads/intent", {
    method: "POST",
    headers: getActorHeaders(currentUser),
    body: JSON.stringify({
      name: result.data.name,
      size: result.data.size,
      type: result.data.type || "application/octet-stream",
    }),
  });

  return Response.json({
    ...intent,
    uploadUrl: intent.uploadUrl || `/api/uploads/direct/${intent.fileId}`,
  });
}
