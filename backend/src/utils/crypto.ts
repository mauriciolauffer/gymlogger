const JWT_SECRET = "gymlogger-secret-key-change-in-prod";

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + ":gymlogger-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

export async function generateToken(payload: { userId: string; email: string }): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days
  const tokenPayload = { ...payload, exp };

  const base64Header = btoa(JSON.stringify(header))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const base64Payload = btoa(JSON.stringify(tokenPayload))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const unsignedToken = `${base64Header}.${base64Payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(unsignedToken));
  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${unsignedToken}.${base64Signature}`;
}

export async function verifyToken(
  token: string,
): Promise<{ userId: string; email: string } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const unsignedToken = `${header}.${payload}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const base64 = signature.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4 ? "=".repeat(4 - (base64.length % 4)) : "";
    const sigString = atob(base64 + pad);
    const sigBuf = new Uint8Array(sigString.length);
    for (let i = 0; i < sigString.length; i++) {
      sigBuf[i] = sigString.charCodeAt(i);
    }

    const valid = await crypto.subtle.verify("HMAC", key, sigBuf, encoder.encode(unsignedToken));
    if (!valid) return null;

    const payloadBase64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const payloadPad = payloadBase64.length % 4 ? "=".repeat(4 - (payloadBase64.length % 4)) : "";
    const decodedPayload = JSON.parse(atob(payloadBase64 + payloadPad));

    if (decodedPayload.exp && Math.floor(Date.now() / 1000) > decodedPayload.exp) {
      return null;
    }

    return { userId: decodedPayload.userId, email: decodedPayload.email };
  } catch {
    return null;
  }
}
