# agent-sync

> Sync MCP, skills, and AGENTS.md across **all** AI coding agents — one command.

Supports: **Claude Code** · **Codex** · **Copilot** · **Gemini CLI** · **Antigravity** · **OpenCode**

## Install

```bash
npm install -g agent-sync
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

### 1. AGENTS.md (Project-level)
Auto-detects prompt files (`AGENTS.md`, `CLAUDE.md`, `COPILOT.md`, etc.) in your project.
Writes a unified `AGENTS.md` that Codex, Copilot, and OpenCode discover automatically.

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
