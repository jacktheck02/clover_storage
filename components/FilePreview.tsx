"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileIcon } from "@/components/FileIcon";
import { useAudioArtwork } from "@/hooks/useAudioArtwork";
import { convertFileSize, getFileType } from "@/lib/utils";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  FileArchive,
  FileText,
  Pause,
  Play,
  SpinnerGap,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

interface FilePreviewProps {
  file: FileDocument | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ZipEntry {
  name: string;
  size: number;
  isDirectory: boolean;
}

export function FilePreview({ file, isOpen, onClose }: FilePreviewProps) {
  const [zipContents, setZipContents] = useState<ZipEntry[]>([]);
  const [textContent, setTextContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const safeFileName = file?.name || "";
  const { type, extension } = getFileType(safeFileName);
  const { artworkUrl } = useAudioArtwork(
    file?.url || "",
    Boolean(file) && type === "audio"
  );

  const loadZipContents = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const JSZip = (await import("jszip")).default;
      const response = await fetch(file.url);
      if (!response.ok) throw new Error("Failed to fetch zip file");
      const zip = await JSZip.loadAsync(await response.arrayBuffer());
      const entries: ZipEntry[] = [];
      zip.forEach((relativePath, zipFile) => {
        const entry = zipFile as typeof zipFile & {
          _data?: { uncompressedSize?: number };
        };
        entries.push({
          name: relativePath,
          size: entry._data?.uncompressedSize || 0,
          isDirectory: zipFile.dir || false,
        });
      });
      entries.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      setZipContents(entries);
    } catch (loadError) {
      console.error(loadError);
      setError("Failed to load zip file contents");
    } finally {
      setLoading(false);
    }
  }, [file]);

  const loadTextContent = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(file.url);
      if (!response.ok) throw new Error("Failed to fetch file");
      setTextContent(await response.text());
    } catch (loadError) {
      console.error(loadError);
      setError("Failed to load file content");
    } finally {
      setLoading(false);
    }
  }, [file]);

  useEffect(() => {
    if (!file || !isOpen) {
      setZipContents([]);
      setTextContent("");
      setError(null);
      setIsPlaying(false);
      setDuration(0);
      setCurrentTime(0);
      return;
    }

    if (extension === "zip") loadZipContents();
    if (["txt", "md", "csv"].includes(extension)) loadTextContent();
  }, [extension, file, isOpen, loadTextContent, loadZipContents]);

  if (!file) return null;

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleAudioPlayback = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    await audioRef.current.play();
    setIsPlaying(true);
  };

  const seekAudioBy = (seconds: number) => {
    if (!audioRef.current) return;
    const nextTime = Math.min(
      Math.max(audioRef.current.currentTime + seconds, 0),
      duration || audioRef.current.duration || 0
    );
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const renderLoading = (label: string) => (
    <div className="flex h-[360px] items-center justify-center gap-2 text-sm text-[#7f756d] dark:text-[#d0c4bb]">
      <SpinnerGap className="size-4 animate-spin" />
      {label}
    </div>
  );

  const renderPreview = () => {
    if (type === "image") {
      return (
        <div className="flex min-h-[420px] items-center justify-center bg-[#f8f2f0] p-4 dark:bg-[#32302e]">
          <Image
            src={file.url}
            alt={file.name}
            width={1200}
            height={800}
            className="max-h-[70vh] max-w-full rounded-lg object-contain"
            unoptimized
          />
        </div>
      );
    }

    if (type === "video") {
      return (
        <div className="flex min-h-[420px] items-center justify-center bg-black p-4">
          <video src={file.url} controls className="max-h-[70vh] max-w-full rounded-lg">
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    if (type === "audio") {
      return (
        <div className="flex items-center justify-center bg-[#f8f2f0] p-4 dark:bg-[#32302e] sm:p-5">
          <div className="w-full rounded-xl border border-[#d0c4bb] bg-white p-4 dark:border-[#7f756d] dark:bg-[#1d1b1a] sm:p-5">
            <audio
              ref={audioRef}
              src={file.url}
              preload="metadata"
              onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onEnded={() => {
                setIsPlaying(false);
                setCurrentTime(0);
              }}
            />
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {artworkUrl ? (
                  <Image
                    src={artworkUrl}
                    alt={`${file.name} cover art`}
                    width={48}
                    height={48}
                    className="size-12 rounded-lg object-cover"
                    unoptimized
                  />
                ) : (
                  <FileIcon type="audio" className="size-12 rounded-lg" />
                )}
                <p className="truncate text-sm font-semibold">{file.name}</p>
              </div>
              <p className="shrink-0 text-xs text-[#7f756d] dark:text-[#d0c4bb]">
                {formatTime(currentTime)} / {formatTime(duration)}
              </p>
            </div>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => {
                if (!audioRef.current) return;
                const nextTime = Number(event.target.value);
                audioRef.current.currentTime = nextTime;
                setCurrentTime(nextTime);
              }}
              className="w-full accent-[#056e7d]"
              aria-label="Audio progress"
            />
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => seekAudioBy(-10)}
                className="relative flex size-10 items-center justify-center rounded-full border border-[#d0c4bb] text-[#4d453e] transition-colors hover:bg-[#f8f2f0] dark:border-[#7f756d] dark:text-[#d0c4bb] dark:hover:bg-[#32302e]"
                aria-label="Go back 10 seconds"
              >
                <ArrowCounterClockwise className="size-7" />
                <span className="absolute text-[10px] font-bold leading-none">
                  10
                </span>
              </button>
              <button
                type="button"
                onClick={toggleAudioPlayback}
                className="flex size-11 items-center justify-center rounded-full bg-[#056e7d] text-white"
                aria-label={isPlaying ? "Pause audio" : "Play audio"}
              >
                {isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
              </button>
              <button
                type="button"
                onClick={() => seekAudioBy(10)}
                className="relative flex size-10 items-center justify-center rounded-full border border-[#d0c4bb] text-[#4d453e] transition-colors hover:bg-[#f8f2f0] dark:border-[#7f756d] dark:text-[#d0c4bb] dark:hover:bg-[#32302e]"
                aria-label="Skip ahead 10 seconds"
              >
                <ArrowClockwise className="size-7" />
                <span className="absolute text-[10px] font-bold leading-none">
                  10
                </span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (extension === "pdf") {
      return (
        <div className="h-[70vh] bg-[#f8f2f0] dark:bg-[#32302e]">
          <iframe src={file.url} className="h-full w-full border-0" title={file.name} />
        </div>
      );
    }

    if (["txt", "md", "csv"].includes(extension)) {
      if (loading) return renderLoading("Loading content...");
      if (error) return <PreviewError message={error} />;

      return (
        <div className="max-h-[70vh] overflow-auto bg-[#f8f2f0] p-4 dark:bg-[#32302e]">
          <pre className="whitespace-pre-wrap font-mono text-sm text-[#1d1b1a] dark:text-[#f5efed]">
            {textContent}
          </pre>
        </div>
      );
    }

    if (extension === "zip") {
      if (loading) return renderLoading("Loading zip contents...");
      if (error) return <PreviewError message={error} />;

      return (
        <div className="max-h-[70vh] overflow-auto bg-[#f8f2f0] p-4 dark:bg-[#32302e]">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <FileArchive className="size-4" />
            Zip Contents ({zipContents.length} items)
          </div>
          {zipContents.length === 0 ? (
            <p className="text-sm text-[#7f756d] dark:text-[#d0c4bb]">
              No contents found
            </p>
          ) : (
            <ul className="space-y-1">
              {zipContents.map((entry) => (
                <li
                  key={entry.name}
                  className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm dark:bg-[#1d1b1a]"
                >
                  <FileText className="size-4 shrink-0 text-[#7f756d] dark:text-[#d0c4bb]" />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">
                    {entry.name}
                  </span>
                  {!entry.isDirectory && (
                    <span className="shrink-0 text-xs text-[#7f756d] dark:text-[#d0c4bb]">
                      {convertFileSize(entry.size)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    return (
      <div className="flex h-[360px] flex-col items-center justify-center gap-4 bg-[#f8f2f0] p-6 text-center dark:bg-[#32302e]">
        <FileIcon type={file.type} className="size-14 rounded-xl" />
        <p className="text-sm text-[#7f756d] dark:text-[#d0c4bb]">
          Preview is not available for this file type.
        </p>
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-[#056e7d] px-4 py-2 text-sm font-semibold text-white"
        >
          Open in new tab
        </a>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`flex max-h-[90vh] max-w-none flex-col overflow-hidden rounded-xl border-[#d0c4bb] bg-white p-0 dark:border-[#7f756d] dark:bg-[#1d1b1a] ${
          type === "audio"
            ? "w-[min(520px,calc(100vw-32px))]"
            : "w-[min(960px,calc(100vw-32px))]"
        }`}
      >
        <DialogHeader className="border-b border-[#e7e1df] px-5 py-4 text-left dark:border-[#4d453e]">
          <DialogTitle className="truncate pr-8 text-lg font-medium text-[#1d1b1a] dark:text-[#f5efed]">
            {file.name}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Previewing {file.name}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-auto">{renderPreview()}</div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewError({ message }: { message: string }) {
  return (
    <div className="flex h-[360px] items-center justify-center text-sm text-[#ba1a1a]">
      {message}
    </div>
  );
}
