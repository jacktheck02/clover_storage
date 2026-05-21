"use client";

import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      onClick={toggleTheme}
      className="flex size-11 items-center justify-center rounded-lg bg-[#f8f2f0] p-0 text-[#6b5c4c] shadow-none transition-colors hover:bg-[#ede7e4] dark:bg-[#1d1b1a] dark:text-[#d7c3b0] dark:hover:bg-[#4d453e]"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? (
        <MoonIcon className="size-6" />
      ) : (
        <SunIcon className="size-6" />
      )}
    </Button>
  );
};

export default ThemeToggle;
