# AGENTS.md

KakaoTalk MCP server — a stdio [MCP](https://modelcontextprotocol.io) server
(TypeScript/Node, ESM) that sends KakaoTalk messages via the Kakao API.

- Source: `src/` (`index.ts` entry, `kakao.ts` API client, `server.ts` tools, `config.ts` env loading).
- Tests: `test/` (Vitest). `test/mockKakaoServer.ts` is an in-process mock of the Kakao API.
- Commands are in `package.json` scripts: `build`, `dev`, `start`, `lint`, `typecheck`, `test`.

## Cursor Cloud specific instructions

- Node 22 is available. Install deps with `npm install` (already handled by the startup update script).
- Run the full checks with `npm run lint`, `npm test`, and `npm run build`. Tests use an in-process mock Kakao API, so they need **no real credentials and no network access**.
- The server talks MCP over **stdio**: `stdout` is the protocol channel, so all human/log output must go to `stderr` (the code already does this). Do not add `console.log` to `stdout` in `src/`.
- Running `node dist/index.js` (or `npm run dev`) with no Kakao credentials is expected to start fine but every tool call returns a `KakaoConfigError` result until `KAKAO_REST_API_KEY` + `KAKAO_REFRESH_TOKEN` (or `KAKAO_ACCESS_TOKEN`) are set.
- To exercise the server end-to-end without real Kakao credentials, point it at a mock by setting `KAKAO_API_BASE_URL` and `KAKAO_AUTH_BASE_URL` to a local HTTP server (this is how `test/mcp.test.ts` and the manual demo validate it). Real message sending requires a Kakao Developers app with the `talk_message` scope and a valid refresh token.
- ESM + NodeNext: intra-package imports use `.js` extensions in `.ts` files (e.g. `./kakao.js`). Keep this convention or `tsc`/runtime resolution breaks. Vitest resolves these correctly.
