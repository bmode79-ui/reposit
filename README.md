# KakaoTalk MCP (카카오톡 자동 메세지 전달 MCP)

An [MCP](https://modelcontextprotocol.io) server that lets an AI assistant send
KakaoTalk (카카오톡) messages automatically via the official Kakao API.

It exposes three tools:

| Tool | 설명 | Kakao API |
| --- | --- | --- |
| `send_kakao_memo` | 나에게 메세지 보내기 (send a message to yourself) | `v2/api/talk/memo/default/send` |
| `send_kakao_message_to_friends` | 친구에게 메세지 보내기 (send to friends by uuid) | `v1/api/talk/friends/message/default/send` |
| `list_kakao_friends` | 친구 목록 조회 (list friends + uuids) | `v1/api/talk/friends` |

The server manages the OAuth access token lifecycle: given a refresh token and
REST API key it automatically refreshes the access token (which expires every
~6 hours) and retries once on a `401`.

## Prerequisites: Kakao credentials

You need a [Kakao Developers](https://developers.kakao.com) application with the
**카카오톡 메시지 (KakaoTalk Message)** product enabled and the relevant scopes
(`talk_message`, and `friends` if you want to message friends).

1. Create an app and note the **REST API key** (`KAKAO_REST_API_KEY`).
2. Run the OAuth authorization flow (Authorization Code grant) to obtain a
   **refresh token** (`KAKAO_REFRESH_TOKEN`) for the account that will send
   messages. See the Kakao Login docs for the token endpoint.
3. Alternatively, supply a short-lived `KAKAO_ACCESS_TOKEN` directly (it will be
   used until it expires; with a refresh token it is renewed automatically).

Copy `.env.example` and fill in the values, or provide them as environment
variables directly in your MCP client config.

## Install & build

```bash
npm install
npm run build
```

## Run

```bash
# after building
KAKAO_REST_API_KEY=... KAKAO_REFRESH_TOKEN=... node dist/index.js

# or, in watch/dev mode (no build step needed)
KAKAO_REST_API_KEY=... KAKAO_REFRESH_TOKEN=... npm run dev
```

The server communicates over **stdio**, so it is meant to be launched by an MCP
client rather than used interactively. `stdout` is reserved for the MCP protocol;
all logging goes to `stderr`.

## Using it from an MCP client

Example client configuration (e.g. Cursor / Claude Desktop `mcp.json`):

```json
{
  "mcpServers": {
    "kakao-talk": {
      "command": "node",
      "args": ["/absolute/path/to/dist/index.js"],
      "env": {
        "KAKAO_REST_API_KEY": "your-rest-api-key",
        "KAKAO_REFRESH_TOKEN": "your-refresh-token"
      }
    }
  }
}
```

Then ask the assistant to, e.g., "send me a KakaoTalk message that says the
build finished" and it will call `send_kakao_memo`.

## Development

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest (unit + MCP integration against a mock Kakao API)
npm run build       # emit dist/
```

The test suite runs an in-process mock of the Kakao API, so no real credentials
or network access are required.
