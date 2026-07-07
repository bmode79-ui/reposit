# English Study → Obsidian (Google Drive)

한국어 입력을 영어로 번역·분석하고, **마인드맵형 폴더 구조**의 Obsidian MD로 Google Drive에 저장합니다.

## Drive 폴더

https://drive.google.com/drive/folders/1iJyx9sVEKlUwsKkj-RUDZd1a3-2oe1NF

## 마인드맵 구조

```
English-Study/
├── INDEX.md                 ← 마인드맵 허브
├── 01-Expressions/          표현 (한국어 제목.md)
├── 02-Vocabulary/{Topic}/     단어 (영어 제목.md)
├── 03-Topics/               주제 허브 (wikilink)
└── 04-Grammar/              문법
```

## 사용법

채팅에 한국어 문장을 입력 → 분석 → MD 파일 생성 (태그 다수 포함) → Drive 업로드

## 로컬 미러

`english-study/vault/English-Study/` — Drive와 동일 구조

## Google Drive 연결

1. `.env`에 OAuth 클라이언트 설정
2. Cursor → MCP → `google-drive` → **Authenticate**
3. 에이전트가 `create_file`로 폴더·MD 업로드

## 설정

`english-study/drive-config.json` — `driveRootFolderId` 포함
