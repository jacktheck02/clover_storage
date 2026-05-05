"use client";

import { useState } from "react";
import { Thumbnail } from "@/components/Thumbnail";
import { FormattedDateTime } from "@/components/FormattedDateTime";
import ActionDropdown from "@/components/ActionDropdown";
import FilePreview from "@/components/FilePreview";
import { getFileType } from "@/lib/utils";

interface RecentFilesListProps {
  files: FileDocument[];
}

const RecentFilesList: React.FC<RecentFilesListProps> = ({ files }) => {
  const [previewFile, setPreviewFile] = useState<FileDocument | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleFileClick = (e: React.MouseEvent, file: FileDocument) => {
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

    const fileType = getFileType(file.name);
    const { type, extension } = fileType;

    // Determine if file can be previewed
    const canPreview =
      type === "image" ||
      type === "video" ||
      extension === "pdf" ||
      ["txt", "md", "csv", "zip"].includes(extension);

    if (canPreview) {
      e.preventDefault();
      setPreviewFile(file);
      setIsPreviewOpen(true);
    }
  };

  if (files.length === 0) {
    return <p className="empty-list">No files uploaded</p>;
  }

  return (
    <>
      <ul className="mt-5 flex flex-col gap-5">
        {files.map((file: FileDocument) => {
          const fileType = getFileType(file.name);
          const { type, extension } = fileType;
          const canPreview =
            type === "image" ||
            type === "video" ||
            extension === "pdf" ||
            ["txt", "md", "csv", "zip"].includes(extension);

          return (
            <a
              key={file.$id}
              href={canPreview ? "#" : file.url}
              onClick={(e) => handleFileClick(e, file)}
              target={canPreview ? undefined : "_blank"}
              rel={canPreview ? undefined : "noopener noreferrer"}
              className="flex items-center gap-3"
            >
              <Thumbnail
                type={file.type}
                extension={file.extension}
                url={file.url}
              />

              <div className="recent-file-details">
                <div className="flex flex-col gap-1">
                  <p className="recent-file-name">{file.name}</p>
                  <FormattedDateTime
                    date={file.$createdAt}
                    className="caption"
                  />
                </div>
                <div
                  className="action-dropdown"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <ActionDropdown file={file} />
                </div>
              </div>
            </a>
          );
        })}
      </ul>
      <FilePreview
        file={previewFile}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewFile(null);
        }}
      />
    </>
  );
};

export default RecentFilesList;
