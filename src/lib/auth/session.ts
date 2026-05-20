import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "jose";

const COOKIE_NAME = "sickfit_team_session";
const DEFAULT_SESSION_AGE_DAYS = 30;
const SECONDS_PER_DAY = 60 * 60 * 24;

function getSessionAgeSeconds() {
  const configuredDays = Number(process.env.SESSION_MAX_AGE_DAYS);
  const sessionAgeDays =
    Number.isFinite(configuredDays) && configuredDays > 0
      ? configuredDays
      : DEFAULT_SESSION_AGE_DAYS;

  return Math.floor(sessionAgeDays * SECONDS_PER_DAY);
}

function getSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET is not set.");
  }

  return new TextEncoder().encode(secret);
}

export interface SessionPayload extends JWTPayload {
  team: "sickfit";
}

export async function signSession(payload: SessionPayload) {
  const sessionAgeSeconds = getSessionAgeSeconds();

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${sessionAgeSeconds}s`)
    .sign(getSecret());
}

export async function verifySession(token: string) {
  try {
    const verified = await jwtVerify<SessionPayload>(token, getSecret());
    return verified.payload;
  } catch {
    return null;
  }
}

export async function createTeamSession() {
  return await signSession({ team: "sickfit" });
}

export async function refreshTeamSession(payload: SessionPayload) {
  return await signSession({ team: payload.team });
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: getSessionAgeSeconds(),
    path: "/",
  };
}

export const sessionCookie = {
  name: COOKIE_NAME,
};
