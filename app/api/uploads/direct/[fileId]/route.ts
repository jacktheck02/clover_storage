import { getCurrentUser } from "@/lib/actions/user.actions";
import { backendRaw } from "@/lib/backend/client";
import {
  fileIdParamSchema,
  getActorHeaders,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/security";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId: rawFileId } = await params;
    const fileId = fileIdParamSchema.safeParse(rawFileId);
    if (!fileId.success) {
      return Response.json({ error: "Invalid file id" }, { status: 400 });
    }

    const fileBytes = await request.arrayBuffer();
    if (fileBytes.byteLength > MAX_FILE_SIZE_BYTES) {
      return Response.json({ error: "File too large" }, { status: 413 });
    }

    const response = await backendRaw(`/uploads/direct/${fileId.data}`, {
      method: "PUT",
      headers: {
        "content-length": String(fileBytes.byteLength),
        "content-type":
          request.headers.get("content-type") || "application/octet-stream",
        ...getActorHeaders(currentUser),
      },
      body: fileBytes,
    });

    if (!response.ok) {
      return Response.json(
        { error: await response.text() },
        { status: response.status }
      );
    }

    return Response.json({
      status: "uploaded",
    });
  } catch (error) {
    console.error("Direct upload failed", error);
    return Response.json({ error: "Direct upload failed" }, { status: 500 });
  }
}
