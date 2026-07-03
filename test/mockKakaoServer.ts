import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { AddressInfo } from "node:net";

export interface RecordedRequest {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body: string;
  params: Record<string, string>;
}

export interface MockKakaoServer {
  apiBaseUrl: string;
  authBaseUrl: string;
  requests: RecordedRequest[];
  /** Force the next memo/friends send to respond 401 once (to test refresh+retry). */
  failNextWithUnauthorized: () => void;
  close: () => Promise<void>;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
  });
}

function parseForm(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(body)) params[k] = v;
  return params;
}

/**
 * Start an in-process HTTP server that emulates the subset of the Kakao API
 * used by KakaoClient. Returns base URLs and the list of recorded requests.
 */
export async function startMockKakaoServer(): Promise<MockKakaoServer> {
  const requests: RecordedRequest[] = [];
  let unauthorizedOnce = false;

  const server: Server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const body = await readBody(req);
    const url = req.url ?? "";
    const params = parseForm(body);
    requests.push({ method: req.method ?? "", url, headers: req.headers, body, params });

    const send = (status: number, payload: unknown): void => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(payload));
    };

    // Token refresh endpoint.
    if (url.startsWith("/oauth/token")) {
      if (params.grant_type === "refresh_token" && params.refresh_token && params.client_id) {
        return send(200, { access_token: "fresh-access-token", token_type: "bearer", expires_in: 21600 });
      }
      return send(400, { error: "invalid_grant", error_description: "bad refresh params" });
    }

    const auth = req.headers["authorization"];
    if (unauthorizedOnce) {
      unauthorizedOnce = false;
      return send(401, { code: -401, msg: "this access token does not exist" });
    }
    if (!auth || !String(auth).startsWith("Bearer ")) {
      return send(401, { code: -401, msg: "missing token" });
    }

    if (url.startsWith("/v2/api/talk/memo/default/send")) {
      return send(200, { result_code: 0 });
    }
    if (url.startsWith("/v1/api/talk/friends/message/default/send")) {
      return send(200, { successful_receiver_uuids: ["uuid-1"] });
    }
    if (url.startsWith("/v1/api/talk/friends")) {
      return send(200, {
        elements: [
          { uuid: "uuid-1", profile_nickname: "Alice", favorite: true },
          { uuid: "uuid-2", profile_nickname: "Bob", favorite: false },
        ],
        total_count: 2,
      });
    }
    return send(404, { code: -404, msg: "not found" });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;

  return {
    apiBaseUrl: base,
    authBaseUrl: base,
    requests,
    failNextWithUnauthorized: () => {
      unauthorizedOnce = true;
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
