import { z } from "zod";
import { fileTypeValues, MAX_FILE_SIZE, sortValues } from "./constants";

export const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const actorSchema = z.object({
  userId: z.string().uuid(),
  email: emailSchema,
});

const sortSchema = z
  .enum(sortValues)
  .optional()
  .catch("$createdAt-desc")
  .default("$createdAt-desc");

export const fileListSchema = z.object({
  types: z.array(z.enum(fileTypeValues)).max(fileTypeValues.length).default([]),
  searchText: z.string().trim().max(100).default(""),
  sort: z
    .preprocess((value) => (value === "" ? undefined : value), sortSchema)
    .optional()
    .default("$createdAt-desc"),
  limit: z.number().int().min(1).max(100).optional(),
});

export const fileIdSchema = z.string().uuid();

export const renameFileSchema = z.object({
  fileId: fileIdSchema,
  name: z.string().trim().min(1).max(180).regex(/^[^\r\n/\\]+$/),
  extension: z.string().trim().max(32).regex(/^[a-zA-Z0-9]*$/),
});

export const shareFileSchema = z.object({
  fileId: fileIdSchema,
  emails: z.array(emailSchema).max(50),
});

export const fileMutationSchema = z.object({
  fileId: fileIdSchema,
});

export const uploadIntentSchema = z.object({
  name: z.string().trim().min(1).max(255).regex(/^[^\r\n/\\]+$/),
  size: z.number().int().positive().max(MAX_FILE_SIZE),
  type: z.string().trim().max(100).optional(),
});

export const createAccountSchema = z.object({
  fullName: z.string().trim().min(2).max(50),
  email: emailSchema,
  turnstileToken: z.string().optional(),
});

export const sendOtpSchema = z.object({
  email: emailSchema,
  turnstileToken: z.string().optional(),
});

export const signInSchema = z.object({
  email: emailSchema,
  turnstileToken: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  accountId: z.string().trim().min(1).max(80),
  password: z.string().trim().regex(/^\d{6}$/),
});
