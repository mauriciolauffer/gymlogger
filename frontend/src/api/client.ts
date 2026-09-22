import { hc } from "hono/client";
import type { AppType } from "../../../backend/src/index";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("gymlogger_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Type computed once at compile time; hcWithType avoids re-instantiation in tsserver
const typeClient = hc<AppType>("");
export type Client = typeof typeClient;

export const hcWithType = (...args: Parameters<typeof hc>): Client => hc<AppType>(...args);

export const client = hcWithType("/", { headers: () => authHeaders() });
