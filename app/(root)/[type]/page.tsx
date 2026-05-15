import { FilesPage } from "@/components/FilesPage";
import { getFiles } from "@/lib/actions/file.actions";
import { getFileTypesParams } from "@/lib/utils";
import { getCurrentUser } from "@/lib/actions/user.actions";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

const allowedTypes = ["all", "documents", "images", "media", "others"];
const typeLabels: Record<string, string> = {
  all: "All Files",
  documents: "Documents",
  images: "Images",
  media: "Media",
  others: "Other Files",
};

export async function generateMetadata({
  params,
}: Pick<SearchParamProps, "params">): Promise<Metadata> {
  const type = ((await params)?.type as string) || "";
  const label = typeLabels[type] || "Files";

  return {
    title: `${label} | Clover`,
    description: `Browse ${label.toLowerCase()} in Clover.`,
  };
}

const Page = async ({ searchParams, params }: SearchParamProps) => {
  const type = ((await params)?.type as string) || "";
  if (!allowedTypes.includes(type)) notFound();

  const searchText = ((await searchParams)?.query as string) || "";
  const sort = ((await searchParams)?.sort as string) || "";

  const types = getFileTypesParams(type) as FileType[];

  const currentUser = await getCurrentUser();
  if (!currentUser) return redirect("/sign-in");

  const files = await getFiles({
    types,
    searchText,
    sort,
  });

  return <FilesPage type={type} files={files} currentUser={currentUser} />;
};

export default Page;
