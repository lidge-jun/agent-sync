# agent-sync

> Sync MCP, skills, and AGENTS.md across **all** AI coding agents — one command.

Supports: **Claude Code** · **Codex CLI** · **Copilot** · **Gemini CLI** · **Antigravity** · **OpenCode**

All six agents are synced **simultaneously** with a single command — one config file, one run, all updated at once.

## Install

```bash
npm install -g @bitkyc08/agent-sync
```

## Usage

```bash
# Interactive wizard — guides you through prompt, skills, and MCP setup
agent-sync

# Individual commands
agent-sync mcp          # Sync MCP config globally (→ 6 CLIs)
agent-sync skills       # Sync skill symlinks in project
agent-sync agents       # Generate AGENTS.md in project
```

## What It Does

### 1. Custom Instructions (Project-level)
Auto-detects prompt files (`AGENTS.md`, `CLAUDE.md`, `COPILOT.md`, `CODEX.md`, `.agents/rules/*.md`, etc.) in your project.
Writes your unified instructions to **4 targets simultaneously**:

| Target | Path | Agent |
|--------|------|-------|
| `AGENTS.md` | project root | Codex / OpenCode |
| `CLAUDE.md` | project root | Claude Code |
| `copilot-instructions.md` | `.github/` | Copilot |
| `agent-sync.md` | `.agents/rules/` | Antigravity |

### 2. Skills Sync (Project-level)
Creates symlinks so all agents find the same skills:
```
.agent/skills/    ← source (real files)
.agents/skills/   → .agent/skills (symlink)
.claude/skills/   → .agent/skills (symlink)
```

### 3. MCP Config (Global)
One `~/.agent-sync/mcp.json` → synced to all CLI configs:

| Target | Path | Format |
|--------|------|--------|
| Claude Code | `~/.mcp.json` | JSON `mcpServers` |
| Codex | `~/.codex/config.toml` | TOML `[mcp_servers.*]` |
| Gemini CLI | `~/.gemini/settings.json` | JSON `mcpServers` |
| OpenCode | `~/.config/opencode/opencode.json` | JSON `mcp` |
| Copilot | `~/.copilot/mcp-config.json` | JSON `mcpServers` |
| Antigravity | `~/.gemini/antigravity/mcp_config.json` | JSON `mcpServers` |

## Config Location

```
~/.agent-sync/
├── mcp.json          # Unified MCP source of truth
└── backups/          # Auto-backups on conflict
```

## License

MIT
