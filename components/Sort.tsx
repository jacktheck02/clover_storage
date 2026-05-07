"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter } from "next/navigation";
import { sortTypes } from "@/constants";

const Sort = () => {
  const path = usePathname();
  const router = useRouter();

  const handleSort = (value: string) => {
    router.push(`${path}?sort=${value}`);
  };

  return (
    <Select onValueChange={handleSort} defaultValue={sortTypes[0].value}>
      <SelectTrigger className="h-11 w-full rounded-lg border-[#d0c4bb] bg-white text-sm text-[#1d1b1a] shadow-none dark:border-[#7f756d] dark:bg-[#1d1b1a] dark:text-[#f5efed] sm:w-[220px]">
        <SelectValue placeholder={sortTypes[0].value} />
      </SelectTrigger>
      <SelectContent className="rounded-xl border-[#d0c4bb] bg-white shadow-[0_12px_30px_rgba(31,27,24,0.12)] dark:border-[#7f756d] dark:bg-[#1d1b1a]">
        {sortTypes.map((sort) => (
          <SelectItem
            key={sort.label}
            className="cursor-pointer rounded-lg text-sm text-[#1d1b1a] focus:bg-[#f8f2f0] dark:text-[#f5efed] dark:focus:bg-[#32302e]"
            value={sort.value}
          >
            {sort.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default Sort;
