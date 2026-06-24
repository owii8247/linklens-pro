import { customAlphabet } from "nanoid";

// Base62 alphabet, no look-alikes (0/O, 1/l/I) — easier to read aloud and share.
const ALPHABET = "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

export const generateShortCode = customAlphabet(ALPHABET, 7);

const ALIAS_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;
const RESERVED = new Set([
  "auth",
  "dashboard",
  "settings",
  "api",
  "r",
  "links",
  "login",
  "signup",
  "admin",
  "sitemap.xml",
  "robots.txt",
]);

export function isValidAlias(alias: string): boolean {
  return ALIAS_PATTERN.test(alias) && !RESERVED.has(alias.toLowerCase());
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}
