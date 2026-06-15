

import { createHmac, timingSafeEqual } from "node:crypto";

export const AUTH_COOKIE_NAME = "pbt_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const getCredentials = () => {
  const username = process.env.AUTH_USERNAME;
  const password = process.env.AUTH_PASSWORD;
  const sessionSecret = process.env.AUTH_SESSION_SECRET;

  if (!username || !password || !sessionSecret) {
    return null;
  }

  return { username, password, sessionSecret };
};

const hmac = (value: string, secret: string) =>
  createHmac("sha256", secret).update(value).digest("hex");

const safeCompare = (a: string, b: string) => {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
};

export const authConfigured = () => getCredentials() !== null;

export const validateLogin = (username: string, password: string) => {
  const creds = getCredentials();
  if (!creds) return false;
  return safeCompare(username, creds.username) && safeCompare(password, creds.password);
};

export const createSessionValue = (username: string) => {
  const creds = getCredentials();
  if (!creds) return null;

  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const payload = `${username}.${expiresAt}`;
  const signature = hmac(payload, creds.sessionSecret);
  return Buffer.from(`${payload}.${signature}`, "utf-8").toString("base64url");
};

export const verifySessionValue = (sessionValue: string | undefined) => {
  const creds = getCredentials();
  if (!creds || !sessionValue) return false;

  try {
    const decoded = Buffer.from(sessionValue, "base64url").toString("utf-8");
    const [username, expiresAtRaw, signature] = decoded.split(".");
    if (!username || !expiresAtRaw || !signature) return false;

    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

    const payload = `${username}.${expiresAtRaw}`;
    const expected = hmac(payload, creds.sessionSecret);

    if (!safeCompare(signature, expected)) return false;
    if (!safeCompare(username, creds.username)) return false;

    return true;
  } catch {
    return false;
  }
};

export const extractCookieValue = (request: Request, cookieName: string) => {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return undefined;

  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [name, ...valueParts] = part.trim().split("=");
    if (name === cookieName) {
      return valueParts.join("=");
    }
  }

  return undefined;
};
