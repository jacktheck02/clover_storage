"use client";

import React, { useCallback, useState } from "react";

import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { cn, convertFileToUrl, getFileType } from "@/lib/utils";
import Image from "next/image";
import Thumbnail from "@/components/Thumbnail";
import { MAX_FILE_SIZE } from "@/constants";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface Props {
  className?: string;
}

const FileUploader = ({ className }: Props) => {
  const path = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setFiles(acceptedFiles);

      const uploadPromises = acceptedFiles.map(async (file) => {
        if (file.size > MAX_FILE_SIZE) {
          setFiles((prevFiles) =>
            prevFiles.filter((f) => f.name !== file.name),
          );

          toast({
            description: (
              <p className="body-2 text-white">
                <span className="font-semibold">{file.name}</span> is too large.
                Max file size is 50MB.
              </p>
            ),
            className: "error-toast",
          });
          return false;
        }

        const intentResponse = await fetch("/api/uploads/intent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
            path,
          }),
        });

        if (!intentResponse.ok) {
          throw new Error("Failed to create upload intent");
        }

        const intent = (await intentResponse.json()) as {
          fileId: string;
          uploadUrl: string;
          method: "PUT";
        };

        const uploadResponse = await fetch(intent.uploadUrl, {
          method: intent.method,
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file");
        }

        const completeResponse = await fetch("/api/uploads/complete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ fileId: intent.fileId, path }),
        });

        if (!completeResponse.ok) {
          throw new Error("Failed to complete upload");
        }

        setFiles((prevFiles) => prevFiles.filter((f) => f.name !== file.name));
        return true;
      });

      const results = await Promise.allSettled(uploadPromises);
      const hasUploadFailures = results.some(
        (result) => result.status === "rejected"
      );
      const hasCompletedUploads = results.some(
        (result) => result.status === "fulfilled" && result.value
      );

      if (hasUploadFailures) {
        results.forEach((result) => {
          if (result.status === "rejected") console.error(result.reason);
        });
        toast({
          description: (
            <p className="body-2 text-white">
              Upload failed. Please try again.
            </p>
          ),
          className: "error-toast",
        });
      }

      if (hasCompletedUploads) {
        router.refresh();
      }
    },
    [path, router, toast],
  );

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  const handleRemoveFile = (
    e: React.MouseEvent<HTMLImageElement, MouseEvent>,
    fileName: string,
  ) => {
    e.stopPropagation();
    setFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileName));
  };

  return (
    <div {...getRootProps()} className="cursor-pointer">
      <input {...getInputProps()} />
      <Button type="button" className={cn("uploader-button", className)}>
        <Image
          src="/assets/icons/upload.svg"
          alt="upload"
          width={24}
          height={24}
        />{" "}
        <p>Upload</p>
      </Button>
      {files.length > 0 && (
        <ul className="uploader-preview-list">
          <h4 className="h4 text-light-100">Uploading</h4>

          {files.map((file, index) => {
            const { type, extension } = getFileType(file.name);

            return (
              <li
                key={`${file.name}-${index}`}
                className="uploader-preview-item"
              >
                <div className="flex items-center gap-3">
                  <Thumbnail
                    type={type}
                    extension={extension}
                    url={convertFileToUrl(file)}
                  />

                  <div className="preview-item-name">
                    {file.name}
                    <Image
                      src="/assets/icons/file-loader.gif"
                      width={80}
                      height={26}
                      alt="Loader"
                      unoptimized
                    />
                  </div>
                </div>

                <Image
                  src="/assets/icons/remove.svg"
                  width={24}
                  height={24}
                  alt="Remove"
                  onClick={(e) => handleRemoveFile(e, file.name)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default FileUploader;
