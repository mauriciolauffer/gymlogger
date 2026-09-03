const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS },
    keyMaterial,
    256,
  );

  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const hashHex = Array.from(new Uint8Array(derived))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const colonIdx = stored.indexOf(":");
  if (colonIdx === -1) return false;

  const saltHex = stored.slice(0, colonIdx);
  const expectedHex = stored.slice(colonIdx + 1);

  // Support legacy single-round SHA-256 hashes (no salt prefix — 64 hex chars, no colon)
  if (saltHex.length !== SALT_BYTES * 2) {
    const encoder = new TextEncoder();
    const legacyBuf = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(password + ":gymlogger-salt"),
    );
    const legacyHex = Array.from(new Uint8Array(legacyBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return legacyHex === stored;
  }

  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS },
    keyMaterial,
    256,
  );
  const derivedHex = Array.from(new Uint8Array(derived))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison via subtle.verify is not available for arbitrary bytes,
  // so we compare via HMAC sign+verify to avoid timing leaks.
  const key = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(32),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(expectedHex));
  return crypto.subtle.verify("HMAC", key, sig, enc.encode(derivedHex));
}

function toBase64Url(bytes: Uint8Array): string {
  return bytes.toBase64({ alphabet: "base64url", omitPadding: true });
}

function fromBase64Url(str: string): Uint8Array {
  return Uint8Array.fromBase64(str, { alphabet: "base64url" });
}

export async function generateToken(
  payload: { userId: string; email: string },
  secret: string,
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days
  const tokenPayload = { ...payload, exp };

  const encoder = new TextEncoder();
  const base64Header = toBase64Url(encoder.encode(JSON.stringify(header)));
  const base64Payload = toBase64Url(encoder.encode(JSON.stringify(tokenPayload)));

  const unsignedToken = `${base64Header}.${base64Payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(unsignedToken));
  const base64Signature = toBase64Url(new Uint8Array(signature));

  return `${unsignedToken}.${base64Signature}`;
}

export async function verifyToken(
  token: string,
  secret: string,
): Promise<{ userId: string; email: string } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const unsignedToken = `${header}.${payload}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const sigBuf = fromBase64Url(signature);
    const valid = await crypto.subtle.verify("HMAC", key, sigBuf, encoder.encode(unsignedToken));
    if (!valid) return null;

    const decodedPayload = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));

    if (decodedPayload.exp && Math.floor(Date.now() / 1000) > decodedPayload.exp) {
      return null;
    }

    return { userId: decodedPayload.userId, email: decodedPayload.email };
  } catch {
    return null;
  }
}
