# English Study → Obsidian (Google Drive)

한국어 입력을 영어로 번역·분석하고, Obsidian MD 저널에 누적 저장하는 워크플로입니다.

## 사용법

채팅에 한국어 문장·단어·표현을 입력하면 에이전트가:

1. 영어 번역
2. 핵심 어휘 분석 (빈도, 발음, 품사, 뉘앙스, 예문, 문법)
3. `english-study/journal/english-journal.md`에 추가
4. Google Drive MCP 연결 시 Drive의 Obsidian vault에도 동기화

## Google Drive 연결 (필수)

1. [Google Drive MCP 설정](https://developers.google.com/workspace/drive/api/guides/configure-mcp-server) 참고
2. `.env`에 OAuth 클라이언트 ID/Secret 설정
3. Cursor → MCP → `google-drive` **Authenticate**
4. Obsidian vault의 `English/english-journal.md` 경로를 `english-study/drive-config.json`에 맞게 수정

## 설정

`english-study/drive-config.json`:

| 필드 | 설명 |
|------|------|
| `journalFile` | 누적 저장할 MD 파일명 |
| `journalFolder` | Obsidian vault 내 폴더 |
| `driveParentFolderId` | (선택) Google Drive 폴더 ID |

## 로컬 백업

Drive 미연결 시에도 `english-study/journal/english-journal.md`에 계속 쌓입니다.
