---
trigger: always_on
glob: 
description:you needto strictly follow the rules
---
# AGENTS.md — Project-Wide Agent Rules

> Single source of truth for all AI agents. Loaded every session. Keep it short.

## 1. Bootstrap

1. Read this file first. Follow every rule.
2. Read folder-level `AGENTS.md` when entering subdirectories (if exists).

## 2. Languaged

- `AGENTS.md` and `SKILL.md` **MUST be English**.
  - **Exempt**: proper nouns (Korean filenames, doc titles, tool names), YAML frontmatter trigger aliases, inline references to Korean docs.
  - Rule text, instructions, and explanations → English. Examples and references may include Korean proper nouns.
- All other docs and user-facing output follow project language conventions.
- Korean docs: **narrative-first** (prose what/why/how → `---` → technical reference). See `documentation` skill.
- **Tone**: Korean replies use friendly, cheerful tone (미소녀 말투). Be warm, encouraging, and add light emoji sparingly. Technical accuracy is still mandatory — cute tone ≠ dumbed-down content.

## 3. Search

- **Local first**: `grep`, `find`, `codebase_search` for code questions.
- **Built-in search**: `search_web`(Antigravity), `#web`(Copilot), `WebSearch`(Claude Code), `--search`(Codex).
- **Context7**: library docs only (`resolve-library-id` → `query-docs`).
- **Mandatory citation**: every search-sourced claim must have `> 출처: [title](URL)` immediately below the paragraph. Zero exceptions. No citation = unverified.
- **Fact verification**: high-risk claims (pricing, plan tiers, versions, compatibility) require **2+ independent sources**. Process: SEARCH → DOUBT → SEARCH AGAIN → COMPARE. Prefer official docs over community posts.
- **Comparison scale**: use **MLB 20-80 scouting scale** when rating tools, models, or providers. 20=worst, 50=average, 60=plus, 70=plus-plus, 80=elite. Present as table with per-category grades.
- **RAG search language**: code RAG → English query, doc RAG → user's language.
- See `search` skill for full decision flow.

## 4. Do / Don't

### Do

- Keep edits focused — one logical change per commit
- Validate output before committing (build, lint, test)
- Ask clarifying questions when ambiguous
- Use existing patterns before inventing new ones
- Log decisions in `001_ai-agents/00-개요.md`.

### Don't

- Make unrelated file changes
- Hardcode secrets or API keys
- Add dependencies without approval
- Assume training data is current — **always search**
- Use placeholders when real assets can be created

## 5. Git

- **ALL commits use `[agent]` prefix** — no exceptions, including checkpoints: `[agent] chore: checkpoint {description}`
- **Commit format**: `[agent] {type}: {description}`. Types: feat|fix|refactor|docs|test|chore
- **NEVER auto-run**: `git push`, `git checkout`, `rm -rf`, `git reset --hard`, `git clean`, `sudo`
- **Branch**: agents work on `agent` branch ONLY. **Do not use `dev` for the parent repository.**
- **Never commit to `main`.** Main is user-managed.
- **Parent repository push is forbidden**: never push root repo (`new`) to any remote. Push is allowed only inside explicitly requested submodules.
- **Check existing branches first** (`git branch -v`) before creating new ones.
- **No proactive git actions**: do NOT commit, branch, or checkpoint without user requesting it.
- **Submodules**: forks live in `700_projects/` as submodules. Inner changes require 2-step commit (submodule → parent ref update).
- See `git` skill for full workflow.

## 6. Project Structure

```
root/
├── AGENTS.md              ← this file
├── CLAUDE.md              → symlink to AGENTS.md
├── .mcp.json              ← empty (MCP is global-only, iCloud compat)
├── .{agent,agents,claude,codex,gemini}/  ← agent configs (symlinked)
├── _INBOX/                ← unsorted quick capture
├── 000_origin/            ← project background
├── 100_notetaking/        ← notetaking guides
├── 001_ai-agents/         ← agent setup docs
├── 200_journal/           ← daily notes
├── 700_projects/          ← forked repos (git submodules)
└── {dir}/AGENTS.md        ← folder overrides
```

- `snake_case` dirs, `NNN_` prefix for ordering
- Every dir: `AGENTS.md` (default ≤5 lines; grows with project scope). Every non-dot dir: `_legacy/`. See `folder-init` skill.

## 7. MCP

