import { FilesPage } from "@/components/FilesPage";
import { getFiles } from "@/lib/actions/file.actions";
import { getFileTypesParams } from "@/lib/utils";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { notFound, redirect } from "next/navigation";

const allowedTypes = ["documents", "images", "media", "others"];

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

  return <FilesPage type={type} files={files} />;
};

export default Page;
