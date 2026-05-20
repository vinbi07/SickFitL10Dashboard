"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { loginAction } from "@/app/login/actions";
import { LoadingButton } from "@/components/ui/loading";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, {
    error: null,
  });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-base px-4">
      <div className="w-full max-w-md rounded-2xl border border-app-border bg-app-panel p-8 shadow-2xl">
        <Image
          src="/SickFit_-_RED.png"
          alt="SickFit logo"
          width={58}
          height={58}
          priority
          className="h-14 w-14 object-contain"
        />
        <h1 className="mt-2 font-heading text-3xl text-white">
          Meeting Dashboard
        </h1>
        <p className="mt-3 text-sm text-app-muted">
          Enter the team password to open the live meeting board.
        </p>

        <form action={formAction} className="mt-8 space-y-4">
          <label className="block text-sm text-app-muted" htmlFor="password">
            Team Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              className="w-full rounded-lg border border-app-border bg-black py-2 pl-3 pr-20 text-white outline-none transition focus:border-brand"
              placeholder="Enter password"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-2 top-1/2 h-8 -translate-y-1/2 px-2 text-sm font-semibold text-app-muted transition hover:text-white focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <LoadingButton
            type="submit"
            isLoading={isPending}
            loadingLabel="Checking session"
            disabled={isPending}
            className="w-full rounded-lg bg-brand px-4 py-2 font-semibold text-white transition hover:brightness-110"
          >
            Enter Dashboard
          </LoadingButton>
          {state.error ? (
            <p className="text-sm text-brand">{state.error}</p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
