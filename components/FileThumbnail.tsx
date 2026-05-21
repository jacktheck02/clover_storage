"use client";

import { FileIcon } from "@/components/FileIcon";
import { useAudioArtwork } from "@/hooks/useAudioArtwork";
import { cn } from "@/lib/utils";
import { MusicNotesIcon } from "@phosphor-icons/react";
import Image from "next/image";
import { useEffect, useSyncExternalStore } from "react";

interface FileThumbnailProps {
  file: FileDocument;
  className?: string;
  iconClassName?: string;
  imageClassName?: string;
  sizes?: string;
}

const videoThumbnailCache = new Map<string, string | null>();
const videoThumbnailLoads = new Set<string>();
const videoThumbnailListeners = new Set<() => void>();

const emitVideoThumbnailChange = () => {
  videoThumbnailListeners.forEach((listener) => listener());
};

const subscribeToVideoThumbnails = (listener: () => void) => {
  videoThumbnailListeners.add(listener);
  return () => videoThumbnailListeners.delete(listener);
};

const getVideoThumbnailSnapshot = (file: FileDocument) => {
  if (file.type !== "video") return null;
  return videoThumbnailCache.get(file.url) ?? null;
};

export function FileThumbnail({
  file,
  className,
  iconClassName,
  imageClassName,
  sizes = "56px",
}: FileThumbnailProps) {
  const videoThumbnail = useSyncExternalStore(
    subscribeToVideoThumbnails,
    () => getVideoThumbnailSnapshot(file),
    () => null
  );
  const { artworkUrl } = useAudioArtwork(file.url, file.type === "audio");

  useEffect(() => {
    if (
      file.type !== "video" ||
      videoThumbnailCache.has(file.url) ||
      videoThumbnailLoads.has(file.url)
    ) {
      return;
    }

    let cancelled = false;
    let captured = false;
    const video = document.createElement("video");
    videoThumbnailLoads.add(file.url);

    const setCachedThumbnail = (thumbnail: string | null) => {
      videoThumbnailCache.set(file.url, thumbnail);
      videoThumbnailLoads.delete(file.url);
      if (!cancelled) emitVideoThumbnailChange();
    };

    const captureFrame = () => {
      if (captured || !video.videoWidth || !video.videoHeight) return;
      captured = true;

      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d");
        if (!context) {
          setCachedThumbnail(null);
          return;
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        setCachedThumbnail(canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        setCachedThumbnail(null);
      }
    };

    const handleLoadedMetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const targetTime = duration > 0 ? Math.min(0.75, Math.max(0.1, duration * 0.1)) : 0;

      try {
        if (targetTime > 0) video.currentTime = targetTime;
        else captureFrame();
      } catch {
        captureFrame();
      }
    };

    const handleError = () => setCachedThumbnail(null);

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("seeked", captureFrame);
    video.addEventListener("loadeddata", captureFrame);
    video.addEventListener("error", handleError);
    video.src = file.url;
    video.load();

    return () => {
      cancelled = true;
      if (!videoThumbnailCache.has(file.url)) {
        videoThumbnailLoads.delete(file.url);
      }
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("seeked", captureFrame);
      video.removeEventListener("loadeddata", captureFrame);
      video.removeEventListener("error", handleError);
      video.removeAttribute("src");
      video.load();
    };
  }, [file.type, file.url]);

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
          "flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#056e7d]/15 text-[#056e7d] dark:bg-[#056e7d] dark:text-[#5bd7bf]",
          className
        )}
      >
        <div className="flex flex-col items-center gap-1">
          <MusicNotesIcon className={cn("size-5", iconClassName)} />
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

  if (file.type === "video" && videoThumbnail) {
    return (
      <div
        className={cn(
          "relative size-10 shrink-0 overflow-hidden rounded-lg bg-[#f8f2f0] dark:bg-[#32302e]",
          className
        )}
      >
        <Image
          src={videoThumbnail}
          alt={`${file.name} preview frame`}
          fill
          sizes={sizes}
          className={cn("object-cover", imageClassName)}
          unoptimized
        />
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
