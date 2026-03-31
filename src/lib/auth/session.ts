import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "jose";

const COOKIE_NAME = "sickfit_team_session";
const SESSION_AGE_SECONDS = 60 * 60 * 24 * 7;

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
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_AGE_SECONDS}s`)
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

export const sessionCookie = {
  name: COOKIE_NAME,
  maxAge: SESSION_AGE_SECONDS,
};
