"use client";

import { ActionDropdown } from "@/components/ActionDropdown";
import { FileIcon } from "@/components/FileIcon";
import { FilePreview } from "@/components/FilePreview";
import { canPreviewFile } from "@/components/preview-utils";
import { convertFileSize, formatDateTime } from "@/lib/utils";
import { useState } from "react";

export function FileCard({ file }: { file: FileDocument }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const canPreview = canPreviewFile(file);

  const handleClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (
      target.closest(".file-action-dropdown") ||
      target.closest("[data-radix-portal]") ||
      target.closest('[role="dialog"]') ||
      document.querySelector('[role="dialog"][data-state="open"]')
    ) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (canPreview) {
      event.preventDefault();
      setPreviewOpen(true);
    }
  };

  return (
    <>
      <a
        href={canPreview ? "#" : file.url}
        onClick={handleClick}
        target={canPreview ? undefined : "_blank"}
        rel={canPreview ? undefined : "noopener noreferrer"}
        className="group flex min-h-[210px] flex-col justify-between rounded-xl border border-[#e7e1df] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.03)] transition-transform hover:scale-[0.98] dark:border-[#7f756d] dark:bg-[#1d1b1a]"
      >
        <div className="flex items-start justify-between">
          <FileIcon type={file.type} className="size-14 rounded-xl" iconClassName="size-7" />
          <div className="file-action-dropdown" onClick={(event) => event.stopPropagation()}>
            <ActionDropdown file={file} />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="line-clamp-2 text-sm font-semibold text-[#1d1b1a] dark:text-[#f5efed]">
              {file.name}
            </p>
            <p className="mt-1 text-xs text-[#7f756d] dark:text-[#d0c4bb]">
              {formatDateTime(file.$createdAt)}
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-[#e7e1df] pt-3 text-xs text-[#4d453e] dark:border-[#4d453e] dark:text-[#d0c4bb]">
            <span>{convertFileSize(file.size)}</span>
            <span className="max-w-[55%] truncate">By {file.owner.fullName}</span>
          </div>
        </div>
      </a>
      <FilePreview
        file={previewOpen ? file : null}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
}
