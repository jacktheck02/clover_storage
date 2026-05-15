import { Dashboard as CloverDashboard } from "@/components/Dashboard";
import { getFiles, getTotalSpaceUsed } from "@/lib/actions/file.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Clover Dashboard",
  description: "View recent files and storage usage in Clover.",
};

const DashboardPage = async () => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return redirect("/sign-in");

  const [files, totalSpace] = await Promise.all([
    getFiles({
      types: [],
      limit: 10,
    }),
    getTotalSpaceUsed(),
  ]);

  return <CloverDashboard files={files.documents} totalSpace={totalSpace} />;
};

export default DashboardPage;
