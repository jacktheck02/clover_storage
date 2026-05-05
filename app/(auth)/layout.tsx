import React from "react";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen">
      <section className="hidden w-1/2 items-center justify-center bg-brand dark:bg-[#8b7355] p-10 lg:flex xl:w-2/5 relative transition-colors duration-300">
        <div className="absolute top-4 right-4 lg:hidden">
          <ThemeToggle />
        </div>
        <div className="flex max-h-[800px] max-w-[430px] flex-col justify-center space-y-12">
          <Image
            src="/assets/icons/logo.svg"
            alt="logo"
            width={350}
            height={150}
            className="h-auto w-auto"
            priority
          />

          <div className="space-y-5 text-white">
            <h1 className="h1">Manage your files easily</h1>
            <p className="body-1">
              This is a place where you can store all your documents.
            </p>
          </div>
          <Image
            src="/assets/images/illustration.png"
            alt="Files"
            width={342}
            height={342}
            className="transition-all hover:rotate-2 hover:scale-105"
          />
        </div>
      </section>

      <section className="flex flex-1 flex-col items-center bg-white dark:bg-dark-100 p-4 py-10 lg:justify-center lg:p-10 lg:py-0 relative transition-colors duration-300">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="mb-16 lg:hidden">
          <Image
            src="/assets/icons/logo-full-clover.svg"
            alt="logo"
            width={350}
            height={150}
            className="h-auto w-[200px] lg:w-[250px]"
            style={{ height: "auto" }}
            priority
          />
        </div>

        {children}
      </section>
    </div>
  );
};

export default Layout;
