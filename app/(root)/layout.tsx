import React from "react";
import { AppShell } from "@/components/AppShell";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const currentUser = await getCurrentUser();

  if (!currentUser) return redirect("/sign-in");

  return <AppShell user={currentUser}>{children}</AppShell>;
};
export default Layout;
