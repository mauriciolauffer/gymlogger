export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("gymlogger_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  get: <T = any>(url: string) => apiFetch<T>(url, { method: "GET" }),
  post: <T = any>(url: string, body?: any) =>
    apiFetch<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(url: string, body?: any) =>
    apiFetch<T>(url, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(url: string) => apiFetch<T>(url, { method: "DELETE" }),
};
