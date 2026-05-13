import { MAX_FILE_SIZE_BYTES } from "@/shared/storage-limits";

export const sortTypes = [
    {
      label: 'Date created (newest)',
      value: '$createdAt-desc',
    },
    {
      label: 'Created Date (oldest)',
      value: '$createdAt-asc',
    },
    {
      label: 'Name (A-Z)',
      value: 'name-asc',
    },
    {
      label: 'Name (Z-A)',
      value: 'name-desc',
    },
    {
      label: 'Size (Highest)',
      value: 'size-desc',
    },
    {
      label: 'Size (Lowest)',
      value: 'size-asc',
    },
];

export const MAX_FILE_SIZE = MAX_FILE_SIZE_BYTES;
