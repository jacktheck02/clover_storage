import {
  FilmSlate,
  FileText,
  FolderSimple,
  Image,
  MusicNotes,
  SquaresFour,
} from "@phosphor-icons/react/ssr";
import { USER_STORAGE_LIMIT_BYTES } from "@/shared/storage-limits";

export const STORAGE_LIMIT_BYTES = USER_STORAGE_LIMIT_BYTES;

export const navItems = [
  { name: "Dashboard", url: "/", icon: SquaresFour },
  { name: "Documents", url: "/documents", icon: FileText },
  { name: "Images", url: "/images", icon: Image },
  { name: "Media", url: "/media", icon: FilmSlate },
  { name: "Others", url: "/others", icon: FolderSimple },
];

export const fileTypeMeta = {
  document: {
    label: "Documents",
    url: "/documents",
    icon: FileText,
    tone: "bg-[#f4dfcb] text-[#6b5c4c] dark:bg-[#524436] dark:text-[#f4dfcb]",
  },
  image: {
    label: "Images",
    url: "/images",
    icon: Image,
    tone: "bg-[#dee2ef] text-[#414751] dark:bg-[#414751] dark:text-[#dee2ef]",
  },
  video: {
    label: "Media",
    url: "/media",
    icon: FilmSlate,
    tone: "bg-[#056e7d]/15 text-[#056e7d] dark:bg-[#056e7d] dark:text-[#5bd7bf]",
  },
  audio: {
    label: "Media",
    url: "/media",
    icon: MusicNotes,
    tone: "bg-[#056e7d]/15 text-[#056e7d] dark:bg-[#056e7d] dark:text-[#5bd7bf]",
  },
  other: {
    label: "Others",
    url: "/others",
    icon: FolderSimple,
    tone: "bg-[#e7e1df] text-[#4d453e] dark:bg-[#4d453e] dark:text-[#e7e1df]",
  },
} satisfies Record<
  FileType,
  {
    label: string;
    url: string;
    icon: typeof FileText;
    tone: string;
  }
>;

export function getRouteForFile(file: Pick<FileDocument, "type">) {
  return fileTypeMeta[file.type]?.url || "/others";
}

export function getPageTitle(type: string) {
  const titles: Record<string, string> = {
    all: "All Files",
    documents: "Documents",
    images: "Images",
    media: "Media",
    others: "Others",
  };

  return titles[type] || "Documents";
}
