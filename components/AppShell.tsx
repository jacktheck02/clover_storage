import { MobileNav } from "@/components/MobileNav";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

interface AppShellProps {
  user: UserDocument;
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  return (
    <main className="fixed inset-0 overflow-hidden bg-[#fef8f5] font-inter text-[#1d1b1a] dark:bg-[#32302e] dark:text-[#f5efed]">
      <div className="flex h-full">
        <Sidebar user={user} />
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <MobileNav user={user} />
          <TopBar user={user} />
          <div className="flex-1 overflow-auto">
            <div className="mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
              {children}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