- **MCP Tax**: registered tools consume tokens every request even if unused. Keep MCP minimal.
- **Global-only strategy**: MCP servers are configured in **global (user-level) configs only**, not in project `.mcp.json`.
  - iCloud Drive path causes JSON parse failures in Claude Code. Project `.mcp.json` is kept empty.
- Active servers: **context7**, **semantic-code-mcp** (code RAG, Gemini), **markdown-rag** (doc RAG, Gemini).
  - `semantic-code-mcp`: code RAG (incremental indexing, Milvus vector store)
  - `markdown-rag`: doc RAG (`.md` only by design)
  - Ignore patterns: use `**/` prefix for nested dirs (e.g. `**/.venv/**`)
- **Destructive index operations are forbidden by default** (both MCPs):
  - `semantic-code-mcp`: do NOT run `b_index_codebase(force=true)` and do NOT run `c_clear_cache` unless the user explicitly requests a full rebuild/reset in the same turn.
  - `markdown-rag`: do NOT run `index_documents(force_reindex=true)` and do NOT run `clear_index` unless the user explicitly requests a full rebuild/reset in the same turn.
  - Default policy: use incremental operations only (`force=false`, `force_reindex=false`).
  - For full rebuild (`--force`), use **shell reindex** instead of MCP tools. See `rag` skill.
- **`markdown-rag` MUST always use `recursive=true`**. Never set `recursive=false` — it skips all subdirectories.
- **`markdown-rag` workspace is locked** via `MARKDOWN_WORKSPACE` env. Agent-supplied `cwd`/`directory` are ignored. Scoped pruning prevents subdirectory indexing from wiping unrelated tracking data.
- **No spam-polling**: after triggering indexing, do productive work and poll once after ~30s. See `rag` skill.
- Global config locations:
  - Claude Code: `~/.claude.json` → `mcpServers`
  - Antigravity: `~/.gemini/antigravity/mcp_config.json`
  - Codex: `~/.codex/config.toml` → `[mcp_servers.*]`
  - Copilot: VS Code MCP Autodiscovery (reads `~/.claude.json`) or User Settings
- Never hardcode secrets — use `${ENV_VAR}` references. (**Exception**: Antigravity does not expand `${VAR}`; hardcode keys in `mcp_config.json` only.)
- Details: `001_ai-agents/02-MCP-설정-호환성.md`

## 8. Skills

Skills live in `.agents/skills/{name}/SKILL.md` — one skill per folder. `.agent/skills` is a symlink.

- `folder-init`: auto-scaffold new dirs with `AGENTS.md` + `_legacy/`
- `documentation`: Korean narrative-first doc style
- `doc-sort`: classify `_INBOX` files into `300_permanent/` with full content analysis + RAG search
- `git`: version control workflow
- `search`: web/code search strategy
- `rag`: RAG indexing & search (code/doc separation, tool calls)
- `mcp-config`: locate, compare, and sync MCP configs across agents

## 9. Sub-agents

- Use sub-agents for **noisy or parallel** tasks: multi-dir exploration, browser testing, large file analysis.
- **Do NOT** use sub-agents for sequential tasks that need prior context.
- Give clear, self-contained instructions: what to do + what to return.
- Minimize context sent — only pass what the sub-agent actually needs.
- Sub-agents **cannot spawn sub-agents** (1 level only, all IDEs).
- Each sub-agent has its own context window = **separate token cost**. Don't over-split.
- Details: `001_ai-agents/08-서브에이전트-활용.md`

```yaml
# Skill Title
## Goal       ← 1–2 sentences
## Instructions ← imperative steps
## Constraints  ← boundaries
```

- **≤ 500 lines** in `SKILL.md`; bulk content → `reference/`, `scripts/`
- Use `kebab-case` folder names, descriptive file names
- Test all scripts before packaging
- Review quarterly; delete unused skills

## 10. Compact Instructions

When compacting context, always preserve:

- Current task checklist and in-progress items
- List of files modified in this session
- Project rules: commit format, MCP policy, NEVER auto-run list
- Korean doc conventions: `NNN_name` dirs, narrative-first style, `> 출처:` citations
- Active branch name and last checkpoint commit hash

## 11. Maintenance

- Review this file monthly or when adding tools/frameworks
- **Target**: ≤ 120 lines. If a rule needs a paragraph, move it to a doc in `001_ai-agents/`.