# Agent-Sync — Source Structure & Function Reference

> 마지막 검증: 2026-02-27T21:55Z (**순환참조 수정 #1** 포함)
> src/ 6파일 2서브디렉토리 / tests 26 total · 26 pass · 0 skip
> v0.1.8: 순환참조 탐지 + 경로 비교 안전성 반영

---

## File Tree

```text
agent-sync/
├── src/
│   ├── cli.ts                ← 메인 CLI 진입점 + 마법사 + 인자 파싱 (328L)
│   ├── core/
│   │   ├── config.ts         ← AGENT_SYNC_HOME, SKILLS_DIR 전역 경로 (21L)
│   │   ├── symlink.ts        ← 안전 심볼릭 링크 생성 + 순환참조 탐지 (188L)
│   │   ├── skill-sync.ts     ← 스킬 소스 탐지 + 동기화 + resolved path 비교 (146L)
│   │   ├── mcp-sync.ts       ← MCP 설정 동기화 (6개 CLI 포맷)
│   │   └── agents-md.ts      ← AGENTS.md 심볼릭 링크
│   ├── utils/
│   │   └── log.ts            ← 로그 유틸
│   └── __tests__/
│       └── symlink.test.ts   ← 순환참조 탐지 + 안전 링크 + syncSkills 통합 (26개, 434L)
├── devlog/
│   ├── str_func/             ← 구조·함수 문서 (이 파일)
│   ├── _fin/                 ← 완료 아카이브
│   │   ├── 260227_initial_extraction.md
│   │   └── 260227_circular_symlink_debug_fin.md
│   └── _plan/                ← 계획/미착수
├── dist/                     ← tsc 빌드 결과
├── package.json              ← @bitkyc08/agent-sync v0.1.8
├── tsconfig.json             ← NodeNext, ES2022, strict
└── README.md
```

---

## 핵심 모듈

### `src/core/symlink.ts` (188L)

| 함수                       | 시그니처                                  | 설명                                                     |
| -------------------------- | ----------------------------------------- | -------------------------------------------------------- |
| `createBackupContext()`    | `(): BackupContext`                       | 일별 백업 디렉토리 컨텍스트                              |
| `resolveSymlinkTarget()`   | `(linkPath, rawTarget): string`           | 상대/절대 심볼릭 타겟 해석                               |
| **`wouldCreateCycle()`**   | `(target, linkPath): boolean`             | ELOOP-aware 순환참조 탐지 (chain walk + depth guard)     |
| `ensureSymlinkSafe()`      | `(target, linkPath, opts): SymlinkResult` | 안전 심볼릭 생성 (cycle guard + backup + skip + replace) |
| `createLinkWithFallback()` | `(target, linkPath): void`                | symlink → junction → copy 폴백                           |
| `copyDirRecursive()`       | `(src, dst)`                              | 재귀 복사 (broken symlink 무시)                          |

### `src/core/skill-sync.ts` (146L)

| 함수                   | 시그니처                             | 설명                                           |
| ---------------------- | ------------------------------------ | ---------------------------------------------- |
| `detectSkillSources()` | `(cwd): SkillCandidate[]`            | .agent/.agents/.claude/skills_ref 탐지 + dedup |
| **`safeRealPath()`**   | `(p): string`                        | ELOOP/ENOENT 안전 realpathSync                 |
| **`syncSkills()`**     | `(cwd, sourcePath): SkillSyncResult` | resolved path 비교로 3개 타겟 동기화           |
| `listSkills()`         | `(skillsDir): string[]`              | 스킬 디렉토리 목록 (dotfiles 제외)             |

---

## 의존성

런타임: 없음 (zero dependencies)
dev: `typescript` ^5.7 · `tsx` ^4.21 · `vitest` ^3.0 · `@types/node` ^22

---

## 테스트 매트릭스 (26/26 pass)

| Suite                  | Tests | 핵심 커버리지                                             |
| ---------------------- | ----- | --------------------------------------------------------- |
| `wouldCreateCycle`     | 7     | 직접 순환, 3-node, ELOOP, 자기참조                        |
| `ensureSymlinkSafe`    | 6     | 생성, skip, replace, **cycle block**, backup              |
| `resolveSymlinkTarget` | 2     | 절대/상대 경로                                            |
| `syncSkills`           | 4     | 정상 플로우, symlink-source skip, **인시던트 재현**, 엣지 |
| `detectSkillSources`   | 2     | 탐지, dedup                                               |
| `listSkills`           | 3     | 목록, 비존재, 필터                                        |
| `copyDirRecursive`     | 2     | 복사, broken symlink                                      |

---

## Devlog

**완료 아카이브** (`devlog/_fin/`): **260227_initial_extraction** (cli-jaw에서 sync 로직 추출), **260227_circular_symlink_debug** (✅ 순환참조 수정 — wouldCreateCycle + safeRealPath + 26 tests, [#1](https://github.com/lidge-jun/agent-sync/issues/1) closed)
