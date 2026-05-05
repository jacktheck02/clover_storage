import { getCurrentUser } from "@/lib/actions/user.actions";
import { backendRaw } from "@/lib/backend/client";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId } = await params;
    const response = await backendRaw(`/uploads/direct/${fileId}`, {
      method: "PUT",
      headers: {
        "content-type":
          request.headers.get("content-type") || "application/octet-stream",
        "x-clover-user-id": currentUser.$id,
      },
      body: request.body,
      duplex: "half",
    } as RequestInit);

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
