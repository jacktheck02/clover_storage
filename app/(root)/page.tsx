import Image from "next/image";
import Link from "next/link";

import { Chart } from "@/components/Chart";
import { FormattedDateTime } from "@/components/FormattedDateTime";
import { Separator } from "@/components/ui/separator";
import RecentFilesList from "@/components/RecentFilesList";
import { getFiles, getTotalSpaceUsed } from "@/lib/actions/file.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { convertFileSize, getUsageSummary } from "@/lib/utils";
import { redirect } from "next/navigation";

const Dashboard = async () => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return redirect("/sign-in");

  // Parallel requests
  const [files, totalSpace] = await Promise.all([
    getFiles({
      types: [],
      limit: 10,
    }),
    getTotalSpaceUsed(),
  ]);

  // Get usage summary
  const usageSummary = getUsageSummary(totalSpace);

  return (
    <div className="dashboard-container">
      <section>
        <Chart used={totalSpace.used} />

        {/* Uploaded file type summaries */}
        <ul className="dashboard-summary-list">
          {usageSummary.map((summary) => (
            <Link
              href={summary.url}
              key={summary.title}
              className="dashboard-summary-card"
            >
              <div className="space-y-4">
                <div className="flex justify-between gap-3">
                  <Image
                    src={summary.icon}
                    width={80}
                    height={80}
                    alt="uploaded image"
                    className="summary-type-icon"
                    priority
                  />
                  <h4 className="summary-type-size">
                    {convertFileSize(summary.size) || 0}
                  </h4>
                </div>

                <h5 className="summary-type-title">{summary.title}</h5>
                <Separator className="bg-light-400" />
                <FormattedDateTime
                  date={summary.latestDate}
                  className="text-center"
                />
              </div>
            </Link>
          ))}
        </ul>
      </section>

      {/* Recent files uploaded */}
      <section className="dashboard-recent-files">
        <h2 className="h3 xl:h2 text-light-100 dark:text-white">
          Recent files uploaded
        </h2>
        <RecentFilesList files={files.documents} />
      </section>
    </div>
  );
};

export default Dashboard;
