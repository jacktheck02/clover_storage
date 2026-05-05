import { getCurrentUser } from "@/lib/actions/user.actions";
import { backendJson } from "@/lib/backend/client";
import { revalidatePath } from "next/cache";

type CompleteBody = {
  fileId?: string;
  path?: string;
};

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as CompleteBody;
  if (!body.fileId) {
    return Response.json({ error: "Missing file id" }, { status: 400 });
  }

  await backendJson("/uploads/complete", {
    method: "POST",
    body: JSON.stringify({
      userId: currentUser.$id,
      fileId: body.fileId,
    }),
  });

  if (body.path) revalidatePath(body.path);

  return Response.json({ status: "success" });
}
