"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getFileType } from "@/lib/utils";
import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { useAudioArtwork } from "@/hooks/useAudioArtwork";

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

const FilePreview: React.FC<FilePreviewProps> = ({ file, isOpen, onClose }) => {
  const [zipContents, setZipContents] = useState<ZipEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const loadZipContents = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // Dynamically import JSZip only when needed
      const JSZip = (await import("jszip")).default;

      const response = await fetch(file.url);
      if (!response.ok) throw new Error("Failed to fetch zip file");

      const arrayBuffer = await response.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      const entries: ZipEntry[] = [];

      zip.forEach((relativePath, file) => {
        const zipFile = file as typeof file & {
          _data?: { uncompressedSize?: number };
        };
        entries.push({
          name: relativePath,
          size: zipFile._data?.uncompressedSize || 0,
          isDirectory: file.dir || false,
        });
      });

      // Sort: directories first, then by name
      entries.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      setZipContents(entries);
    } catch (err) {
      console.error("Error loading zip contents:", err);
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

      const text = await response.text();
      setTextContent(text);
    } catch (err) {
      console.error("Error loading text content:", err);
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

    const fileType = getFileType(file.name);
    const { extension } = fileType;

    // Handle zip files
    if (extension === "zip") {
      loadZipContents();
    }
    // Handle text files
    else if (["txt", "md", "csv"].includes(extension)) {
      loadTextContent();
    }
  }, [file, isOpen, loadZipContents, loadTextContent]);

  const safeFileName = file?.name || "";
  const fileType = getFileType(safeFileName);
  const { type, extension } = fileType;
  const { artworkUrl } = useAudioArtwork(file?.url || "", Boolean(file) && type === "audio");

  if (!file) return null;

  const toggleAudioPlayback = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (playError) {
      console.error("Failed to play audio:", playError);
    }
  };

  const handleSeek = (nextTime: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const seekBy = (delta: number) => {
    if (!audioRef.current) return;
    const nextTime = Math.min(
      Math.max(audioRef.current.currentTime + delta, 0),
      duration || 0
    );
    handleSeek(nextTime);
  };

  const renderPreview = () => {
    // Image preview (including SVG)
    if (type === "image") {
      return (
        <div className="flex items-center justify-center w-full h-full min-h-[400px] bg-neutral-50 dark:bg-neutral-900 p-4">
          {extension === "svg" ? (
            <Image
              src={file.url}
              alt={file.name}
              width={1200}
              height={800}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
              unoptimized
            />
          ) : (
            <Image
              src={file.url}
              alt={file.name}
              width={1200}
              height={800}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
              unoptimized
            />
          )}
        </div>
      );
    }

    // Video preview
    if (type === "video") {
      return (
        <div className="flex items-center justify-center w-full h-full min-h-[400px] bg-black p-4">
          <video
            src={file.url}
            controls
            className="max-w-full max-h-[70vh] rounded-lg"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // Audio preview
    if (type === "audio") {
      return (
        <div className="flex items-center justify-center w-full h-full min-h-[260px] bg-neutral-50 dark:bg-neutral-900 p-6">
          <div className="w-full max-w-2xl rounded-2xl border border-light-200/50 dark:border-light-200/10 bg-white dark:bg-dark-100 p-5 shadow-sm">
            <audio
              ref={audioRef}
              src={file.url}
              preload="metadata"
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                setIsPlaying(false);
                setCurrentTime(0);
              }}
            >
              Your browser does not support the audio element.
            </audio>

            <div className="mb-4 flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-3">
                {artworkUrl ? (
                  <Image
                    src={artworkUrl}
                    alt={`${file.name} cover art`}
                    width={44}
                    height={44}
                    unoptimized
                    className="size-11 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex size-11 items-center justify-center rounded-md bg-brand/10 dark:bg-[#8b7355]/20">
                    <Image
                      src="/assets/icons/file-audio.svg"
                      alt="audio"
                      width={20}
                      height={20}
                    />
                  </div>
                )}
                <p className="subtitle-2 line-clamp-1 text-light-100 dark:text-light-200">
                  {file.name}
                </p>
              </div>
              <p className="caption shrink-0 text-light-200 dark:text-light-200">
                {formatTime(currentTime)} / {formatTime(duration)}
              </p>
            </div>

            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="w-full accent-brand dark:accent-[#8b7355]"
              aria-label="Audio progress"
            />

            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => seekBy(-10)}
                className="rounded-full border border-light-200/70 dark:border-light-200/20 px-3 py-1 text-sm text-light-100 dark:text-light-300 hover:bg-light-100/30 dark:hover:bg-light-200/10 transition-colors"
              >
                -10s
              </button>
              <button
                type="button"
                onClick={toggleAudioPlayback}
                className="flex items-center justify-center rounded-full bg-brand dark:bg-[#8b7355] p-2 text-white transition-colors hover:opacity-90"
                aria-label={isPlaying ? "Pause audio" : "Play audio"}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button
                type="button"
                onClick={() => seekBy(10)}
                className="rounded-full border border-light-200/70 dark:border-light-200/20 px-3 py-1 text-sm text-light-100 dark:text-light-300 hover:bg-light-100/30 dark:hover:bg-light-200/10 transition-colors"
              >
                +10s
              </button>
            </div>
          </div>
        </div>
      );
    }

    // PDF preview
    if (extension === "pdf") {
      return (
        <div className="w-full h-[70vh] bg-neutral-50 dark:bg-neutral-900">
          <iframe
            src={file.url}
            className="w-full h-full border-0 rounded-lg"
            title={file.name}
          />
        </div>
      );
    }

    // Text files preview
    if (["txt", "md", "csv"].includes(extension)) {
      if (loading) {
        return (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-neutral-500">Loading content...</p>
          </div>
        );
      }

      if (error) {
        return (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-red-500">{error}</p>
          </div>
        );
      }

      return (
        <div className="w-full h-[70vh] bg-neutral-50 dark:bg-neutral-900 p-4 overflow-auto rounded-lg">
          <pre className="whitespace-pre-wrap font-mono text-sm text-neutral-900 dark:text-neutral-100">
            {textContent}
          </pre>
        </div>
      );
    }

    // Zip file preview
    if (extension === "zip") {
      if (loading) {
        return (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-neutral-500">Loading zip contents...</p>
          </div>
        );
      }

      if (error) {
        return (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-red-500">{error}</p>
          </div>
        );
      }

      return (
        <div className="w-full max-h-[70vh] overflow-auto bg-neutral-50 dark:bg-neutral-900 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
            Zip Contents ({zipContents.length} items)
          </h3>
          {zipContents.length === 0 ? (
            <p className="text-neutral-500">No contents found</p>
          ) : (
            <ul className="space-y-1">
              {zipContents.map((entry, index) => (
                <li
                  key={index}
                  className={`flex items-center gap-2 p-2 rounded ${
                    entry.isDirectory
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  <span className="text-sm">
                    {entry.isDirectory ? "📁" : "📄"}
                  </span>
                  <span className="flex-1 text-sm font-mono">{entry.name}</span>
                  {!entry.isDirectory && (
                    <span className="text-xs text-neutral-500">
                      {(entry.size / 1024).toFixed(2)} KB
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    // Unsupported file types
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <p className="text-neutral-500 text-center">
          Preview not available for this file type
        </p>
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Open in new tab
        </a>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{file.name}</DialogTitle>
          <DialogDescription className="sr-only">
            Previewing {file.name}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto">{renderPreview()}</div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreview;
