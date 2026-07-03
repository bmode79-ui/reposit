import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { KakaoClient } from "../src/kakao.js";
import { createServer } from "../src/server.js";
import { startMockKakaoServer, type MockKakaoServer } from "./mockKakaoServer.js";

describe("KakaoTalk MCP server", () => {
  let mock: MockKakaoServer;
  let client: Client;

  beforeEach(async () => {
    mock = await startMockKakaoServer();
    const kakao = new KakaoClient({
      restApiKey: "test-rest-key",
      refreshToken: "test-refresh-token",
      apiBaseUrl: mock.apiBaseUrl,
      authBaseUrl: mock.authBaseUrl,
    });
    const server = createServer(kakao);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: "test-client", version: "1.0.0" });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  });

  afterEach(async () => {
    await client.close();
    await mock.close();
  });

  it("exposes the three KakaoTalk tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(["list_kakao_friends", "send_kakao_memo", "send_kakao_message_to_friends"]);
  });

  it("sends a memo through the send_kakao_memo tool", async () => {
    const res = await client.callTool({
      name: "send_kakao_memo",
      arguments: { message: "Hello from MCP!" },
    });
    expect(res.isError).toBeFalsy();
    const text = (res.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("KakaoTalk message sent to yourself.");

    const sendReq = mock.requests.find((r) => r.url.startsWith("/v2/api/talk/memo"));
    expect(JSON.parse(sendReq!.params.template_object).text).toBe("Hello from MCP!");
  });

  it("lists friends through the list_kakao_friends tool", async () => {
    const res = await client.callTool({ name: "list_kakao_friends", arguments: {} });
    expect(res.isError).toBeFalsy();
    const text = (res.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Found 2 friend(s)");
    expect(text).toContain("uuid-1");
  });

  it("returns a validation error result when arguments are invalid", async () => {
    const res = await client.callTool({ name: "send_kakao_memo", arguments: { message: "" } });
    expect(res.isError).toBe(true);
    const text = (res.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("validation error");
    // An invalid request must never reach the Kakao API.
    expect(mock.requests.some((r) => r.url.startsWith("/v2/api/talk/memo"))).toBe(false);
  });
});
