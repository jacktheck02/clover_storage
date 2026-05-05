"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog"  

import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
  } from "@/components/ui/input-otp"
import Image from "next/image";
import React, { useState } from "react";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { sendEmailOTP, verifySecret } from "@/lib/actions/user.actions";
  

const OTPModal = ({ accountId, email}: { accountId: string; email: string }) => {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(true);
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [otpError, setOtpError] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (isLoading) return;

        if (password.length !== 6) {
            setOtpError("Please enter the full 6-digit OTP.");
            return;
        }

        setOtpError("");
        setIsLoading(true);

        try {
            const sessionId = await verifySecret({
                accountId,
                password,
            });
            if(sessionId) router.push("/")

        } catch (error) {
            console.error("Failed to verify OTP:", error);
        }

        setIsLoading(false);
    };

    const handleResendOTP = async () => {
        await sendEmailOTP({ email });
    };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent className="shad-alert-dialog">
            <AlertDialogHeader className="relative felx justify-center">
                <AlertDialogTitle className="h2 text-center">
                    Enter Your OTP
                    <Image
                        src="/assets/icons/close-dark.svg"
                        alt="close"
                        width={20}
                        height={20}
                        onClick={() => setIsOpen(false)}
                        className="otp-close-button"
                    />
                </AlertDialogTitle>
                <AlertDialogDescription className="subtitle-2 text-center text-light-100">
                    We have sent a 6-digit OTP to <span className="pl-1 text-brand">{email}</span>. Please enter the OTP below to verify your account.
                </AlertDialogDescription>
            </AlertDialogHeader>

            <form onSubmit={handleSubmit}>
                <div className="flex w-full flex-col gap-4">
                    <InputOTP maxLength={6} value={password} onChange={(value) => {
                        setPassword(value);
                        if (otpError && value.length <= 6) setOtpError("");
                    }}>
                        <InputOTPGroup className="shad-otp">
                            <InputOTPSlot index={0} className="shad-otp-slot" />
                            <InputOTPSlot index={1} className="shad-otp-slot" />
                            <InputOTPSlot index={2} className="shad-otp-slot" />
                            <InputOTPSlot index={3} className="shad-otp-slot" />
                            <InputOTPSlot index={4} className="shad-otp-slot" />
                            <InputOTPSlot index={5} className="shad-otp-slot" />
                        </InputOTPGroup>
                    </InputOTP>
                    {otpError && <p className="text-center text-sm text-red-500">{otpError}</p>}
                    <AlertDialogFooter>
                        <AlertDialogAction
                            className="shad-submit-btn h-12"
                            type="submit"
                        >
                            Submit
                            {isLoading && (
                                <Image
                                    src="/assets/icons/loader.svg"
                                    alt="loader"
                                    width={24}
                                    height={24}
                                    className="ml-2 animate-spin"
                                />
                            )}
                        </AlertDialogAction>

                        <div className="subtitle-2 mt-2 text-center text-light-100">
                            Didn&apos;t receive the OTP?
                            <Button
                                type="button"
                                variant="link"
                                className="pl-1 text-brand"
                                onClick={handleResendOTP}
                            >
                                Click to resend
                            </Button>
                        </div>
                    </AlertDialogFooter>
                </div>
            </form>
        </AlertDialogContent>
    </AlertDialog>
  )
}

export default OTPModal