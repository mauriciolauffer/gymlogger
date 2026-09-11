export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("gymlogger_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(endpoint, { ...options, headers });
  } catch (err) {
    throw new Error(`Network error: ${err instanceof Error ? err.message : String(err)}`, {
      cause: err,
    });
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const err = data as Record<string, unknown>;
    throw new Error(
      typeof err.error === "string"
        ? err.error
        : typeof err.message === "string"
          ? err.message
          : `Request failed with status ${response.status}`,
    );
  }

  return data as T;
}

export const api = {
  get: <T = unknown>(url: string) => apiFetch<T>(url, { method: "GET" }),
  post: <T = unknown>(url: string, body?: unknown) =>
    apiFetch<T>(url, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T = unknown>(url: string, body?: unknown) =>
    apiFetch<T>(url, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T = unknown>(url: string) => apiFetch<T>(url, { method: "DELETE" }),
};
