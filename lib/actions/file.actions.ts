"use server";

import { parseStringify } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { backendJson } from "@/lib/backend/client";

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

export const getFiles = async ({
  types = [],
  searchText = "",
  sort = "$createdAt-desc",
  limit,
  userId,
  userEmail,
}: GetFilesProps) => {
  try {
    let ownerId = userId;
    let email = userEmail;

    if (!ownerId || !email) {
      const currentUser = await getCurrentUser();

      if (!currentUser) throw new Error("User not found");

      ownerId = currentUser.$id;
      email = currentUser.email;
    }

    if (!ownerId || !email) throw new Error("User not found");

    const files = await backendJson<FilesResponse>("/files/list", {
      method: "POST",
      body: JSON.stringify({
        ownerId,
        email,
        types,
        searchText,
        sort,
        limit,
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
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("User is not authenticated.");

    await backendJson("/files/rename", {
      method: "POST",
      body: JSON.stringify({
        userId: currentUser.$id,
        fileId,
        name,
        extension,
      }),
    });

    revalidatePath(path);
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
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("User is not authenticated.");
    await backendJson("/files/share", {
      method: "POST",
      body: JSON.stringify({
        userId: currentUser.$id,
        userEmail: currentUser.email,
        fileId,
        emails,
      }),
    });

    revalidatePath(path);
    return parseStringify({ status: "success" });
  } catch (error) {
    handleError(error, "Failed to update file users");
  }
};

export const deleteFile = async ({
  fileId,
  bucketFileId,
  path,
}: DeleteFileProps) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("User is not authenticated.");

    await backendJson("/files/delete", {
      method: "POST",
      body: JSON.stringify({
        userId: currentUser.$id,
        fileId,
        bucketFileId,
      }),
    });

    revalidatePath(path);
    return parseStringify({ status: "success" });
  } catch (error) {
    handleError(error, "Failed to delete file");
  }
};

// ============================== TOTAL FILE SPACE USED
export async function getTotalSpaceUsed(ownerId?: string) {
  try {
    let currentUserId = ownerId;

    if (!currentUserId) {
      const currentUser = await getCurrentUser();
      if (!currentUser) throw new Error("User is not authenticated.");
      currentUserId = currentUser.$id;
    }

    const totalSpace = await backendJson("/files/total-space", {
      method: "POST",
      body: JSON.stringify({ ownerId: currentUserId }),
    });

    return parseStringify(totalSpace);
  } catch (error) {
    handleError(error, "Error calculating total space used:, ");
  }
}
