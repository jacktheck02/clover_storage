import { getCurrentUser } from "@/lib/actions/user.actions";
import { backendRaw } from "@/lib/backend/client";
import { fileIdParamSchema, getActorHeaders } from "@/lib/security";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return new Response("Unauthorized", { status: 401 });

  const { fileId: rawFileId } = await params;
  const fileId = fileIdParamSchema.safeParse(rawFileId);
  if (!fileId.success) return new Response("Invalid file id", { status: 400 });

  const response = await backendRaw(`/files/${fileId.data}/download`, {
    headers: getActorHeaders(currentUser),
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}
