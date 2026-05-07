import { getFileType } from "@/lib/utils";

export function canPreviewFile(file: Pick<FileDocument, "name">) {
  const { type, extension } = getFileType(file.name);

  return (
    type === "image" ||
    type === "video" ||
    type === "audio" ||
    extension === "pdf" ||
    ["txt", "md", "csv", "zip"].includes(extension)
  );
}
