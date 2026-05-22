"use client";

import { cn, getFileType } from "@/lib/utils";
import { FileTextIcon } from "@phosphor-icons/react";
import { fileTypeMeta } from "@/components/storage-utils";

interface FileIconProps {
  type?: FileType | string;
  name?: string;
  className?: string;
  iconClassName?: string;
}

export function FileIcon({
  type,
  name,
  className,
  iconClassName,
}: FileIconProps) {
  const inferredType = (type || getFileType(name || "").type) as FileType;
  const meta = fileTypeMeta[inferredType] || fileTypeMeta.other;
  const Icon = meta.icon || FileTextIcon;

  return (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg",
        meta.tone,
        className
      )}
    >
      <Icon className={cn("size-5", iconClassName)} />
    </div>
  );
}
