"use client";

import { useState } from "react";
import Thumbnail from "@/components/Thumbnail";
import { convertFileSize, getFileType } from "@/lib/utils";
import FormattedDateTime from "@/components/FormattedDateTime";
import ActionDropdown from "@/components/ActionDropdown";
import FilePreview from "@/components/FilePreview";

const Card = ({ file }: { file: FileDocument }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileType = getFileType(file.name);
  const { type, extension } = fileType;

  // Determine if file can be previewed
  const canPreview =
    type === "image" ||
    type === "video" ||
    extension === "pdf" ||
    ["txt", "md", "csv", "zip"].includes(extension);

  const handleClick = (e: React.MouseEvent) => {
    // Don't open preview if clicking on the action dropdown or any Radix dropdown menu
    const target = e.target as HTMLElement;

    // Check if clicking on dropdown elements, dialogs, or their overlays
    if (
      target.closest(".action-dropdown") ||
      target.closest('[role="menu"]') ||
      target.closest("[data-radix-dropdown-menu-content]") ||
      target.closest("[data-radix-dropdown-menu-trigger]") ||
      target.closest("[data-radix-portal]") ||
      target.closest('[role="dialog"]') ||
      target.closest("[data-radix-dialog-overlay]") ||
      target.closest("[data-radix-dialog-content]") ||
      // Check if any dialog/modal is currently open
      document.querySelector('[role="dialog"][data-state="open"]')
    ) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (canPreview) {
      e.preventDefault();
      setIsPreviewOpen(true);
    }
    // For non-previewable files, let the default link behavior happen
  };

  return (
    <>
      <a
        href={canPreview ? "#" : file.url}
        onClick={handleClick}
        target={canPreview ? undefined : "_blank"}
        rel={canPreview ? undefined : "noopener noreferrer"}
        className="file-card"
      >
        <div className="flex justify-between">
          <Thumbnail
            type={file.type}
            extension={file.extension}
            url={file.url}
            className="!size-20"
            imageClassName="!size-11"
          />

          <div className="flex flex-col items-end justify-between">
            <div
              className="action-dropdown"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <ActionDropdown file={file} />
            </div>
            <p className="body-1">{convertFileSize(file.size)}</p>
          </div>
        </div>

        <div className="file-card-details">
          <p className="subtitle-2 line-clamp-1">{file.name}</p>
          <FormattedDateTime
            date={file.$createdAt}
            className="body-2 text-light-100"
          />
          <p className="caption line-clamp-1 text-light-200">
            By: {file.owner.fullName}
          </p>
        </div>
      </a>
      <FilePreview
        file={isPreviewOpen ? file : null}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </>
  );
};
export default Card;
