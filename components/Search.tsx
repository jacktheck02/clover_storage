"use client";

import { Input } from "@/components/ui/input";
import { FileThumbnail } from "@/components/FileThumbnail";
import { isSharedWithUser, SharedFileBadge } from "@/components/SharedFileBadge";
import { getRouteForFile } from "@/components/storage-utils";
import { getFiles } from "@/lib/actions/file.actions";
import { formatDateTime } from "@/lib/utils";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useReducer, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";

export function Search({ currentUser }: { currentUser: UserDocument }) {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchContent currentUser={currentUser} />
    </Suspense>
  );
}

type SearchState = {
  query: string;
  results: FileDocument[];
  open: boolean;
};

const initialSearchState: SearchState = {
  query: "",
  results: [],
  open: false,
};

function SearchFallback() {
  return (
    <div className="relative w-full max-w-[520px]">
      <div className="flex h-11 items-center gap-3 rounded-full border border-[#d0c4bb] bg-[#f8f2f0] px-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-[#7f756d] dark:bg-[#1d1b1a]">
        <MagnifyingGlass className="size-4 shrink-0 text-[#4d453e] dark:text-[#d0c4bb]" />
        <div className="h-5 flex-1 rounded bg-[#ede7e4] dark:bg-[#32302e]" />
      </div>
    </div>
  );
}

function SearchContent({ currentUser }: { currentUser: UserDocument }) {
  const [state, setState] = useReducer(
    (current: SearchState, patch: Partial<SearchState>) => ({
      ...current,
      ...patch,
    }),
    initialSearchState
  );
  const { query, results, open } = state;
  const pathname = usePathname();
  const { push } = useRouter();
  const paramsString = useSearchParams().toString();
  const searchRef = useRef<HTMLDivElement | null>(null);

  const searchFiles = useDebouncedCallback(async (nextQuery: string) => {
    if (!nextQuery.trim()) {
      setState({ results: [], open: false });
      return;
    }

    const files = await getFiles({ types: [], searchText: nextQuery });
    setState({ results: files.documents, open: true });
  }, 300);

  useEffect(() => {
    const queryParam = new URLSearchParams(paramsString).get("query");
    setState(
      queryParam
        ? { open: false, results: [] }
        : { query: "", open: false, results: [] }
    );
  }, [pathname, paramsString]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) {
        setState({ open: false });
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const clear = () => {
    searchFiles.cancel();
    setState({ query: "", open: false, results: [] });
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-[520px]">
      <div className="flex h-11 items-center gap-3 rounded-full border border-[#d0c4bb] bg-[#f8f2f0] px-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-[#7f756d] dark:bg-[#1d1b1a]">
        <MagnifyingGlass className="size-4 shrink-0 text-[#4d453e] dark:text-[#d0c4bb]" />
        <Input
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setState({ query: nextQuery });
            searchFiles(nextQuery);
          }}
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
          className={`absolute left-0 top-14 z-[80] overflow-hidden rounded-xl border border-[#d0c4bb] bg-[#fffaf7] p-2 shadow-[0_8px_20px_rgba(31,27,24,0.08)] dark:border-[#7f756d] dark:bg-[#1d1b1a] dark:shadow-[0_8px_20px_rgba(0,0,0,0.22)] ${
            results.length > 0 ? "w-full" : "w-[min(360px,100%)]"
          }`}
        >
          {results.length > 0 ? (
            <ul className="max-h-[360px] overflow-auto">
              {results.map((file) => {
                const sharedWithCurrentUser = isSharedWithUser(file, currentUser);

                return (
                  <li key={file.$id}>
                    <button
                      type="button"
                      onClick={() => {
                        const route = getRouteForFile(file);
                        clear();
                        push(`${route}?query=${encodeURIComponent(query)}`);
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-lg p-2 text-left transition-colors hover:bg-[#f8f2f0] dark:hover:bg-[#32302e]"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <FileThumbnail file={file} className="size-9" sizes="36px" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-[#1d1b1a] dark:text-[#f5efed]">
                            {file.name}
                          </span>
                          <span className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                            {sharedWithCurrentUser && (
                              <SharedFileBadge
                                ownerName={file.owner.fullName}
                                compact
                              />
                            )}
                            <span className="text-xs text-[#7f756d] dark:text-[#d0c4bb]">
                              {formatDateTime(file.$createdAt)}
                            </span>
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
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
