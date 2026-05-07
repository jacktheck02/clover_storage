"use client";

import { Button } from "@/components/ui/button";
import { FileIcon } from "@/components/FileIcon";
import { MAX_FILE_SIZE } from "@/constants";
import { useToast } from "@/hooks/use-toast";
import { cn, convertFileSize, getFileType } from "@/lib/utils";
import { UploadSimple, X } from "@phosphor-icons/react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface FileUploaderProps {
  className?: string;
}

export function FileUploader({ className }: FileUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const path = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setFiles(acceptedFiles);

      const uploadPromises = acceptedFiles.map(async (file) => {
        if (file.size > MAX_FILE_SIZE) {
          setFiles((current) => current.filter((item) => item.name !== file.name));
          toast({
            description: `${file.name} is too large. Max file size is 50MB.`,
            className: "rounded-lg bg-[#ba1a1a] text-white",
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

        if (!intentResponse.ok) throw new Error("Failed to create upload intent");

        const intent = (await intentResponse.json()) as {
          fileId: string;
          uploadUrl: string;
          method: "PUT";
        };

        const uploadResponse = await fetch(intent.uploadUrl, {
          method: intent.method,
          body: file,
        });

        if (!uploadResponse.ok) throw new Error("Failed to upload file");

        const completeResponse = await fetch("/api/uploads/complete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ fileId: intent.fileId, path }),
        });

        if (!completeResponse.ok) throw new Error("Failed to complete upload");

        setFiles((current) => current.filter((item) => item.name !== file.name));
        return true;
      });

      const results = await Promise.allSettled(uploadPromises);
      const failed = results.some((result) => result.status === "rejected");
      const uploaded = results.some(
        (result) => result.status === "fulfilled" && result.value
      );

      if (failed) {
        results.forEach((result) => {
          if (result.status === "rejected") console.error(result.reason);
        });
        toast({
          description: "Upload failed. Please try again.",
          className: "rounded-lg bg-[#ba1a1a] text-white",
        });
      }

      if (uploaded) router.refresh();
    },
    [path, router, toast]
  );

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  return (
    <div {...getRootProps()} className="relative cursor-pointer">
      <input {...getInputProps()} />
      <Button
        type="button"
        className={cn(
          "h-11 gap-2 rounded-lg bg-[#147e68] px-4 text-sm font-semibold text-white shadow-none transition-all hover:bg-[#147e68]/90 active:scale-[0.98]",
          className
        )}
      >
        <UploadSimple className="size-4" />
        Upload
      </Button>

      {files.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 w-[min(420px,calc(100vw-32px))] rounded-xl border border-[#d0c4bb] bg-white p-4 shadow-[0_16px_40px_rgba(31,27,24,0.16)] dark:border-[#7f756d] dark:bg-[#1d1b1a]">
          <h4 className="mb-3 text-sm font-semibold text-[#1d1b1a] dark:text-[#f5efed]">
            Uploading
          </h4>
          <ul className="space-y-2">
            {files.map((file) => {
              const { type } = getFileType(file.name);

              return (
                <li
                  key={file.name}
                  className="flex items-center justify-between gap-3 rounded-lg bg-[#f8f2f0] p-2 dark:bg-[#32302e]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FileIcon type={type} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#1d1b1a] dark:text-[#f5efed]">
                        {file.name}
                      </p>
                      <p className="text-xs text-[#7f756d] dark:text-[#d0c4bb]">
                        {convertFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setFiles((current) =>
                        current.filter((item) => item.name !== file.name)
                      );
                    }}
                    className="rounded-full p-1 text-[#7f756d] hover:bg-[#ede7e4] dark:hover:bg-[#4d453e]"
                  >
                    <X className="size-4" />
                    <span className="sr-only">Remove {file.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
