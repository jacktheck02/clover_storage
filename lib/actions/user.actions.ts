"use server";

import { parseStringify } from "@/lib/utils";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { backendJson, getAuthCookieName } from "@/lib/backend/client";

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const handleError = (error: unknown, message: string) => {
  after(() => console.error(error, message));
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
  turnstileToken,
}: {
  fullName: string;
  email: string;
  turnstileToken?: string;
}) => {
  const result = await backendJson<{ accountId: string }>("/auth/create", {
    method: "POST",
    body: JSON.stringify({
      fullName,
      email: normalizeEmail(email),
      turnstileToken,
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
    after(() => console.error(error));
    return null;
  }
};

export const getCurrentUserSession = async () => {
  const sessionCookie = (await cookies()).get(getAuthCookieName());
  return sessionCookie?.value || null;
};

export const getCurrentAuthenticatedUser = async () => {
  const session = await getCurrentUserSession();
  if (!session) return null;

  const result = await backendJson<{ user: UserDocument | null }>(
    "/auth/current",
    {
      method: "POST",
      body: JSON.stringify({ session }),
    }
  );

  return result.user ? { user: parseStringify(result.user) as UserDocument, session } : null;
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
    after(() => console.error(error, "Failed to sign out user"));
  }

  redirect("/sign-in");
};

export const signInUser = async ({
  email,
  turnstileToken,
}: {
  email: string;
  turnstileToken?: string;
}) => {
  try {
    const result = await backendJson<{
      accountId: string | null;
      error?: string;
    }>("/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({ email: normalizeEmail(email), turnstileToken }),
    });
    return parseStringify(result);
  } catch (error) {
    handleError(error, "Failed to sign in user");
  }
};
