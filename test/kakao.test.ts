import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { KakaoClient, KakaoConfigError } from "../src/kakao.js";
import { startMockKakaoServer, type MockKakaoServer } from "./mockKakaoServer.js";

describe("KakaoClient", () => {
  let mock: MockKakaoServer;

  beforeEach(async () => {
    mock = await startMockKakaoServer();
  });

  afterEach(async () => {
    await mock.close();
  });

  function makeClient(overrides = {}) {
    return new KakaoClient({
      restApiKey: "test-rest-key",
      refreshToken: "test-refresh-token",
      apiBaseUrl: mock.apiBaseUrl,
      authBaseUrl: mock.authBaseUrl,
      ...overrides,
    });
  }

  it("refreshes an access token before sending a memo", async () => {
    const client = makeClient();
    const result = await client.sendMemo({ text: "hello world" });
    expect(result).toEqual({ result_code: 0 });

    const tokenReq = mock.requests.find((r) => r.url.startsWith("/oauth/token"));
    expect(tokenReq?.params.grant_type).toBe("refresh_token");

    const sendReq = mock.requests.find((r) => r.url.startsWith("/v2/api/talk/memo"));
    expect(sendReq?.headers["authorization"]).toBe("Bearer fresh-access-token");
    const template = JSON.parse(sendReq!.params.template_object);
    expect(template).toMatchObject({ object_type: "text", text: "hello world" });
  });

  it("sends a message to friends with receiver uuids", async () => {
    const client = makeClient();
    const result = await client.sendToFriends({ receiverUuids: ["uuid-1"], text: "hi friend" });
    expect(result).toEqual({ successful_receiver_uuids: ["uuid-1"] });

    const sendReq = mock.requests.find((r) => r.url.startsWith("/v1/api/talk/friends/message"));
    expect(JSON.parse(sendReq!.params.receiver_uuids)).toEqual(["uuid-1"]);
  });

  it("lists friends and maps fields", async () => {
    const client = makeClient();
    const { friends, total } = await client.listFriends();
    expect(total).toBe(2);
    expect(friends[0]).toEqual({ uuid: "uuid-1", profileNickname: "Alice", favorite: true });
  });

  it("refreshes and retries once on a 401 response", async () => {
    const client = makeClient({ accessToken: "stale-token" });
    mock.failNextWithUnauthorized();
    const result = await client.sendMemo({ text: "retry me" });
    expect(result).toEqual({ result_code: 0 });
    // The successful retry must have used a freshly refreshed token.
    const sendReqs = mock.requests.filter((r) => r.url.startsWith("/v2/api/talk/memo"));
    expect(sendReqs.at(-1)?.headers["authorization"]).toBe("Bearer fresh-access-token");
  });

  it("throws a config error when no credentials are provided", async () => {
    const client = new KakaoClient({
      apiBaseUrl: mock.apiBaseUrl,
      authBaseUrl: mock.authBaseUrl,
    });
    expect(client.hasCredentials()).toBe(false);
    await expect(client.sendMemo({ text: "nope" })).rejects.toBeInstanceOf(KakaoConfigError);
  });

  it("rejects sending to an empty friend list", async () => {
    const client = makeClient();
    await expect(client.sendToFriends({ receiverUuids: [], text: "x" })).rejects.toBeInstanceOf(KakaoConfigError);
  });
});
