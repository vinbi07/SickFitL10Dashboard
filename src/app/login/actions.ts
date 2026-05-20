"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createTeamSession,
  getSessionCookieOptions,
  sessionCookie,
} from "@/lib/auth/session";

interface LoginState {
  error: string | null;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const inputPassword = String(formData.get("password") ?? "");

  if (inputPassword !== process.env.TEAM_PASSWORD) {
    return { error: "Invalid team password." };
  }

  const token = await createTeamSession();
  const cookieStore = await cookies();

  cookieStore.set(sessionCookie.name, token, getSessionCookieOptions());

  redirect("/dashboard");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookie.name);
  redirect("/login");
}
