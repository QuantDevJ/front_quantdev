"use client";

import { useId, useState, type ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PasswordInputProps = Omit<ComponentProps<typeof Input>, "type">;

export function PasswordInput({
  className,
  id,
  disabled,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className="relative">
      <Input
        id={inputId}
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={cn("pr-12", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#454652] outline-none hover:bg-black/5 hover:text-[#141414] focus-visible:ring-2 focus-visible:ring-[#0057FF] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M2.25 12s3.75-5.25 9.75-5.25S21.75 12 21.75 12s-3.75 5.25-9.75 5.25S2.25 12 2.25 12Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19 12 19c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 5c4.756 0 8.773 2.662 10.065 7a10.524 10.524 0 01-4.323 2.045M9.88 9.88a3 3 0 104.246 4.246M3 3l18 18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
