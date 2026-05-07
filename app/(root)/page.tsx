import { Dashboard as CloverDashboard } from "@/components/Dashboard";
import { getFiles, getTotalSpaceUsed } from "@/lib/actions/file.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { redirect } from "next/navigation";

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
