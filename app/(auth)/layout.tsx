import { Logo } from "@/components/Logo";
import Image from "next/image";
import Link from "next/link";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="flex min-h-screen bg-[#fef8f5] font-inter text-[#1d1b1a] dark:bg-[#32302e] dark:text-[#f5efed]">
      <section className="relative flex w-full flex-col items-center justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-20">
        <Link href="/sign-in" className="mb-8 flex items-center justify-center">
          <Logo size={72} className="size-[72px]" />
          <span className="sr-only">Clover</span>
        </Link>
        <div className="w-full max-w-[440px]">{children}</div>
        <footer className="mt-12 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-[#7f756d] dark:text-[#d0c4bb]">
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
          <span>Contact Support</span>
        </footer>
      </section>

      <section className="relative hidden min-h-screen w-1/2 overflow-hidden border-l border-[#d0c4bb]/40 bg-[#f8f2f0] dark:border-[#7f756d]/40 dark:bg-[#1d1b1a] lg:block">
        <Image
          src="/assets/images/auth-secure-cloud.png"
          alt="Secure private cloud storage"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#6b5c4c]/10 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#fef8f5]/80 via-transparent to-transparent dark:from-[#32302e]/80" />
      </section>
    </main>
  );
};

export default Layout;
