"use client";

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
import { postSignup } from "@/lib/auth-api";
import { setAuthCache } from "@/lib/auth-session";
import type { CheckedState } from "@radix-ui/react-checkbox";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const fullName = String(fd.get("fullName") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (!termsAccepted) {
      setError(
        new ApiError(
          "CLIENT",
          "Please agree to the Terms of Service and Privacy Policy.",
          [],
        ),
      );
      return;
    }

    setLoading(true);
    try {
      const data = await postSignup({
        email,
        password,
        name: fullName || undefined,
      });
      setAuthCache({
        user_id: data.user_id,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(
        ApiError.isApiError(err)
          ? err
          : new ApiError(
              "UNKNOWN",
              err instanceof Error ? err.message : "Signup failed",
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

          <CardHeader className="mt-6 p-0">
            <CardTitle className="text-[36px] font-black leading-[42px] tracking-[-0.04em] text-[#1C1B1B]">
              Create your account
            </CardTitle>
            <CardDescription className="mt-2 text-base leading-6 text-[#454652]">
              Join the next generation of financial luminaries.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <form className="mt-6 grid gap-5" onSubmit={onSubmit}>
              <FormErrorAlert error={error} />

              <p className="text-xs text-[#737373]">
                Password must be 8+ characters and include at least one letter
                and one number.
              </p>

              <div className="grid gap-2">
                <Label
                  className="text-sm font-bold tracking-[-0.04em] text-[#2D2D2D]"
                  htmlFor="fullName"
                >
                  FULL NAME
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  placeholder="E.g. Shruti Sharma"
                  className="h-[45px] rounded-xl border border-[#C4C4C4] bg-[#F5F5F5] px-5 py-[18px] text-sm text-[#141414] placeholder:text-[#C4C4C4]"
                  autoComplete="name"
                  disabled={loading}
                />
              </div>

              <div className="grid gap-2">
                <Label
                  className="text-sm font-bold tracking-[-0.04em] text-[#2D2D2D]"
                  htmlFor="email"
                >
                  EMAIL ADDRESS
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="julian@rivers.com"
                  className="h-[45px] rounded-xl border border-[#C4C4C4] bg-[#F5F5F5] px-5 py-[18px] text-sm text-[#141414] placeholder:text-[#C4C4C4]"
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid gap-2">
                <Label
                  className="text-sm font-bold tracking-[-0.04em] text-[#2D2D2D]"
                  htmlFor="password"
                >
                  PASSWORD
                </Label>
                <PasswordInput
                  id="password"
                  name="password"
                  placeholder="Enter your Password"
                  className="h-[45px] rounded-xl border border-[#C4C4C4] bg-[#F5F5F5] px-5 py-[18px] text-sm text-[#141414] placeholder:text-[#C4C4C4]"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  disabled={loading}
                />
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  className="mt-0.5"
                  disabled={loading}
                  checked={termsAccepted}
                  onCheckedChange={(v: CheckedState) =>
                    setTermsAccepted(v === true)
                  }
                />
                <Label
                  className="text-sm font-medium leading-5 text-[#454652]"
                  htmlFor="terms"
                >
                  I agree to the{" "}
                  <Link className="text-[#003DBF] hover:underline" href="#">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link className="text-[#003DBF] hover:underline" href="#">
                    Privacy Policy
                  </Link>
                  .
                </Label>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="mt-1 h-[54px] w-full rounded-[18px] bg-[#0057FF] text-xl font-black tracking-[-0.04em] text-white hover:bg-[#0057FF]/90 disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Create Account"}
              </Button>

              <p className="pt-1 text-center text-sm text-[#737373]">
                Already have an account?{" "}
                <Link
                  className="font-semibold text-[#003DBF] hover:underline"
                  href="/login"
                >
                  Login
                </Link>
              </p>
            </form>
          </CardContent>
        </div>
      </Card>
    </main>
  );
}
