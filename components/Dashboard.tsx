import { FileIcon } from "@/components/FileIcon";
import { RecentFilesList } from "@/components/RecentFilesList";
import { StorageUsageRing } from "@/components/StorageUsageRing";
import { STORAGE_LIMIT_BYTES } from "@/components/storage-utils";
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
      <section className="py-2">
        <div className="grid gap-6 xl:grid-cols-[280px_1fr] xl:items-center">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left xl:flex-col xl:text-center">
            <div className="relative size-44 shrink-0">
              <StorageUsageRing percentage={usedPercentage} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-semibold tracking-[-0.02em] text-[#6b5c4c] dark:text-[#f4dfcb]">
                  {convertFileSize(totalSpace.used)}
                </span>
                <span className="mt-1 text-xs text-[#4d453e] dark:text-[#d0c4bb]">
                  of {convertFileSize(STORAGE_LIMIT_BYTES)}
                </span>
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[#1d1b1a] dark:text-[#f5efed]">
                Storage Overview
              </h1>
              <p className="mt-2 text-sm text-[#4d453e] dark:text-[#d0c4bb]">
                {usedPercentage}% of storage used
              </p>
            </div>
          </div>

          <div className="grid gap-x-6 gap-y-1 md:grid-cols-2">
            {categories.map((category) => {
              const categoryPercentage =
                category.size > 0
                  ? Math.max(
                      Math.min((category.size / STORAGE_LIMIT_BYTES) * 100, 100),
                      2
                    )
                  : 0;

              return (
                <Link
                  key={category.title}
                  href={category.href}
                  className="group -mx-2 rounded-lg px-2 py-3 transition-colors hover:bg-[#f8f2f0] dark:hover:bg-[#1d1b1a]"
                >
                  <div className="flex items-center gap-3">
                    <FileIcon type={category.key} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-semibold text-[#1d1b1a] dark:text-[#f5efed]">
                            {category.title}
                          </h2>
                          <p className="mt-0.5 text-xs text-[#7f756d] dark:text-[#d0c4bb]">
                            Latest updated: {formatDateTime(category.latestDate)}
                          </p>
                        </div>
                        <p className="shrink-0 text-right text-lg font-semibold text-[#6b5c4c] dark:text-[#f4dfcb]">
                          {convertFileSize(category.size || 0)}
                        </p>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#ede7e4] dark:bg-[#4d453e]">
                        <div
                          className="h-full rounded-full bg-[#056e7d] transition-all duration-300 group-hover:bg-[#045b67]"
                          style={{ width: `${categoryPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-[#d0c4bb] pt-5 dark:border-[#7f756d]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-medium tracking-[-0.01em] text-[#1d1b1a] dark:text-[#f5efed]">
            Recent Files
          </h2>
          <Link
            href="/all"
            className="text-xs font-bold uppercase tracking-[0.05em] text-[#056e7d] hover:underline dark:text-[#5bd7bf]"
          >
            View all
          </Link>
        </div>
        <RecentFilesList files={files} />
      </section>
    </div>
  );
}
