"use client";

import { FileIcon } from "@/components/FileIcon";
import { useAudioArtwork } from "@/hooks/useAudioArtwork";
import { cn } from "@/lib/utils";
import { MusicNotes } from "@phosphor-icons/react";
import Image from "next/image";

interface FileThumbnailProps {
  file: FileDocument;
  className?: string;
  iconClassName?: string;
  imageClassName?: string;
  sizes?: string;
}

export function FileThumbnail({
  file,
  className,
  iconClassName,
  imageClassName,
  sizes = "56px",
}: FileThumbnailProps) {
  const { artworkUrl } = useAudioArtwork(file.url, file.type === "audio");

  if (file.type === "image") {
    return (
      <div
        className={cn(
          "relative size-10 shrink-0 overflow-hidden rounded-lg bg-[#f8f2f0] dark:bg-[#32302e]",
          className
        )}
      >
        <Image
          src={file.url}
          alt={file.name}
          fill
          sizes={sizes}
          className={cn("object-cover", imageClassName)}
          unoptimized
        />
      </div>
    );
  }

  if (file.type === "audio") {
    if (artworkUrl) {
      return (
        <div
          className={cn(
            "relative size-10 shrink-0 overflow-hidden rounded-lg bg-[#f8f2f0] dark:bg-[#32302e]",
            className
          )}
        >
          <Image
            src={artworkUrl}
            alt={`${file.name} cover art`}
            fill
            sizes={sizes}
            className={cn("object-cover", imageClassName)}
            unoptimized
          />
        </div>
      );
    }

    return (
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#147e68]/15 text-[#147e68] dark:bg-[#147e68] dark:text-[#5bd7bf]",
          className
        )}
      >
        <div className="flex flex-col items-center gap-1">
          <MusicNotes className={cn("size-5", iconClassName)} />
          <span className="flex h-2 items-end gap-0.5" aria-hidden="true">
            <span className="h-1 w-0.5 rounded-full bg-current opacity-60" />
            <span className="h-2 w-0.5 rounded-full bg-current opacity-80" />
            <span className="h-1.5 w-0.5 rounded-full bg-current opacity-70" />
            <span className="h-1 w-0.5 rounded-full bg-current opacity-60" />
          </span>
        </div>
      </div>
    );
  }

  return (
    <FileIcon
      type={file.type}
      className={className}
      iconClassName={iconClassName}
    />
  );
}
