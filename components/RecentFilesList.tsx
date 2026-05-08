"use client";

import { ActionDropdown } from "@/components/ActionDropdown";
import { FilePreview } from "@/components/FilePreview";
import { FileThumbnail } from "@/components/FileThumbnail";
import { canPreviewFile } from "@/components/preview-utils";
import { convertFileSize, formatDateTime } from "@/lib/utils";
import { useState } from "react";

export function RecentFilesList({ files }: { files: FileDocument[] }) {
  const [previewFile, setPreviewFile] = useState<FileDocument | null>(null);

  if (files.length === 0) {
    return (
      <p className="rounded-lg bg-[#f8f2f0] px-4 py-8 text-center text-sm text-[#7f756d] dark:bg-[#32302e] dark:text-[#d0c4bb]">
        No files uploaded
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-1">
        {files.map((file) => {
          const canPreview = canPreviewFile(file);

          return (
            <li key={file.$id}>
              <a
                href={canPreview ? "#" : file.url}
                target={canPreview ? undefined : "_blank"}
                rel={canPreview ? undefined : "noopener noreferrer"}
                onClick={(event) => {
                  const target = event.target as HTMLElement;
                  if (
                    target.closest(".file-action-dropdown") ||
                    target.closest("[data-radix-portal]") ||
                    document.querySelector('[role="dialog"][data-state="open"]')
                  ) {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                  }

                  if (canPreview) {
                    event.preventDefault();
                    setPreviewFile(file);
                  }
                }}
                className="flex items-center justify-between gap-3 rounded-lg p-2 transition-colors hover:bg-[#f8f2f0] dark:hover:bg-[#32302e]"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <FileThumbnail file={file} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[#1d1b1a] dark:text-[#f5efed]">
                      {file.name}
                    </span>
                    <span className="block text-xs text-[#7f756d] dark:text-[#d0c4bb]">
                      {convertFileSize(file.size)} · {formatDateTime(file.$createdAt)}
                    </span>
                  </span>
                </span>
                <span
                  className="file-action-dropdown shrink-0"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  <ActionDropdown file={file} />
                </span>
              </a>
            </li>
          );
        })}
      </ul>
      <FilePreview
        file={previewFile}
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
      />
    </>
  );
}
