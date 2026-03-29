export const clientTemplate = `export interface RocketChatClient {
  get(path: string, params?: Record<string, unknown>): Promise<any>;
  post(path: string, body?: Record<string, unknown>): Promise<any>;
  put(path: string, body?: Record<string, unknown>): Promise<any>;
  delete(path: string, body?: Record<string, unknown>): Promise<any>;
}

export function createClient(): RocketChatClient {
  const baseUrl = process.env.RC_URL ?? "http://localhost:3000";
  const authToken = process.env.RC_AUTH_TOKEN ?? "";
  const userId = process.env.RC_USER_ID ?? "";

  async function request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<any> {
    const url = new URL(path, baseUrl);

    // For GET requests, append params as query string
    if (method === "GET" && body) {
      for (const [key, value] of Object.entries(body)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const res = await fetch(url.toString(), {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": authToken,
        "X-User-Id": userId,
      },
      body: method !== "GET" && body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(\`RC API \${method} \${path} failed (\${res.status}): \${text}\`);
    }

    return res.json();
  }

  return {
    get: (path, params) => request("GET", path, params),
    post: (path, body) => request("POST", path, body),
    put: (path, body) => request("PUT", path, body),
    delete: (path, body) => request("DELETE", path, body),
  };
}
`;
