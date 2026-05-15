import Sort from "@/components/Sort";
import { FileCard } from "@/components/FileCard";
import { getPageTitle } from "@/components/storage-utils";
import { convertFileSize } from "@/lib/utils";

interface FilesPageProps {
  type: string;
  files: FilesResponse;
  currentUser: UserDocument;
}

export function FilesPage({ type, files, currentUser }: FilesPageProps) {
  const title = getPageTitle(type);
  const totalSize = files.documents.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[#1d1b1a] dark:text-[#f5efed]">
            {title}
          </h1>
          <p className="mt-2 text-sm text-[#4d453e] dark:text-[#d0c4bb]">
            Total:{" "}
            <span className="font-semibold text-[#1d1b1a] dark:text-[#f5efed]">
              {convertFileSize(totalSize || 0)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-[#7f756d] dark:text-[#d0c4bb] sm:block">
            Sort by
          </span>
          <Sort />
        </div>
      </section>

      {files.total > 0 ? (
        <section className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {files.documents.map((file) => (
            <FileCard key={file.$id} file={file} currentUser={currentUser} />
          ))}
        </section>
      ) : (
        <div className="py-12 text-center">
          <p className="text-sm font-medium text-[#1d1b1a] dark:text-[#f5efed]">
            No files uploaded
          </p>
          <p className="mt-1 text-sm text-[#7f756d] dark:text-[#d0c4bb]">
            Upload files to populate this library.
          </p>
        </div>
      )}
    </div>
  );
}
