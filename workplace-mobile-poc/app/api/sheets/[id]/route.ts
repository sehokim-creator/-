import { findBinding, normalizeSheet } from "../../../../lib/sheets-source";

/*
 * Read-only Google Sheets proxy.
 *
 * Uses a service account: the private key signs a JWT, Google exchanges it for
 * an access token, and the token reads one range. Nothing is written back.
 *
 * Required environment variables (set as secrets, never committed):
 *   GOOGLE_SA_EMAIL        service account address
 *   GOOGLE_SA_PRIVATE_KEY  its PEM private key
 *   GOOGLE_SHEETS_ID       spreadsheet id from the sheet URL
 *
 * Without them the route answers 503 with `configured: false` so screens can
 * keep showing POC data instead of breaking.
 *
 * NOTE: this endpoint is unauthenticated. Put SSO in front of the app and check
 * membership here before pointing it at a sheet that holds real data — the
 * login screen in app/login.tsx is a client-side demo gate, not access control.
 */

export const dynamic = "force-dynamic";

type Env = {
  GOOGLE_SA_EMAIL?: string;
  GOOGLE_SA_PRIVATE_KEY?: string;
  GOOGLE_SHEETS_ID?: string;
};

const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

function base64Url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/\\n/g, "\n")
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getAccessToken(email: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64Url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${base64Url(signature)}`;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`token exchange failed: ${response.status} ${await response.text()}`);
  }

  const token = (await response.json()) as { access_token?: string };
  if (!token.access_token) throw new Error("token exchange returned no access_token");
  return token.access_token;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const binding = findBinding(id);
  if (!binding) {
    return Response.json({ error: `unknown sheet binding: ${id}` }, { status: 404 });
  }

  const env = process.env as Env;
  if (!env.GOOGLE_SA_EMAIL || !env.GOOGLE_SA_PRIVATE_KEY || !env.GOOGLE_SHEETS_ID) {
    return Response.json(
      {
        configured: false,
        id: binding.id,
        label: binding.label,
        hint: "GOOGLE_SA_EMAIL, GOOGLE_SA_PRIVATE_KEY, GOOGLE_SHEETS_ID 를 설정하세요.",
      },
      { status: 503 },
    );
  }

  try {
    const token = await getAccessToken(env.GOOGLE_SA_EMAIL, env.GOOGLE_SA_PRIVATE_KEY);
    const url = new URL(
      `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEETS_ID}/values/${encodeURIComponent(binding.range)}`,
    );
    url.searchParams.set("valueRenderOption", "UNFORMATTED_VALUE");

    const sheet = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!sheet.ok) {
      return Response.json(
        { error: "sheets read failed", status: sheet.status, detail: await sheet.text() },
        { status: 502 },
      );
    }

    const payload = (await sheet.json()) as { values?: unknown[][] };
    const values = (payload.values ?? []).map((row) => row.map((cell) => String(cell ?? "")));
    const result = normalizeSheet(binding, values);

    return Response.json(
      { configured: true, label: binding.label, fetchedAt: new Date().toISOString(), ...result },
      { headers: { "cache-control": "private, max-age=60" } },
    );
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "unknown error" }, { status: 500 });
  }
}
