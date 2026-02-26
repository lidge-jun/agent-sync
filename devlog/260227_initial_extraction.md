# 260227 — Initial Extraction from cli-jaw

## Goal
Extract sync logic from `cli-jaw/lib/mcp-sync.ts` (778L) into standalone `agent-sync` CLI.

## Source Mapping

| agent-sync | cli-jaw source | What |
|---|---|---|
| `src/core/mcp-sync.ts` | `lib/mcp-sync.ts:39-236` | `loadUnifiedMcp`, `syncToAll`, format converters |
| `src/core/skill-sync.ts` | `lib/mcp-sync.ts:240-305` | `ensureSkillsSymlinks` → project-scoped |
| `src/core/symlink.ts` | `lib/mcp-sync.ts:307-408,756-778` | `ensureSymlinkSafe`, backup, `copyDirRecursive` |
| `src/core/agents-md.ts` | `src/prompt/builder.ts:568-584` | `regenerateB` → template-based |
| `src/core/config.ts` | `lib/mcp-sync.ts:1-26` | `JAW_HOME` → `AGENT_SYNC_HOME` |

## Key Differences from cli-jaw

1. **No server dependency** — pure CLI, no Express/WS
2. **No runtime data** — no SQLite, no settings.json
3. **Skills = project-level** — symlinks within cwd only, no `~/.cli-jaw/skills`
4. **MCP = global** — `~/.agent-sync/mcp.json` as source of truth
5. **Interactive wizard** — auto-detect → select → fallback, not config-driven

## Wizard Flow

```
agent-sync
│
├─ Step 1/3: AGENTS.md (Prompt File)
│  ├─ Detected: 1) AGENTS.md (4KB)  2) cli-jaw/AGENTS.md (12KB)  3) NONE
│  ├─ Select prompt source [1-3]: 1
│  └─ ✔ Written: ./AGENTS.md
│
├─ Step 2/3: Skills Sync
│  ├─ Detected: 1) .agent/skills (17 skills)  2) cli-jaw/skills_ref (110 skills)  3) NONE
│  ├─ Select skill source [1-3]: 1
│  ├─ Syncing...
│  ├─ ✔ agents_skills: .agents/skills → .agent/skills
│  ├─ ✔ claude_skills: .claude/skills → .agent/skills
│  └─ ℹ Active skills: browser, dev, dev-backend, ...
│
├─ Step 3/3: MCP Config Sync (Global)
│  ├─ Detected: 1) Claude (3 servers) ~/.mcp.json  2) NONE
│  ├─ Select MCP source [1-2]: 1
│  ├─ ✔ Imported to ~/.agent-sync/mcp.json
│  ├─ Syncing to all CLIs...
│  ├─ ✔ Claude: ~/.mcp.json
│  ├─ ✔ Codex: ~/.codex/config.toml
│  ├─ ✔ Gemini: ~/.gemini/settings.json
│  ├─ ✔ Copilot: ~/.copilot/mcp-config.json
│  ├─ ✔ Antigravity: ~/.gemini/antigravity/mcp_config.json
│  └─ ℹ Synced to 5/6 CLIs.
│
└─ ✔ All done! Your agent configs are synced.
```

## TODO

- [ ] `npm install` deps
- [ ] TypeScript 컴파일 검증
- [ ] `tsx src/cli.ts` 로컬 테스트
- [ ] `npm run dev` 인터랙티브 흐름 확인
- [ ] unit tests (mcp format conversion, symlink logic)
- [ ] README.md 작성
- [ ] GitHub repo 생성 + 첫 커밋
- [ ] npm publish 준비
