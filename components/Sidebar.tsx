"use client";

import { navItems } from "@/constants";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect } from "react";

interface Props {
  fullName: string;
  avatar: string;
  email: string;
}

const Sidebar = ({ fullName, avatar, email }: Props) => {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    navItems.forEach(({ url }) => {
      router.prefetch(url);
    });
  }, [router]);

  return (
    <aside className="sidebar">
      <Link href="/">
        <Image
          src="/assets/icons/logo-full-clover.svg"
          alt="Logo"
          width={200}
          height={100}
          className="hidden lg:block h-auto w-auto"
          priority
        />

        <Image
          src="/assets/icons/logo-clover.svg"
          alt="Logo"
          width={50}
          height={50}
          className="hidden md:block lg:hidden"
          priority
        />

        <Image
          src="/assets/icons/logo-clover.svg"
          alt="Logo"
          width={34}
          height={34}
          className="md:hidden"
          priority
        />
      </Link>

      <nav className="sidebar-nav">
        <ul className="flex flex-1 flex-col gap-6">
          {navItems.map(({ url, name, icon }) => (
            <Link key={name} href={url} className="lg:w-full">
              <li
                className={cn(
                  "sidebar-nav-item",
                  pathname === url && "shad-active"
                )}
              >
                <Image
                  src={icon}
                  alt={name}
                  width={24}
                  height={24}
                  className={cn(
                    "nav-icon",
                    pathname === url && "nav-icon-active"
                  )}
                />
                <p className="hidden lg:block">{name}</p>
              </li>
            </Link>
          ))}
        </ul>
      </nav>

      <Image
        src="/assets/images/illustration-2.png"
        alt="Files Icon"
        width={180}
        height={180}
        className="w-full h-auto max-h-[100px] object-contain mt-2"
      />

      <div className="sidebar-user-info">
        <Image
          src={avatar}
          alt="User Avatar"
          width={44}
          height={44}
          className="sidebar-user-avatar"
        />

        <div className="hidden lg:block">
          <p className="subtitle-2 capitalize">{fullName}</p>
          <p className="caption">{email}</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
