import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { KakaoApiError, KakaoConfigError, type KakaoClient } from "./kakao.js";

const linkShape = {
  webUrl: z.string().url().optional().describe("Web URL opened when the message is tapped on desktop."),
  mobileWebUrl: z.string().url().optional().describe("Web URL opened when the message is tapped on mobile."),
};

function toToolError(err: unknown): { content: Array<{ type: "text"; text: string }>; isError: true } {
  let text: string;
  if (err instanceof KakaoConfigError) {
    text = `Configuration error: ${err.message}`;
  } else if (err instanceof KakaoApiError) {
    text = `Kakao API error (HTTP ${err.status}): ${err.message}\n${JSON.stringify(err.body, null, 2)}`;
  } else if (err instanceof Error) {
    text = `Unexpected error: ${err.message}`;
  } else {
    text = `Unexpected error: ${String(err)}`;
  }
  return { content: [{ type: "text", text }], isError: true };
}

function ok(text: string, data?: unknown): { content: Array<{ type: "text"; text: string }> } {
  const suffix = data === undefined ? "" : `\n${JSON.stringify(data, null, 2)}`;
  return { content: [{ type: "text", text: `${text}${suffix}` }] };
}

/** Create the KakaoTalk MCP server wired to the given client. */
export function createServer(client: KakaoClient): McpServer {
  const server = new McpServer({
    name: "kakao-talk-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "send_kakao_memo",
    {
      title: "Send KakaoTalk message to myself",
      description:
        "Send a text message to your own KakaoTalk chat (Kakao '나에게 보내기' / send-to-me). " +
        "Use this to deliver notifications or automated messages to the authenticated account.",
      inputSchema: {
        message: z.string().min(1).max(200).describe("The message text to send (max 200 characters)."),
        buttonTitle: z.string().optional().describe("Optional label for the message's link button."),
        ...linkShape,
      },
    },
    async ({ message, buttonTitle, webUrl, mobileWebUrl }) => {
      try {
        const result = await client.sendMemo({
          text: message,
          buttonTitle,
          link: webUrl || mobileWebUrl ? { webUrl, mobileWebUrl } : undefined,
        });
        return ok("KakaoTalk message sent to yourself.", result);
      } catch (err) {
        return toToolError(err);
      }
    },
  );

  server.registerTool(
    "send_kakao_message_to_friends",
    {
      title: "Send KakaoTalk message to friends",
      description:
        "Send a text message to one or more KakaoTalk friends identified by their uuids. " +
        "Use list_kakao_friends first to obtain the uuids. Recipients must have authorized the app.",
      inputSchema: {
        receiverUuids: z
          .array(z.string().min(1))
          .min(1)
          .describe("List of friend uuids to send the message to (from list_kakao_friends)."),
        message: z.string().min(1).max(200).describe("The message text to send (max 200 characters)."),
        buttonTitle: z.string().optional().describe("Optional label for the message's link button."),
        ...linkShape,
      },
    },
    async ({ receiverUuids, message, buttonTitle, webUrl, mobileWebUrl }) => {
      try {
        const result = await client.sendToFriends({
          receiverUuids,
          text: message,
          buttonTitle,
          link: webUrl || mobileWebUrl ? { webUrl, mobileWebUrl } : undefined,
        });
        return ok(`KakaoTalk message sent to ${receiverUuids.length} friend(s).`, result);
      } catch (err) {
        return toToolError(err);
      }
    },
  );

  server.registerTool(
    "list_kakao_friends",
    {
      title: "List KakaoTalk friends",
      description:
        "List the authenticated user's KakaoTalk friends (that have authorized this app), returning their uuids " +
        "for use with send_kakao_message_to_friends.",
      inputSchema: {
        offset: z.number().int().min(0).optional().describe("Pagination offset."),
        limit: z.number().int().min(1).max(100).optional().describe("Max number of friends to return (1-100)."),
      },
    },
    async ({ offset, limit }) => {
      try {
        const { friends, total } = await client.listFriends({ offset, limit });
        return ok(`Found ${friends.length} friend(s) (total ${total}).`, friends);
      } catch (err) {
        return toToolError(err);
      }
    },
  );

  return server;
}
