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
  DotsThree,
  DownloadSimple,
  Info,
  Pencil,
  ShareNetwork,
  SpinnerGap,
  Trash,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const actions = [
  { label: "Rename", value: "rename", icon: Pencil },
  { label: "Details", value: "details", icon: Info },
  { label: "Share", value: "share", icon: ShareNetwork },
  { label: "Download", value: "download", icon: DownloadSimple },
  { label: "Delete", value: "delete", icon: Trash },
];

export function ActionDropdown({ file }: { file: FileDocument }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [action, setAction] = useState<(typeof actions)[number] | null>(null);
  const [name, setName] = useState(file.name);
  const [emails, setEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const path = usePathname();

  const close = () => {
    setDialogOpen(false);
    setDropdownOpen(false);
    setAction(null);
    setName(file.name);
    setEmails([]);
  };

  const handleAction = async () => {
    if (!action) return;
    setLoading(true);
    try {
      if (action.value === "rename") {
        await renameFile({ fileId: file.$id, name, extension: file.extension, path });
      }
      if (action.value === "share") {
        await updateFileUsers({ fileId: file.$id, emails, path });
      }
      if (action.value === "delete") {
        await deleteFile({ fileId: file.$id, path });
      }
      close();
    } finally {
      setLoading(false);
    }
  };

  const removeUser = async (email: string) => {
    const nextEmails = file.users.filter((item) => item !== email);
    await updateFileUsers({ fileId: file.$id, emails: nextEmails, path });
    close();
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-lg text-[#7f756d] transition-colors hover:bg-[#f3edea] hover:text-[#1d1b1a] dark:text-[#d0c4bb] dark:hover:bg-[#4d453e] dark:hover:text-[#f5efed]"
          >
            <DotsThree className="size-5" />
            <span className="sr-only">Open actions for {file.name}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 rounded-xl border-[#d0c4bb] bg-white p-1 shadow-[0_12px_30px_rgba(31,27,24,0.12)] dark:border-[#7f756d] dark:bg-[#1d1b1a]">
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
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-[#1d1b1a] focus:bg-[#f8f2f0] dark:text-[#f5efed] dark:focus:bg-[#32302e]"
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
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-[#1d1b1a] focus:bg-[#f8f2f0] dark:text-[#f5efed] dark:focus:bg-[#32302e]"
                onClick={() => {
                  setAction(item);
                  setDialogOpen(true);
                }}
              >
                <Icon className="size-4" />
                {item.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="max-w-md rounded-xl border-[#d0c4bb] bg-white p-0 text-[#1d1b1a] dark:border-[#7f756d] dark:bg-[#1d1b1a] dark:text-[#f5efed]">
        {action && (
          <>
            <DialogHeader className="space-y-3 border-b border-[#e7e1df] px-5 py-4 text-left dark:border-[#4d453e]">
              <DialogTitle className="text-xl font-medium">{action.label}</DialogTitle>
              <DialogDescription className="sr-only">
                {action.label} action for {file.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 px-5 py-4">
              {action.value === "rename" && (
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-12 rounded-lg border-[#d0c4bb] bg-[#f8f2f0] dark:border-[#7f756d] dark:bg-[#32302e]"
                />
              )}
              {action.value === "details" && <FileDetails file={file} />}
              {action.value === "share" && (
                <ShareInput
                  file={file}
                  onInputChange={setEmails}
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
                  type="button"
                  onClick={handleAction}
                  disabled={loading}
                  className="rounded-lg bg-[#056e7d] text-white hover:bg-[#056e7d]/90"
                >
                  <span className="capitalize">{action.value}</span>
                  {loading && <SpinnerGap className="ml-2 size-4 animate-spin" />}
                </Button>
              </DialogFooter>
            )}
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
  onInputChange: React.Dispatch<React.SetStateAction<string[]>>;
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
              .map((email) => email.trim())
              .filter(Boolean)
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
                <X className="size-4" />
                <span className="sr-only">Remove {email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
