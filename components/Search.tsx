"use client";

import { Input } from "@/components/ui/input";
import { FileThumbnail } from "@/components/FileThumbnail";
import { getRouteForFile } from "@/components/storage-utils";
import { getFiles } from "@/lib/actions/file.actions";
import { formatDateTime } from "@/lib/utils";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";

export function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FileDocument[]>([]);
  const [open, setOpen] = useState(false);
  const [debouncedQuery] = useDebounce(query, 300);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        setOpen(false);
        return;
      }

      const files = await getFiles({ types: [], searchText: debouncedQuery });
      setResults(files.documents);
      setOpen(true);
    };

    fetchResults();
  }, [debouncedQuery]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!searchParams.get("query")) setQuery("");
    setOpen(false);
    setResults([]);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [pathname, searchParams]);

  const clear = () => {
    setQuery("");
    setOpen(false);
    setResults([]);
  };

  return (
    <div className="relative w-full max-w-[520px]">
      <div className="flex h-11 items-center gap-3 rounded-full border border-[#d0c4bb] bg-[#f8f2f0] px-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-[#7f756d] dark:bg-[#1d1b1a]">
        <MagnifyingGlass className="size-4 shrink-0 text-[#4d453e] dark:text-[#d0c4bb]" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search files..."
          className="h-auto border-0 bg-transparent p-0 text-sm text-[#1d1b1a] shadow-none placeholder:text-[#7f756d] focus-visible:ring-0 dark:text-[#f5efed] dark:placeholder:text-[#d0c4bb]"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            className="rounded-full p-1 text-[#7f756d] hover:bg-[#ede7e4] dark:hover:bg-[#4d453e]"
          >
            <X className="size-4" />
            <span className="sr-only">Clear search</span>
          </button>
        )}
      </div>

      {open && (
        <div
          className={`absolute left-0 top-14 z-[80] overflow-hidden rounded-xl border border-[#d0c4bb] bg-[#fffaf7] p-2 shadow-[0_18px_45px_rgba(31,27,24,0.18)] dark:border-[#7f756d] dark:bg-[#1d1b1a] ${
            results.length > 0 ? "w-full" : "w-[min(360px,100%)]"
          }`}
        >
          {results.length > 0 ? (
            <ul className="max-h-[360px] overflow-auto">
              {results.map((file) => (
                <li key={file.$id}>
                  <button
                    type="button"
                    onClick={() => {
                      const route = getRouteForFile(file);
                      clear();
                      router.push(`${route}?query=${encodeURIComponent(query)}`);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg p-2 text-left transition-colors hover:bg-[#f8f2f0] dark:hover:bg-[#32302e]"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <FileThumbnail file={file} className="size-9" sizes="36px" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-[#1d1b1a] dark:text-[#f5efed]">
                          {file.name}
                        </span>
                        <span className="block text-xs text-[#7f756d] dark:text-[#d0c4bb]">
                          {formatDateTime(file.$createdAt)}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-5 text-center text-sm font-medium text-[#7f756d] dark:text-[#d0c4bb]">
              No files found
            </p>
          )}
        </div>
      )}
    </div>
  );
}
