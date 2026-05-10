"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FileUploader } from "@/components/FileUploader";
import { Logo } from "@/components/Logo";
import { navItems } from "@/components/storage-utils";
import { signOutUser } from "@/lib/actions/user.actions";
import { cn } from "@/lib/utils";
import { List, SignOut, UserCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface MobileNavProps {
  user: UserDocument;
}

export function MobileNav({ user }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="flex h-16 items-center justify-between border-b border-[#d0c4bb] bg-[#fef8f5] px-4 dark:border-[#7f756d] dark:bg-[#32302e] lg:hidden">
      <Link href="/" className="flex items-center gap-2">
        <Logo size={36} className="size-9 shrink-0" />
        <span className="text-xl font-semibold text-[#6b5c4c] dark:text-[#d7c3b0]">
          Clover
        </span>
      </Link>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-lg text-[#4d453e] dark:text-[#e7e1df]"
          >
            <List className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent className="flex h-screen flex-col border-[#d0c4bb] bg-[#fef8f5] px-4 py-5 dark:border-[#7f756d] dark:bg-[#32302e]">
          <SheetTitle className="sr-only">Clover navigation</SheetTitle>
          <div className="flex items-center gap-3 rounded-xl bg-[#f8f2f0] p-3 dark:bg-[#1d1b1a]">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#d0c4bb] bg-[#fffaf7] text-[#6b5c4c] dark:border-[#7f756d] dark:bg-[#32302e] dark:text-[#d7c3b0]">
              <UserCircle className="size-6" weight="duotone" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold capitalize text-[#1d1b1a] dark:text-[#f5efed]">
                {user.fullName}
              </p>
              <p className="truncate text-xs text-[#4d453e] dark:text-[#d0c4bb]">
                {user.email}
              </p>
            </div>
          </div>

          <nav className="mt-6 flex-1">
            <ul className="space-y-1">
              {navItems.map(({ name, url, icon: Icon }) => {
                const active =
                  pathname === url ||
                  (url !== "/" && pathname.startsWith(url));

                return (
                  <li key={name}>
                    <Link
                      href={url}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium text-[#4d453e] dark:text-[#e7e1df]",
                        active &&
                          "bg-[#d9c5b2] text-[#241a0e] dark:bg-[#524436] dark:text-[#f4dfcb]"
                      )}
                    >
                      <Icon className="size-5" />
                      {name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="space-y-3 border-t border-[#d0c4bb] pt-4 dark:border-[#7f756d]">
            <FileUploader className="w-full justify-center" />
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full justify-center rounded-lg text-[#6b5c4c] dark:text-[#d7c3b0]"
              onClick={() => signOutUser()}
            >
              <SignOut className="mr-2 size-4" />
              Sign out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
