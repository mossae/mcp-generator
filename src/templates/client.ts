export const clientTemplate = `export interface RocketChatClient {
  get(path: string, params?: Record<string, unknown>): Promise<any>;
  post(path: string, body?: Record<string, unknown>): Promise<any>;
  put(path: string, body?: Record<string, unknown>): Promise<any>;
  delete(path: string, body?: Record<string, unknown>): Promise<any>;
  resolveRoom(nameOrId: string): Promise<{ _id: string; t: string }>;
}

export function createClient(): RocketChatClient {
  const baseUrl = process.env.RC_URL ?? "http://localhost:3000";
  const authToken = process.env.RC_AUTH_TOKEN ?? "";
  const userId = process.env.RC_USER_ID ?? "";

  const MAX_RETRIES = 3;
  const BASE_DELAY = 1000;

  async function request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const url = new URL(path, baseUrl);

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

      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        const delay = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : BASE_DELAY * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        lastError = new Error(\`Rate limited on \${method} \${path}\`);
        continue;
      }

      if (res.status >= 500 && attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
        lastError = new Error(\`Server error \${res.status} on \${method} \${path}\`);
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(\`RC API \${method} \${path} failed (\${res.status}): \${text}\`);
      }

      return res.json();
    }

    throw lastError ?? new Error(\`Failed after \${MAX_RETRIES} retries\`);
  }

  async function resolveRoom(nameOrId: string): Promise<{ _id: string; t: string }> {
    const byChannel = await request("GET", "/api/v1/channels.info", {
      roomName: nameOrId,
    }).catch(() => null);

    if (byChannel?.channel) {
      return { _id: byChannel.channel._id, t: "c" };
    }

    const byGroup = await request("GET", "/api/v1/groups.info", {
      roomName: nameOrId,
    }).catch(() => null);

    if (byGroup?.group) {
      return { _id: byGroup.group._id, t: "p" };
    }

    const byRoom = await request("GET", "/api/v1/rooms.info", {
      roomId: nameOrId,
    }).catch(() => null);

    if (byRoom?.room) {
      return { _id: byRoom.room._id, t: byRoom.room.t };
    }

    throw new Error(\`Room not found: \${nameOrId}\`);
  }

  return {
    get: (path, params) => request("GET", path, params),
    post: (path, body) => request("POST", path, body),
    put: (path, body) => request("PUT", path, body),
    delete: (path, body) => request("DELETE", path, body),
    resolveRoom,
  };
}
`;
