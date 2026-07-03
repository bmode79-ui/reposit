#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfigFromEnv } from "./config.js";
import { KakaoClient } from "./kakao.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfigFromEnv();
  const client = new KakaoClient(config);

  if (!client.hasCredentials()) {
    // Warn on stderr (never stdout: stdout is the MCP transport channel).
    console.error(
      "[kakao-talk-mcp] Warning: no Kakao credentials found. Set KAKAO_ACCESS_TOKEN, or " +
        "KAKAO_REFRESH_TOKEN + KAKAO_REST_API_KEY. Tools will return an error until configured.",
    );
  }

  const server = createServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[kakao-talk-mcp] server started on stdio.");
}

main().catch((err) => {
  console.error("[kakao-talk-mcp] fatal error:", err);
  process.exit(1);
});
