import { Logo } from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import Image from "next/image";
import Link from "next/link";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="flex min-h-screen bg-[#fef8f5] font-inter text-[#1d1b1a] dark:bg-[#161412] dark:text-[#f5efed]">
      <div className="fixed right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      <section className="relative flex w-full flex-col items-center justify-center bg-[#fef8f5] px-6 py-12 sm:px-12 dark:bg-[#161412] lg:w-1/2 lg:px-20">
        <Link href="/sign-in" className="mb-8 flex items-center justify-center">
          <Logo size={72} className="size-[72px]" />
          <span className="sr-only">Clover</span>
        </Link>
        <div className="w-full max-w-[440px]">{children}</div>
      </section>

      <section className="relative hidden min-h-screen w-1/2 overflow-hidden border-l border-[#d0c4bb]/40 bg-[#f8f2f0] dark:border-transparent dark:bg-[#1d1b1a] lg:block">
        <Image
          src="/assets/images/auth-sea.jpg"
          alt="Sea coastline"
          fill
          priority
          sizes="(max-width: 1024px) 0vw, 50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#6b5c4c]/10 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#fef8f5]/80 via-transparent to-transparent dark:from-[#161412]/90 dark:via-[#161412]/30 dark:to-[#161412]/20" />
        <p className="absolute bottom-4 right-4 rounded-full bg-[#161412]/55 px-3 py-1.5 text-[11px] leading-none text-[#f5efed]/85 backdrop-blur-sm">
          Photo by{" "}
          <a
            href="https://unsplash.com/@jakobowens1?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[#f5efed] underline-offset-2 hover:underline"
          >
            Jakob Owens
          </a>{" "}
          on{" "}
          <a
            href="https://unsplash.com/photos/clear-body-of-water-at-daytime-1iqLU3K_x8o?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[#f5efed] underline-offset-2 hover:underline"
          >
            Unsplash
          </a>
        </p>
      </section>
    </main>
  );
};

export default Layout;
