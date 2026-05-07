"use server";

import { parseStringify } from "@/lib/utils";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { backendJson, getAuthCookieName } from "@/lib/backend/client";

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

export const sendEmailOTP = async ({
  email,
  turnstileToken,
}: {
  email: string;
  turnstileToken?: string;
}) => {
  try {
    const result = await backendJson<{ accountId: string | null }>(
      "/auth/send-otp",
      {
        method: "POST",
        body: JSON.stringify({
          email: normalizeEmail(email),
          turnstileToken,
        }),
      }
    );
    return result.accountId;
  } catch (error) {
    handleError(error, "Failed to send email OTP");
  }
};

export const createAccount = async ({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) => {
  const result = await backendJson<{ accountId: string }>("/auth/create", {
    method: "POST",
    body: JSON.stringify({
      fullName,
      email: normalizeEmail(email),
    }),
  });
  return parseStringify(result);
};

export const verifySecret = async ({
  accountId,
  password,
}: {
  accountId: string;
  password: string;
}) => {
  try {
    const result = await backendJson<{
      sessionId: string;
      token: string;
      accountId?: string;
      maxAge?: number;
    }>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ accountId, password }),
    });

    const sessionAccountId = result.accountId || accountId;
    (await cookies()).set(getAuthCookieName(), `${sessionAccountId}.${result.token}`, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
      maxAge: result.maxAge || SESSION_MAX_AGE_SECONDS,
    });

    return parseStringify({ sessionId: result.sessionId });
  } catch (error) {
    handleError(error, "Failed to verify OTP");
  }
};

export const getCurrentUser = async () => {
  try {
    const sessionCookie = (await cookies()).get(getAuthCookieName());
    if (!sessionCookie?.value) return null;

    const result = await backendJson<{ user: UserDocument | null }>(
      "/auth/current",
      {
        method: "POST",
        body: JSON.stringify({ session: sessionCookie.value }),
      }
    );

    return result.user ? parseStringify(result.user) : null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const signOutUser = async () => {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(getAuthCookieName());
    if (sessionCookie?.value) {
      await backendJson("/auth/sign-out", {
        method: "POST",
        body: JSON.stringify({ session: sessionCookie.value }),
      });
    }
    cookieStore.delete(getAuthCookieName());
  } catch (error) {
    handleError(error, "Failed to sign out user");
  } finally {
    redirect("/sign-in");
  }
};

export const signInUser = async ({ email }: { email: string }) => {
  try {
    const result = await backendJson<{
      accountId: string | null;
      error?: string;
    }>("/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({ email: normalizeEmail(email) }),
    });
    return parseStringify(result);
  } catch (error) {
    handleError(error, "Failed to sign in user");
  }
};
