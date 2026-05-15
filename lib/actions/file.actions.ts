"use server";

import { parseStringify } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getCurrentAuthenticatedUser } from "@/lib/actions/user.actions";
import { backendJson } from "@/lib/backend/client";
import {
  deleteFileSchema,
  getActorHeaders,
  getFilesSchema,
  getSafeRevalidationPath,
  renameFileSchema,
  updateFileUsersSchema,
} from "@/lib/security";

const handleError = (error: unknown, message: string) => {
  after(() => console.log(error, message));
  throw error;
};

export const getFiles = async (input: GetFilesProps = {}) => {
  try {
    const auth = await getCurrentAuthenticatedUser();
    if (!auth) throw new Error("User not found");
    const params = getFilesSchema.parse(input);

    const files = await backendJson<FilesResponse>("/files/list", {
      method: "POST",
      headers: getActorHeaders(auth.user, auth.session),
      body: JSON.stringify({
        types: params.types,
        searchText: params.searchText,
        sort: params.sort,
        limit: params.limit,
      }),
    });

    return parseStringify(files);
  } catch (error) {
    handleError(error, "Failed to get files");
  }
};

export const renameFile = async ({
  fileId,
  name,
  extension,
  path,
}: RenameFileProps) => {
  try {
    const auth = await getCurrentAuthenticatedUser();
    if (!auth) throw new Error("User is not authenticated.");
    const params = renameFileSchema.parse({ fileId, name, extension, path });

    await backendJson("/files/rename", {
      method: "POST",
      headers: getActorHeaders(auth.user, auth.session),
      body: JSON.stringify({
        fileId: params.fileId,
        name: params.name,
        extension: params.extension,
      }),
    });

    const revalidationPath = getSafeRevalidationPath(params.path);
    if (revalidationPath) revalidatePath(revalidationPath);
    return parseStringify({ status: "success" });
  } catch (error) {
    handleError(error, "Failed to rename file");
  }
};

export const updateFileUsers = async ({
  fileId,
  emails,
  path,
}: UpdateFileUsersProps) => {
  try {
    const auth = await getCurrentAuthenticatedUser();
    if (!auth) throw new Error("User is not authenticated.");
    const params = updateFileUsersSchema.parse({ fileId, emails, path });
    await backendJson("/files/share", {
      method: "POST",
      headers: getActorHeaders(auth.user, auth.session),
      body: JSON.stringify({
        fileId: params.fileId,
        emails: params.emails,
      }),
    });

    const revalidationPath = getSafeRevalidationPath(params.path);
    if (revalidationPath) revalidatePath(revalidationPath);
    return parseStringify({ status: "success" });
  } catch (error) {
    handleError(error, "Failed to update file users");
  }
};

export const deleteFile = async ({
  fileId,
  path,
}: DeleteFileProps) => {
  try {
    const auth = await getCurrentAuthenticatedUser();
    if (!auth) throw new Error("User is not authenticated.");
    const params = deleteFileSchema.parse({ fileId, path });

    await backendJson("/files/delete", {
      method: "POST",
      headers: getActorHeaders(auth.user, auth.session),
      body: JSON.stringify({
        fileId: params.fileId,
      }),
    });

    const revalidationPath = getSafeRevalidationPath(params.path);
    if (revalidationPath) revalidatePath(revalidationPath);
    return parseStringify({ status: "success" });
  } catch (error) {
    handleError(error, "Failed to delete file");
  }
};

// ============================== TOTAL FILE SPACE USED
export async function getTotalSpaceUsed() {
  const auth = await getCurrentAuthenticatedUser();
  if (!auth) throw new Error("User is not authenticated.");

  try {
    const totalSpace = await backendJson("/files/total-space", {
      method: "POST",
      headers: getActorHeaders(auth.user, auth.session),
      body: JSON.stringify({}),
    });

    return parseStringify(totalSpace);
  } catch (error) {
    handleError(error, "Error calculating total space used:, ");
  }
}
