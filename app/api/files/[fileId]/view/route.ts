import { getCurrentAuthenticatedUser } from "@/lib/actions/user.actions";
import { backendRaw } from "@/lib/backend/client";
import { fileIdParamSchema, getActorHeaders } from "@/lib/security";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId: rawFileId } = await params;
  const fileId = fileIdParamSchema.safeParse(rawFileId);
  if (!fileId.success) return new Response("Invalid file id", { status: 400 });

  const auth = await getCurrentAuthenticatedUser();
  if (!auth) return new Response("Unauthorized", { status: 401 });

  const headers = new Headers(getActorHeaders(auth.user, auth.session));
  const range = request.headers.get("range");
  if (range) headers.set("range", range);

  const response = await backendRaw(`/files/${fileId.data}/view`, { headers });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}
