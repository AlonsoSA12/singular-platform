import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getOptionalSessionSecret, getRequiredSessionSecret } from "@/lib/env";
import type { AuthenticatedUser } from "@/lib/types";

const SESSION_COOKIE = "singular_platform_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

type SessionPayload = AuthenticatedUser & {
  exp: number;
};

function encodePayload(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(value: string) {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
}

function sign(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function serializeSession(payload: SessionPayload, secret: string) {
  const encoded = encodePayload(payload);
  return `${encoded}.${sign(encoded, secret)}`;
}

function parseSessionCookie(cookieValue: string, secret: string) {
  const [encoded, signature] = cookieValue.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expectedSignature = sign(encoded, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  const payload = decodePayload(encoded);
  if (!payload || payload.exp < Date.now()) {
    return null;
  }

  return payload;
}

export async function createSession(user: AuthenticatedUser) {
  const sessionSecret = getRequiredSessionSecret();
  const payload: SessionPayload = {
    ...user,
    exp: Date.now() + SESSION_DURATION_MS
  };

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, serializeSession(payload, sessionSecret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(payload.exp)
  });
}

export async function readSession() {
  const sessionSecret = getOptionalSessionSecret();
  if (!sessionSecret) {
    return null;
  }

  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(SESSION_COOKIE)?.value;

  if (!rawCookie) {
    return null;
  }

  const session = parseSessionCookie(rawCookie, sessionSecret);
  if (!session) {
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  return {
    email: session.email,
    name: session.name
  } satisfies AuthenticatedUser;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
