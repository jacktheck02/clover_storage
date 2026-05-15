"use client";

import ThemeToggle from "@/components/ThemeToggle";
import { FileUploader } from "@/components/FileUploader";
import { Search } from "@/components/Search";

interface TopBarProps {
  user: UserDocument;
}

export function TopBar({ user }: TopBarProps) {
  return (
    <header className="relative z-[70] hidden items-center justify-between gap-5 border-b border-[#d0c4bb] bg-[#fef8f5]/95 px-6 py-4 backdrop-blur dark:border-[#7f756d] dark:bg-[#32302e]/95 lg:flex">
      <Search currentUser={user} />

      <div className="flex min-w-fit items-center gap-3">
        <FileUploader />
        <ThemeToggle />
      </div>
    </header>
  );
}
