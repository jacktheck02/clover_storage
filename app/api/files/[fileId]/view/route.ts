import { getCurrentUser } from "@/lib/actions/user.actions";
import { backendRaw } from "@/lib/backend/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) return new Response("Unauthorized", { status: 401 });

  const response = await backendRaw(`/files/${fileId}/view`, {
    headers: {
      "x-clover-user-id": currentUser.$id,
      "x-clover-user-email": currentUser.email,
    },
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}
