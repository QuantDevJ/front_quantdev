"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { FormErrorAlert } from "@/components/form-error-alert";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-error";
import { postLogin } from "@/lib/auth-api";
import { setAuthCache } from "@/lib/auth-session";

export default function LoginPage() {
  const router = useRouter();
  
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    try {
      const data = await postLogin({ email, password });
      setAuthCache({
        user_id: data.user_id,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(
        ApiError.isApiError(err)
          ? err
          : new ApiError(
              "UNKNOWN",
              err instanceof Error ? err.message : "Login failed",
              [],
            ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-white px-4 py-10">
      <Card className="w-full max-w-[576px] rounded-[36px] border-border bg-white p-0 shadow-[0px_4px_4px_rgba(0,0,0,0.25)]">
        <div className="p-8 sm:p-12 lg:p-16">
          <div className="flex items-center gap-[5px]">
            <div className="flex h-10 w-9 items-center justify-center rounded-xl bg-[#0057FF]">
              <span className="text-base font-semibold tracking-[-0.04em] text-white">
                Q
              </span>
            </div>
            <div className="text-xl font-black tracking-[-0.04em] text-[#141414]">
              Quant.ly
            </div>
          </div>

          <div className="mt-5">
            <CardHeader className="p-0">
              <CardTitle className="text-[28px] font-black leading-[42px] tracking-[-0.04em] text-[#1C1B1B]">
                Secure Login
              </CardTitle>
              <CardDescription className="mt-0 text-base leading-6 text-[#454652]">
                Welcome back. Enter your credentials to continue.
              </CardDescription>
            </CardHeader>
          </div>

          <CardContent className="p-0">
            <form className="mt-6 grid gap-5" onSubmit={onSubmit}>
              <FormErrorAlert error={error} />

              <div className="grid gap-2">
                <Label
                  className="text-sm font-bold tracking-[-0.04em] text-[#2D2D2D]"
                  htmlFor="email"
                >
                  EMAIL
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  className="h-[45px] rounded-xl border border-[#C4C4C4] bg-[#F5F5F5] px-5 py-[18px] text-sm text-[#141414] placeholder:text-[#C4C4C4]"
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label
                    className="text-sm font-bold tracking-[-0.04em] text-[#2D2D2D]"
                    htmlFor="password"
                  >
                    PASSWORD
                  </Label>
                  <Link
                    className="text-xs text-[#003DBF] hover:underline"
                    href="#"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <PasswordInput
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  className="h-[45px] rounded-xl border border-[#C4C4C4] bg-[#F5F5F5] px-5 py-[18px] text-sm text-[#141414] placeholder:text-[#C4C4C4]"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="remember" disabled={loading} />
                <Label
                  className="text-sm font-semibold tracking-[-0.04em] text-[#454652]"
                  htmlFor="remember"
                >
                  Remember device
                </Label>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-[54px] w-full rounded-[18px] bg-[#0057FF] text-xl font-black tracking-[-0.04em] text-white hover:bg-[#0057FF]/90 disabled:opacity-60"
              >
                <span>{loading ? "Signing in..." : "Login To Dashboard"}</span>
                {!loading ? (
                  <svg
                    className="ml-1"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 12H19"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M13 6L19 12L13 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </Button>

              <p className="pt-1 text-center text-sm text-[#737373]">
                Not a member yet?{" "}
                <Link
                  className="font-semibold text-[#003DBF] hover:underline"
                  href="/register"
                >
                  Create Account
                </Link>
              </p>
            </form>
          </CardContent>
        </div>
      </Card>
    </main>
  );
}
