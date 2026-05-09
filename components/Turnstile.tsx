"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

type TurnstileWidget = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    }
  ) => string;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileWidget;
  }
}

interface TurnstileProps {
  onToken: (token: string) => void;
  onReset?: () => void;
}

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function isTurnstileConfigured() {
  return Boolean(siteKey);
}

export function Turnstile({ onToken, onReset }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  const resetToken = useCallback(() => {
    onReset?.();
  }, [onReset]);

  const renderWidget = useCallback(() => {
    if (!siteKey || !containerRef.current || !window.turnstile || widgetIdRef.current) {
      return;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onToken,
      "expired-callback": resetToken,
      "error-callback": resetToken,
    });
  }, [onToken, resetToken]);

  useEffect(() => {
    renderWidget();
  }, [renderWidget]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        id="cloudflare-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={renderWidget}
      />
      <div ref={containerRef} className="flex min-h-[65px] justify-center" />
    </>
  );
}
