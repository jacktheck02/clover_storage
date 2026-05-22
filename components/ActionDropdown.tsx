"use client";

import { FileIcon } from "@/components/FileIcon";
import { FileThumbnail } from "@/components/FileThumbnail";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  deleteFile,
  renameFile,
  updateFileUsers,
} from "@/lib/actions/file.actions";
import {
  constructDownloadUrl,
  convertFileSize,
  formatDateTime,
} from "@/lib/utils";
import {
  DotsThreeIcon,
  DownloadSimpleIcon,
  InfoIcon,
  PencilIcon,
  ShareNetworkIcon,
  SpinnerGapIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { FormEvent } from "react";
import { useEffect, useReducer } from "react";
import Link from "next/link";

const actions = [
  { label: "Rename", value: "rename", icon: PencilIcon },
  { label: "Details", value: "details", icon: InfoIcon },
  { label: "Share", value: "share", icon: ShareNetworkIcon },
  { label: "Download", value: "download", icon: DownloadSimpleIcon },
  { label: "Delete", value: "delete", icon: TrashIcon },
];
type FileAction = (typeof actions)[number];

type ActionDropdownState = {
  dropdownOpen: boolean;
  dialogOpen: boolean;
  action: FileAction | null;
  name: string;
  emails: string[];
  loading: boolean;
};

const getInitialState = (file: FileDocument): ActionDropdownState => ({
  dropdownOpen: false,
  dialogOpen: false,
  action: null,
  name: getBaseName(file.name, file.extension),
  emails: [],
  loading: false,
});

const getBaseName = (fileName: string, extension: string) => {
  const suffix = extension ? `.${extension}` : "";
  if (!suffix || !fileName.toLowerCase().endsWith(suffix.toLowerCase())) {
    return fileName;
  }

  return fileName.slice(0, -suffix.length);
};

const getFullName = (baseName: string, extension: string) => {
  const trimmedName = baseName.trim();
  if (!extension) return trimmedName;
  return `${trimmedName}.${extension}`;
};

export function ActionDropdown({
  file,
  onActionComplete,
  onSuppressPreviewOpen,
}: {
  file: FileDocument;
  onActionComplete?: (
    action: (typeof actions)[number]["value"],
    nextFileName?: string
  ) => void;
  onSuppressPreviewOpen?: () => void;
}) {
  const [state, setState] = useReducer(
    (current: ActionDropdownState, patch: Partial<ActionDropdownState>) => ({
      ...current,
      ...patch,
    }),
    file,
    getInitialState
  );
  const { dropdownOpen, dialogOpen, action, name, emails, loading } = state;

  useEffect(() => {
    setState({ name: getBaseName(file.name, file.extension) });
  }, [file.extension, file.name]);

  const close = () => {
    setState({
      dialogOpen: false,
      dropdownOpen: false,
      action: null,
      name: getBaseName(file.name, file.extension),
      emails: [],
    });
  };

  const handleAction = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!action) return;
    const actionValue = action.value;
    const nextBaseName =
      actionValue === "rename" ? getBaseName(name, file.extension).trim() : "";
    const nextFileName =
      actionValue === "rename" ? getFullName(nextBaseName, file.extension) : undefined;
    const path = window.location.pathname;
    setState({ loading: true });
    try {
      if (actionValue === "rename") {
        await renameFile({
          fileId: file.$id,
          name: nextBaseName,
          extension: file.extension,
          path,
        });
      }
      if (actionValue === "share") {
        await updateFileUsers({ fileId: file.$id, emails, path });
      }
      if (actionValue === "delete") {
        await deleteFile({ fileId: file.$id, path });
      }
      close();
      if (nextFileName) {
        setState({ name: getBaseName(nextFileName, file.extension) });
      }
      onActionComplete?.(actionValue, nextFileName);
    } finally {
      setState({ loading: false });
    }
  };

  const removeUser = async (email: string) => {
    const path = window.location.pathname;
    const nextEmails = file.users.filter((item) => item !== email);
    await updateFileUsers({ fileId: file.$id, emails: nextEmails, path });
    close();
  };

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (open) setState({ dialogOpen: true });
        else close();
      }}
    >
      <DropdownMenu
        open={dropdownOpen}
        onOpenChange={(open) => setState({ dropdownOpen: open })}
      >
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-lg text-[#7f756d] transition-colors hover:bg-[#f3edea] hover:text-[#1d1b1a] dark:text-[#d0c4bb] dark:hover:bg-[#4d453e] dark:hover:text-[#f5efed]"
          >
            <DotsThreeIcon className="size-5" />
            <span className="sr-only">Open actions for {file.name}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="z-[70] w-56 rounded-xl border-[#d0c4bb] bg-white p-1 shadow-[0_12px_30px_rgba(31,27,24,0.12)] dark:border-[#7f756d] dark:bg-[#1d1b1a]">
          <DropdownMenuLabel className="truncate text-xs text-[#7f756d] dark:text-[#d0c4bb]">
            {file.name}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-[#e7e1df] dark:bg-[#4d453e]" />
          {actions.map((item) => {
            const Icon = item.icon;
            if (item.value === "download") {
              return (
                <DropdownMenuItem key={item.value} asChild>
                  <Link
                    href={constructDownloadUrl(file.$id)}
                    download={file.name}
                    className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm text-[#1d1b1a] focus:bg-[#f8f2f0] dark:text-[#f5efed] dark:focus:bg-[#32302e]"
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              );
            }

            return (
              <DropdownMenuItem
                key={item.value}
                className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm text-[#1d1b1a] focus:bg-[#f8f2f0] dark:text-[#f5efed] dark:focus:bg-[#32302e]"
                onClick={() => {
                  setState({ action: item, dialogOpen: true });
                }}
              >
                <Icon className="size-4" />
                {item.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent
        className="max-w-md rounded-xl border-[#d0c4bb] bg-white p-0 text-[#1d1b1a] dark:border-[#7f756d] dark:bg-[#1d1b1a] dark:text-[#f5efed]"
        onInteractOutside={onSuppressPreviewOpen}
        onPointerDownOutside={onSuppressPreviewOpen}
      >
        {action && (
          <>
            <DialogHeader className="space-y-3 border-b border-[#e7e1df] px-5 py-4 text-left dark:border-[#4d453e]">
              <DialogTitle className="text-xl font-medium">{action.label}</DialogTitle>
              <DialogDescription className="sr-only">
                {action.label} action for {file.name}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAction}>
              <div className="space-y-4 px-5 py-4">
                {action.value === "rename" && (
                  <div className="space-y-2">
                    <Input
                      value={name}
                      onChange={(event) => setState({ name: event.target.value })}
                      className="h-12 rounded-lg border-[#d0c4bb] bg-[#f8f2f0] dark:border-[#7f756d] dark:bg-[#32302e]"
                      aria-label="File name"
                    />
                    {file.extension ? (
                      <p className="text-xs text-[#7f756d] dark:text-[#d0c4bb]">
                        The extension will remain .{file.extension}.
                      </p>
                    ) : (
                      <p className="text-xs text-[#7f756d] dark:text-[#d0c4bb]">
                        This file has no extension.
                      </p>
                    )}
                  </div>
                )}
                {action.value === "details" && <FileDetails file={file} />}
                {action.value === "share" && (
                  <ShareInput
                    file={file}
                    onInputChange={(nextEmails) => setState({ emails: nextEmails })}
                    onRemove={removeUser}
                  />
                )}
                {action.value === "delete" && (
                  <div className="flex gap-3 rounded-lg bg-[#f8f2f0] p-3 dark:bg-[#32302e]">
                    <FileIcon type={file.type} />
                    <p className="text-sm leading-6 text-[#4d453e] dark:text-[#d0c4bb]">
                      Delete{" "}
                      <span className="font-semibold text-[#1d1b1a] dark:text-[#f5efed]">
                        {file.name}
                      </span>
                      ? This action cannot be undone.
                    </p>
                  </div>
                )}
              </div>
              {["rename", "share", "delete"].includes(action.value) && (
                <DialogFooter className="gap-2 border-t border-[#e7e1df] px-5 py-4 dark:border-[#4d453e] sm:justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={close}
                    className="rounded-lg text-[#4d453e] dark:text-[#d0c4bb]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      loading ||
                      (action.value === "rename" &&
                        !getBaseName(name, file.extension).trim())
                    }
                    className="rounded-lg bg-[#056e7d] text-white hover:bg-[#056e7d]/90"
                  >
                    <span className="capitalize">{action.value}</span>
                    {loading && <SpinnerGapIcon className="ml-2 size-4 animate-spin" />}
                  </Button>
                </DialogFooter>
              )}
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FileDetails({ file }: { file: FileDocument }) {
  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-lg bg-[#f8f2f0] p-3 dark:bg-[#32302e]">
        <FileThumbnail file={file} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{file.name}</p>
          <p className="text-xs text-[#7f756d] dark:text-[#d0c4bb]">
            {formatDateTime(file.$createdAt)}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-[100px_1fr] gap-y-3 text-sm">
        <dt className="text-[#7f756d] dark:text-[#d0c4bb]">Format</dt>
        <dd className="font-medium">{file.extension || "Unknown"}</dd>
        <dt className="text-[#7f756d] dark:text-[#d0c4bb]">Size</dt>
        <dd className="font-medium">{convertFileSize(file.size)}</dd>
        <dt className="text-[#7f756d] dark:text-[#d0c4bb]">Owner</dt>
        <dd className="font-medium">{file.owner.fullName}</dd>
        <dt className="text-[#7f756d] dark:text-[#d0c4bb]">Last edit</dt>
        <dd className="font-medium">{formatDateTime(file.$updatedAt)}</dd>
      </dl>
    </div>
  );
}

function ShareInput({
  file,
  onInputChange,
  onRemove,
}: {
  file: FileDocument;
  onInputChange: (emails: string[]) => void;
  onRemove: (email: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-lg bg-[#f8f2f0] p-3 dark:bg-[#32302e]">
        <FileThumbnail file={file} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{file.name}</p>
          <p className="text-xs text-[#7f756d] dark:text-[#d0c4bb]">
            {file.users.length} shared users
          </p>
        </div>
      </div>
      <Input
        type="email"
        placeholder="Enter comma-separated emails"
        onChange={(event) =>
          onInputChange(
            event.target.value
              .split(",")
              .flatMap((email) => {
                const trimmedEmail = email.trim();
                return trimmedEmail ? [trimmedEmail] : [];
              })
          )
        }
        className="h-12 rounded-lg border-[#d0c4bb] bg-[#f8f2f0] dark:border-[#7f756d] dark:bg-[#32302e]"
      />
      {file.users.length > 0 && (
        <ul className="space-y-2">
          {file.users.map((email) => (
            <li
              key={email}
              className="flex items-center justify-between gap-2 rounded-lg bg-[#f8f2f0] px-3 py-2 text-sm dark:bg-[#32302e]"
            >
              <span className="truncate">{email}</span>
              <button
                type="button"
                onClick={() => onRemove(email)}
                className="rounded-full p-1 text-[#7f756d] hover:bg-[#ede7e4] dark:hover:bg-[#4d453e]"
              >
                <XIcon className="size-4" />
                <span className="sr-only">Remove {email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
