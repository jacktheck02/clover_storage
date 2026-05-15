"use client";

import { ShareNetwork } from "@phosphor-icons/react";

export function isSharedWithUser(file: FileDocument, user: Pick<UserDocument, "$id">) {
  return file.owner.$id !== user.$id;
}

export function SharedFileBadge({
  ownerName,
  compact = false,
}: {
  ownerName: string;
  compact?: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex max-w-full shrink-0 items-center gap-1 rounded-full bg-[#d8f2f0] font-semibold leading-none text-[#244d4b] dark:bg-[#123a3d] dark:text-[#8fe8dc]",
        compact ? "h-4 px-1.5 text-[10px]" : "px-2 py-1 text-[11px]",
      ].join(" ")}
    >
      <ShareNetwork className={compact ? "size-2.5 shrink-0" : "size-3 shrink-0"} />
      <span className="truncate">
        {compact ? "Shared" : `Shared by ${ownerName}`}
      </span>
    </span>
  );
}
