declare type FileType = "document" | "image" | "video" | "audio" | "other";

declare interface UserDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  accountId: string;
  fullName: string;
  email: string;
}

declare interface FileDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  type: FileType;
  name: string;
  url: string;
  extension: string;
  size: number;
  owner: {
    $id: string;
    fullName: string;
    email: string;
  };
  accountId: string;
  users: string[];
  mimeType?: string;
}

declare interface FilesResponse {
  total: number;
  documents: FileDocument[];
}

declare interface ActionType {
  label: string;
  icon: string;
  value: string;
}

declare interface SearchParamProps {
  params?: Promise<SegmentParams>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

declare interface UploadFileProps {
  file: File;
  path: string;
}
declare interface GetFilesProps {
  types?: FileType[];
  searchText?: string;
  sort?: string;
  limit?: number;
}
declare interface RenameFileProps {
  fileId: string;
  name: string;
  extension: string;
  path: string;
}
declare interface UpdateFileUsersProps {
  fileId: string;
  emails: string[];
  path: string;
}
declare interface DeleteFileProps {
  fileId: string;
  path: string;
}

declare interface FileUploaderProps {
  className?: string;
}

declare interface ThumbnailProps {
  type: string;
  extension: string;
  url: string;
  className?: string;
  imageClassName?: string;
}

declare interface ShareInputProps {
  file: FileDocument;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (email: string) => void;
}

declare module "jsmediatags/dist/jsmediatags.min.js";
