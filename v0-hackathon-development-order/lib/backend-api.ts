export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:4000";

export async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  // Directly point to the Express backend
  const url = path.startsWith("http") ? path : `${BACKEND_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    // Try to surface { error: "..."} responses cleanly.
    let message = `Request failed: ${res.status}`;
    try {
      const data = (await res.json()) as unknown;
      if (data && typeof data === "object" && "error" in data) {
        const err = (data as { error?: unknown }).error;
        if (typeof err === "string" && err.trim()) message = err;
        else message = JSON.stringify(data);
      } else {
        message = JSON.stringify(data);
      }
    } catch {
      try {
        const text = await res.text();
        if (text?.trim()) message = text;
      } catch {
        // ignore
      }
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

