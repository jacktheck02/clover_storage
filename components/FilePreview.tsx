"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActionDropdown } from "@/components/ActionDropdown";
import { FileIcon } from "@/components/FileIcon";
import { useAudioArtwork } from "@/hooks/useAudioArtwork";
import { convertFileSize, getFileType } from "@/lib/utils";
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  FileArchiveIcon,
  FileTextIcon,
  PauseIcon,
  PlayIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react";
import Image from "next/image";
import type { Dispatch, RefObject } from "react";
import { useCallback, useEffect, useReducer, useRef } from "react";

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

type FilePreviewState = {
  zipContents: ZipEntry[];
  textContent: string;
  pdfObjectUrl: string;
  displayName: string;
  loading: boolean;
  error: string | null;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
};

const initialFilePreviewState: FilePreviewState = {
  zipContents: [],
  textContent: "",
  pdfObjectUrl: "",
  displayName: "",
  loading: false,
  error: null,
  isPlaying: false,
  duration: 0,
  currentTime: 0,
};

const createPdfObjectUrl = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch PDF");
  return URL.createObjectURL(await response.blob());
};

export function FilePreview({ file, isOpen, onClose }: FilePreviewProps) {
  const [state, updatePreviewState] = useReducer(
    (current: FilePreviewState, patch: Partial<FilePreviewState>) => ({
      ...current,
      ...patch,
    }),
    initialFilePreviewState
  );
  const {
    zipContents,
    textContent,
    pdfObjectUrl,
    displayName,
    loading,
    error,
    isPlaying,
    duration,
    currentTime,
  } = state;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const safeFileName = displayName || file?.name || "";
  const { type, extension } = getFileType(safeFileName);
  const { artworkUrl } = useAudioArtwork(
    file?.url || "",
    Boolean(file) && type === "audio"
  );

  const loadZipContents = useCallback(async () => {
    if (!file) return;
    updatePreviewState({ loading: true, error: null });
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
      updatePreviewState({ zipContents: entries });
    } catch (loadError) {
      console.error(loadError);
      updatePreviewState({ error: "Failed to load zip file contents" });
    } finally {
      updatePreviewState({ loading: false });
    }
  }, [file]);

  const loadTextContent = useCallback(async () => {
    if (!file) return;
    updatePreviewState({ loading: true, error: null });
    try {
      const response = await fetch(file.url);
      if (!response.ok) throw new Error("Failed to fetch file");
      updatePreviewState({ textContent: await response.text() });
    } catch (loadError) {
      console.error(loadError);
      updatePreviewState({ error: "Failed to load file content" });
    } finally {
      updatePreviewState({ loading: false });
    }
  }, [file]);

  useEffect(() => {
    if (!file || !isOpen) {
      updatePreviewState(initialFilePreviewState);
      return;
    }

    if (extension === "zip") loadZipContents();
    if (["txt", "md", "csv"].includes(extension)) loadTextContent();
  }, [extension, file, isOpen, loadTextContent, loadZipContents]);

  useEffect(() => {
    updatePreviewState({ displayName: file?.name || "" });
  }, [file?.$id, file?.name]);

  useEffect(() => {
    if (!file || !isOpen || extension !== "pdf") {
      return;
    }

    let objectUrl = "";
    let cancelled = false;

    const loadPdfPreview = async () => {
      updatePreviewState({ loading: true, error: null });
      try {
        objectUrl = await createPdfObjectUrl(file.url);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        updatePreviewState({ pdfObjectUrl: objectUrl });
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) updatePreviewState({ error: "Failed to load PDF preview" });
      } finally {
        if (!cancelled) updatePreviewState({ loading: false });
      }
    };

    loadPdfPreview();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [extension, file, isOpen]);

  if (!file) return null;

  const previewFile = displayName ? { ...file, name: displayName } : file;

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
      updatePreviewState({ isPlaying: false });
      return;
    }
    await audioRef.current.play();
    updatePreviewState({ isPlaying: true });
  };

  const seekAudioBy = (seconds: number) => {
    if (!audioRef.current) return;
    const nextTime = Math.min(
      Math.max(audioRef.current.currentTime + seconds, 0),
      duration || audioRef.current.duration || 0
    );
    audioRef.current.currentTime = nextTime;
    updatePreviewState({ currentTime: nextTime });
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
        <DialogHeader className="border-b border-[#e7e1df] px-5 py-4 pr-24 text-left dark:border-[#4d453e]">
          <div className="absolute right-12 top-3.5">
            <ActionDropdown
              file={previewFile}
              onActionComplete={(completedAction, nextFileName) => {
                if (completedAction === "delete") onClose();
                if (completedAction === "rename" && nextFileName) {
                  updatePreviewState({ displayName: nextFileName });
                }
              }}
            />
          </div>
          <DialogTitle className="truncate text-lg font-medium text-[#1d1b1a] dark:text-[#f5efed]">
            {previewFile.name}
          </DialogTitle>
        <DialogDescription className="sr-only">
            Previewing {previewFile.name}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-auto">
          <PreviewBody
            file={file}
            previewFile={previewFile}
            type={type}
            extension={extension}
            artworkUrl={artworkUrl}
            audioRef={audioRef}
            loading={loading}
            error={error}
            pdfObjectUrl={pdfObjectUrl}
            textContent={textContent}
            zipContents={zipContents}
            isPlaying={isPlaying}
            duration={duration}
            currentTime={currentTime}
            formatTime={formatTime}
            toggleAudioPlayback={toggleAudioPlayback}
            seekAudioBy={seekAudioBy}
            updatePreviewState={updatePreviewState}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewLoading({ label }: { label: string }) {
  return (
    <div className="flex h-[360px] items-center justify-center gap-2 text-sm text-[#7f756d] dark:text-[#d0c4bb]">
      <SpinnerGapIcon className="size-4 animate-spin" />
      {label}
    </div>
  );
}

function PreviewBody({
  file,
  previewFile,
  type,
  extension,
  artworkUrl,
  audioRef,
  loading,
  error,
  pdfObjectUrl,
  textContent,
  zipContents,
  isPlaying,
  duration,
  currentTime,
  formatTime,
  toggleAudioPlayback,
  seekAudioBy,
  updatePreviewState,
}: {
  file: FileDocument;
  previewFile: FileDocument;
  type: FileType;
  extension: string;
  artworkUrl: string | null;
  audioRef: RefObject<HTMLAudioElement | null>;
  loading: boolean;
  error: string | null;
  pdfObjectUrl: string;
  textContent: string;
  zipContents: ZipEntry[];
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  formatTime: (seconds: number) => string;
  toggleAudioPlayback: () => Promise<void>;
  seekAudioBy: (seconds: number) => void;
  updatePreviewState: Dispatch<Partial<FilePreviewState>>;
}) {
  if (type === "image") {
    return (
      <div className="flex min-h-[420px] items-center justify-center bg-[#f8f2f0] p-4 dark:bg-[#32302e]">
        <Image
          src={file.url}
          alt={previewFile.name}
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
      <div className="flex min-h-[420px] items-center justify-center bg-[#10100f] p-4">
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
            onLoadedMetadata={(event) =>
              updatePreviewState({ duration: event.currentTarget.duration || 0 })
            }
            onTimeUpdate={(event) =>
              updatePreviewState({ currentTime: event.currentTarget.currentTime })
            }
            onPause={() => updatePreviewState({ isPlaying: false })}
            onPlay={() => updatePreviewState({ isPlaying: true })}
            onEnded={() => {
              updatePreviewState({ isPlaying: false, currentTime: 0 });
            }}
          />
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {artworkUrl ? (
                <Image
                  src={artworkUrl}
                  alt={`${previewFile.name} cover art`}
                  width={48}
                  height={48}
                  className="size-12 rounded-lg object-cover"
                  unoptimized
                />
              ) : (
                <FileIcon type="audio" className="size-12 rounded-lg" />
              )}
              <p className="truncate text-sm font-semibold">{previewFile.name}</p>
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
              updatePreviewState({ currentTime: nextTime });
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
              <ArrowCounterClockwiseIcon className="size-7" />
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
              {isPlaying ? <PauseIcon className="size-5" /> : <PlayIcon className="size-5" />}
            </button>
            <button
              type="button"
              onClick={() => seekAudioBy(10)}
              className="relative flex size-10 items-center justify-center rounded-full border border-[#d0c4bb] text-[#4d453e] transition-colors hover:bg-[#f8f2f0] dark:border-[#7f756d] dark:text-[#d0c4bb] dark:hover:bg-[#32302e]"
              aria-label="Skip ahead 10 seconds"
            >
              <ArrowClockwiseIcon className="size-7" />
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
    if (error) return <PreviewError message={error} />;
    if (loading || !pdfObjectUrl) return <PreviewLoading label="Loading PDF..." />;

    return (
      <div className="h-[70vh] bg-[#f8f2f0] dark:bg-[#32302e]">
        <iframe
          src={pdfObjectUrl}
          className="h-full w-full border-0"
          title={previewFile.name}
        />
      </div>
    );
  }

  if (["txt", "md", "csv"].includes(extension)) {
    if (loading) return <PreviewLoading label="Loading content..." />;
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
    if (loading) return <PreviewLoading label="Loading zip contents..." />;
    if (error) return <PreviewError message={error} />;

    return (
      <div className="max-h-[70vh] overflow-auto bg-[#f8f2f0] p-4 dark:bg-[#32302e]">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <FileArchiveIcon className="size-4" />
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
                <FileTextIcon className="size-4 shrink-0 text-[#7f756d] dark:text-[#d0c4bb]" />
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
        File preview is not available.
      </p>
    </div>
  );
}

function PreviewError({ message }: { message: string }) {
  return (
    <div className="flex h-[360px] items-center justify-center text-sm text-[#ba1a1a]">
      {message}
    </div>
  );
}
