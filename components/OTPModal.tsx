"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { isTurnstileConfigured, Turnstile } from "@/components/Turnstile";
import { sendEmailOTP, verifySecret } from "@/lib/actions/user.actions";
import { SpinnerGap, X } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface OTPModalProps {
  accountId: string;
  email: string;
  onClose: () => void;
}

export function OTPModal({ accountId, email, onClose }: OTPModalProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resendTurnstileToken, setResendTurnstileToken] = useState("");
  const { push } = useRouter();

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    if (loading) return;
    if (password.length !== 6) {
      setOtpError("Please enter the full 6-digit OTP.");
      return;
    }

    setOtpError("");
    setLoading(true);
    try {
      const session = await verifySecret({ accountId, password });
      if (session) push("/");
    } catch (error) {
      console.error(error);
      setOtpError("Invalid or expired OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md rounded-xl border-[#d0c4bb] bg-white p-6 dark:border-[#7f756d] dark:bg-[#1d1b1a]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-[#7f756d] hover:bg-[#f8f2f0] dark:hover:bg-[#32302e]"
        >
          <X className="size-4" />
          <span className="sr-only">Close OTP dialog</span>
        </button>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center text-2xl font-medium text-[#1d1b1a] dark:text-[#f5efed]">
            Enter your OTP
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-sm leading-6 text-[#4d453e] dark:text-[#d0c4bb]">
            We sent a 6-digit OTP to{" "}
            <span className="font-semibold text-[#056e7d] dark:text-[#5bd7bf]">
              {email}
            </span>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <InputOTP
            maxLength={6}
            autoComplete="one-time-code"
            data-bwignore="true"
            inputMode="numeric"
            pattern="^[0-9]+$"
            pushPasswordManagerStrategy="none"
            value={password}
            onChange={(value) => {
              setPassword(value);
              if (otpError) setOtpError("");
            }}
          >
            <InputOTPGroup className="flex w-full justify-between gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <InputOTPSlot
                  key={index}
                  index={index}
                  className="size-12 rounded-lg border-2 border-[#d0c4bb] text-xl font-semibold text-[#6b5c4c] dark:border-[#7f756d] dark:bg-[#32302e] dark:text-[#d7c3b0] md:size-14"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
          {otpError && <p className="text-center text-sm text-[#ba1a1a]">{otpError}</p>}

          <AlertDialogFooter className="flex-col gap-3 sm:flex-col">
            <Button
              type="submit"
              className="h-12 w-full rounded-lg bg-[#056e7d] font-semibold text-white hover:bg-[#056e7d]/90"
              disabled={loading}
            >
              Submit
              {loading && <SpinnerGap className="ml-2 size-4 animate-spin" />}
            </Button>
            <div className="text-center text-sm text-[#4d453e] dark:text-[#d0c4bb]">
              Didn&apos;t receive the OTP?
              <Button
                type="button"
                variant="link"
                className="px-1 font-semibold text-[#056e7d] dark:text-[#5bd7bf]"
                onClick={() => {
                  if (isTurnstileConfigured() && !resendTurnstileToken) {
                    setOtpError("Please complete the security check before resending.");
                    return;
                  }
                  sendEmailOTP({ email, turnstileToken: resendTurnstileToken });
                }}
              >
                Resend
              </Button>
            </div>
            <Turnstile
              onToken={setResendTurnstileToken}
              onReset={() => setResendTurnstileToken("")}
            />
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
