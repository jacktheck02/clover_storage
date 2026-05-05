import { MAX_FILE_SIZE } from "@/constants";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { backendJson } from "@/lib/backend/client";

type UploadIntentBody = {
  name?: string;
  size?: number;
  type?: string;
};

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as UploadIntentBody;
  if (!body.name || !body.size || body.size <= 0) {
    return Response.json({ error: "Invalid file metadata" }, { status: 400 });
  }

  if (body.size > MAX_FILE_SIZE) {
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
    body: JSON.stringify({
      userId: currentUser.$id,
      name: body.name,
      size: body.size,
      type: body.type || "application/octet-stream",
    }),
  });

  return Response.json({
    ...intent,
    uploadUrl: intent.uploadUrl || `/api/uploads/direct/${intent.fileId}`,
  });
}
