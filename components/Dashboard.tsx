import { FileIcon } from "@/components/FileIcon";
import { RecentFilesList } from "@/components/RecentFilesList";
import { STORAGE_LIMIT_BYTES, fileTypeMeta } from "@/components/storage-utils";
import { convertFileSize, formatDateTime } from "@/lib/utils";
import Link from "next/link";

type UsageBucket = {
  size: number;
  latestDate: string;
};

interface DashboardProps {
  files: FileDocument[];
  totalSpace: {
    document: UsageBucket;
    image: UsageBucket;
    video: UsageBucket;
    audio: UsageBucket;
    other: UsageBucket;
    used: number;
    all: number;
  };
}

export function Dashboard({ files, totalSpace }: DashboardProps) {
  const usedPercentage = Math.min(
    Math.round((totalSpace.used / STORAGE_LIMIT_BYTES) * 100),
    100
  );
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (usedPercentage / 100) * circumference;

  const categories = [
    {
      key: "document" as FileType,
      title: "Documents",
      size: totalSpace.document.size,
      latestDate: totalSpace.document.latestDate,
      href: "/documents",
    },
    {
      key: "image" as FileType,
      title: "Images",
      size: totalSpace.image.size,
      latestDate: totalSpace.image.latestDate,
      href: "/images",
    },
    {
      key: "video" as FileType,
      title: "Media",
      size: totalSpace.video.size + totalSpace.audio.size,
      latestDate:
        totalSpace.video.latestDate > totalSpace.audio.latestDate
          ? totalSpace.video.latestDate
          : totalSpace.audio.latestDate,
      href: "/media",
    },
    {
      key: "other" as FileType,
      title: "Others",
      size: totalSpace.other.size,
      latestDate: totalSpace.other.latestDate,
      href: "/others",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#e7e1df] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.03)] dark:border-[#7f756d] dark:bg-[#1d1b1a] md:flex md:items-center md:gap-10 md:p-6">
        <div className="relative mx-auto size-48 shrink-0 md:mx-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-[#f8f2f0] dark:text-[#4d453e]"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="#147e68"
              strokeLinecap="round"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-semibold tracking-[-0.02em] text-[#6b5c4c] dark:text-[#f4dfcb]">
              {convertFileSize(totalSpace.used)}
            </span>
            <span className="mt-1 text-xs text-[#4d453e] dark:text-[#d0c4bb]">
              of {convertFileSize(STORAGE_LIMIT_BYTES)} used
            </span>
          </div>
        </div>

        <div className="mt-6 min-w-0 flex-1 text-center md:mt-0 md:text-left">
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[#1d1b1a] dark:text-[#f5efed]">
            Storage Overview
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4d453e] dark:text-[#d0c4bb]">
            Your files are organized by type with recent uploads kept close at
            hand.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {categories.map((category) => {
          const meta = fileTypeMeta[category.key];
          return (
            <Link
              key={category.title}
              href={category.href}
              className="rounded-xl border border-[#e7e1df] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.03)] transition-transform hover:scale-[0.98] dark:border-[#7f756d] dark:bg-[#1d1b1a]"
            >
              <div className="mb-5 flex items-start justify-between">
                <FileIcon type={category.key} />
                <span className="text-xs text-[#7f756d] dark:text-[#d0c4bb]">
                  {meta.label}
                </span>
              </div>
              <h2 className="text-xl font-medium text-[#1d1b1a] dark:text-[#f5efed]">
                {category.title}
              </h2>
              <p className="mt-1 text-2xl font-semibold text-[#6b5c4c] dark:text-[#f4dfcb]">
                {convertFileSize(category.size || 0)}
              </p>
              <p className="mt-4 text-xs text-[#7f756d] dark:text-[#d0c4bb]">
                Latest updated: {formatDateTime(category.latestDate)}
              </p>
            </Link>
          );
        })}
      </section>

      <section className="rounded-xl border border-[#e7e1df] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.03)] dark:border-[#7f756d] dark:bg-[#1d1b1a]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-medium tracking-[-0.01em] text-[#1d1b1a] dark:text-[#f5efed]">
            Recent Files
          </h2>
          <Link
            href="/all"
            className="text-xs font-bold uppercase tracking-[0.05em] text-[#147e68] hover:underline dark:text-[#5bd7bf]"
          >
            View all
          </Link>
        </div>
        <RecentFilesList files={files} />
      </section>
    </div>
  );
}
