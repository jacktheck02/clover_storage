"use client";

import { ActionDropdown } from "@/components/ActionDropdown";
import { FilePreview } from "@/components/FilePreview";
import { FileThumbnail } from "@/components/FileThumbnail";
import { isSharedWithUser, SharedFileBadge } from "@/components/SharedFileBadge";
import { convertFileSize, formatDateTime } from "@/lib/utils";
import { useRef, useState } from "react";

export function FileCard({
  file,
  currentUser,
}: {
  file: FileDocument;
  currentUser: UserDocument;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const suppressPreviewOpenUntil = useRef(0);
  const sharedWithCurrentUser = isSharedWithUser(file, currentUser);

  const suppressNextPreviewOpen = () => {
    suppressPreviewOpenUntil.current = Date.now() + 500;
  };

  const openFilePreview = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (
      Date.now() < suppressPreviewOpenUntil.current ||
      target.closest(".file-action-dropdown") ||
      target.closest("[data-radix-portal]") ||
      target.closest('[role="dialog"]') ||
      document.querySelector('[role="dialog"][data-state="open"]')
    ) {
      event.stopPropagation();
      return;
    }

    setPreviewOpen(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (
      target.closest(".file-action-dropdown") ||
      document.querySelector('[role="dialog"][data-state="open"]')
    ) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setPreviewOpen(true);
    }
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={openFilePreview}
        onKeyDown={handleKeyDown}
        className={[
          "group flex min-h-[172px] flex-col justify-between rounded-lg bg-[#f8f2f0]/65 p-3 transition-colors hover:bg-[#f3edea] dark:bg-[#1d1b1a]/55 dark:hover:bg-[#1d1b1a]",
          sharedWithCurrentUser &&
            "ring-1 ring-[#056e7d]/25 dark:ring-[#5bd7bf]/30",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="flex items-start justify-between">
          <FileThumbnail
            file={file}
            className="size-14 rounded-xl"
            iconClassName="size-7"
            sizes="56px"
          />
          <div className="file-action-dropdown">
            <ActionDropdown
              file={file}
              onSuppressPreviewOpen={suppressNextPreviewOpen}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="line-clamp-2 text-sm font-semibold text-[#1d1b1a] dark:text-[#f5efed]">
              {file.name}
            </p>
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
              {sharedWithCurrentUser && (
                <SharedFileBadge ownerName={file.owner.fullName} />
              )}
              <span className="text-xs text-[#7f756d] dark:text-[#d0c4bb]">
                {formatDateTime(file.$createdAt)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 text-xs text-[#4d453e] dark:text-[#d0c4bb]">
            <span>{convertFileSize(file.size)}</span>
            <span className="max-w-[55%] truncate">By {file.owner.fullName}</span>
          </div>
        </div>
      </div>
      <FilePreview
        file={previewOpen ? file : null}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
}
