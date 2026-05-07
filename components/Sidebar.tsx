"use client";

import { navItems } from "@/components/storage-utils";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { SignOut } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { signOutUser } from "@/lib/actions/user.actions";

interface SidebarProps {
  user: UserDocument;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    navItems.forEach(({ url }) => router.prefetch(url));
  }, [router]);

  return (
    <aside className="hidden h-full w-[264px] shrink-0 overflow-hidden border-r border-[#d0c4bb] bg-[#f8f2f0] px-4 py-5 text-[#1d1b1a] dark:border-[#7f756d] dark:bg-[#32302e] dark:text-[#f5efed] lg:flex lg:flex-col">
      <Link href="/" className="mb-8 flex items-center gap-3 px-2">
        <Logo size={40} className="size-10 shrink-0" />
        <span className="text-[28px] font-semibold tracking-[-0.02em] text-[#6b5c4c] dark:text-[#d7c3b0]">
          Clover
        </span>
      </Link>

      <nav className="min-h-0 flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map(({ name, url, icon: Icon }) => {
            const active =
              pathname === url || (url !== "/" && pathname.startsWith(url));

            return (
              <li key={name}>
                <Link
                  href={url}
                  className={cn(
                    "flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium text-[#4d453e] transition-colors hover:bg-[#ede7e4] dark:text-[#e7e1df] dark:hover:bg-[#4d453e]",
                    active &&
                      "bg-[#d9c5b2] text-[#241a0e] shadow-sm dark:bg-[#524436] dark:text-[#f4dfcb]"
                  )}
                >
                  <Icon className="size-5" />
                  <span>{name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-[#d0c4bb] pt-4 dark:border-[#7f756d]">
        <div className="flex items-center gap-3">
          <Image
            src={user.avatar}
            alt={`${user.fullName} avatar`}
            width={40}
            height={40}
            className="size-10 rounded-full object-cover"
            unoptimized
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold capitalize text-[#1d1b1a] dark:text-[#f5efed]">
              {user.fullName}
            </p>
            <p className="truncate text-xs text-[#4d453e] dark:text-[#d0c4bb]">
              {user.email}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signOutUser()}
          className="mt-4 flex h-10 w-full items-center justify-start gap-2 rounded-lg px-1 text-sm font-medium text-[#6b5c4c] transition-colors hover:bg-[#f3edea] dark:text-[#d7c3b0] dark:hover:bg-[#4d453e]"
        >
          <SignOut className="size-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
