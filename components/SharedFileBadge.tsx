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
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#d8f2f0] px-2 py-1 text-[11px] font-semibold leading-none text-[#244d4b] dark:bg-[#123a3d] dark:text-[#8fe8dc]">
      <ShareNetwork className="size-3 shrink-0" />
      <span className="truncate">
        {compact ? "Shared" : `Shared by ${ownerName}`}
      </span>
    </span>
  );
}
