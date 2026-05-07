"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { OTPModal } from "@/components/OTPModal";
import { useToast } from "@/hooks/use-toast";
import { createAccount, signInUser } from "@/lib/actions/user.actions";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  EnvelopeSimple,
  SpinnerGap,
  User,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type FormType = "sign-in" | "sign-up";

const authSchema = (type: FormType) =>
  z.object({
    email: z.string().email(),
    fullName:
      type === "sign-up"
        ? z.string().trim().min(2).max(50)
        : z.string().optional(),
  });

export function AuthForm({ type }: { type: FormType }) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const { toast } = useToast();
  const formSchema = authSchema(type);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", fullName: "" },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    setErrorMessage("");
    try {
      const result =
        type === "sign-up"
          ? await createAccount({
              fullName: values.fullName || "",
              email: values.email,
            })
          : await signInUser({ email: values.email });

      if (result.error) {
        setErrorMessage(result.error);
        if (result.error === "User not found") {
          toast({
            title: "Account not found",
            description: (
              <span>
                No account exists for this email.{" "}
                <Link href="/sign-up" className="font-semibold underline">
                  Sign up instead
                </Link>
                .
              </span>
            ),
            variant: "destructive",
          });
        }
        return;
      }

      setAccountId(result.accountId);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        type === "sign-in"
          ? "Failed to sign in. Please try again."
          : "Failed to create account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="text-center">
            <h1 className="text-5xl font-semibold tracking-[-0.02em] text-[#6b5c4c] dark:text-[#d7c3b0]">
              Clover
            </h1>
            <p className="mt-3 text-lg leading-7 text-[#4d453e] dark:text-[#d0c4bb]">
              Secure access to your private cloud
            </p>
          </div>

          {type === "sign-up" && (
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-[#1d1b1a] dark:text-[#f5efed]">
                    Full name
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#7f756d]" />
                      <Input
                        placeholder="Enter your full name"
                        className="h-[52px] rounded-lg border-[#d0c4bb] bg-white py-3.5 pl-12 text-base text-[#1d1b1a] focus-visible:border-[#147e68] focus-visible:ring-[#147e68]/20 dark:border-[#7f756d] dark:bg-[#1d1b1a] dark:text-[#f5efed]"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[#ba1a1a]" />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-[#1d1b1a] dark:text-[#f5efed]">
                  Email address
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <EnvelopeSimple className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#7f756d]" />
                    <Input
                      placeholder="you@example.com"
                      type="email"
                      className="h-[52px] rounded-lg border-[#d0c4bb] bg-white py-3.5 pl-12 text-base text-[#1d1b1a] focus-visible:border-[#147e68] focus-visible:ring-[#147e68]/20 dark:border-[#7f756d] dark:bg-[#1d1b1a] dark:text-[#f5efed]"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-[#ba1a1a]" />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={loading}
            className="h-[52px] w-full rounded-lg bg-[#147e68] py-3.5 text-base font-semibold text-white hover:bg-[#147e68]/90 active:scale-[0.98]"
          >
            {type === "sign-in" ? "Send OTP" : "Create account"}
            {loading ? (
              <SpinnerGap className="ml-2 size-4 animate-spin" />
            ) : (
              <ArrowRight className="ml-2 size-4" />
            )}
          </Button>

          {errorMessage && (
            <p className="rounded-lg bg-[#ffdad6] px-4 py-3 text-center text-sm text-[#93000a]">
              {errorMessage}
            </p>
          )}

          <div className="border-t border-[#d0c4bb]/40 pt-6 text-center text-sm text-[#4d453e] dark:border-[#7f756d]/40 dark:text-[#d0c4bb]">
            {type === "sign-in" ? "Don't have an account?" : "Already have an account?"}{" "}
            <Link
              href={type === "sign-in" ? "/sign-up" : "/sign-in"}
              className="font-bold text-[#147e68] hover:underline dark:text-[#5bd7bf]"
            >
              {type === "sign-in" ? "Sign up for an account" : "Sign in"}
            </Link>
          </div>
        </form>
      </Form>

      {accountId && (
        <OTPModal
          accountId={accountId}
          email={form.getValues("email")}
          onClose={() => setAccountId(null)}
        />
      )}
    </>
  );
}
