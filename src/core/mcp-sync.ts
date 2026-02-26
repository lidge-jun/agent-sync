/**
 * core/mcp-sync.ts — MCP config sync to all AI coding CLIs (global)
 * Extracted from cli-jaw lib/mcp-sync.ts
 *
 * Source of truth: ~/.agent-sync/mcp.json
 * Targets (all global):
 *   Claude Code   → ~/.mcp.json                          (JSON, mcpServers)
 *   Codex         → ~/.codex/config.toml                  (TOML, [mcp_servers.*])
 *   Gemini CLI    → ~/.gemini/settings.json               (JSON, mcpServers)
 *   OpenCode      → ~/.config/opencode/opencode.json      (JSON, mcp)
 *   Copilot       → ~/.copilot/mcp-config.json            (JSON, mcpServers)
 *   Antigravity   → ~/.gemini/antigravity/mcp_config.json (JSON, mcpServers)
 */
import fs from 'node:fs';
import { join, dirname } from 'node:path';
import os from 'node:os';
import { MCP_PATH, ensureHome } from './config.js';
import { log } from '../utils/log.js';

const HOME = os.homedir();

// ─── Load / Save ──────────────────────────────────

export function loadMcpConfig(): Record<string, any> {
    try {
        return JSON.parse(fs.readFileSync(MCP_PATH, 'utf8'));
    } catch {
        return { servers: {} };
    }
}

export function saveMcpConfig(config: Record<string, any>) {
    ensureHome();
    fs.writeFileSync(MCP_PATH, JSON.stringify(config, null, 4) + '\n');
}

// ─── Format converters ────────────────────────────

function toClaudeMcp(config: Record<string, any>) {
    const servers = config.servers || {};
    const result: Record<string, any> = {};
    for (const [name, srv] of Object.entries(servers) as [string, any][]) {
        result[name] = { command: srv.command, args: srv.args || [] };
        if (srv.env) result[name].env = srv.env;
    }
    return { mcpServers: result };
}

function toCodexToml(config: Record<string, any>) {
    const servers = config.servers || {};
    let toml = '';
    for (const [name, srv] of Object.entries(servers) as [string, any][]) {
        toml += `[mcp_servers.${name}]\n`;
        toml += `command = "${srv.command}"\n`;
        if (srv.args?.length) {
            toml += `args = [${srv.args.map((a: string) => `"${a}"`).join(', ')}]\n`;
        }
        if (srv.env) {
            toml += `[mcp_servers.${name}.env]\n`;
            for (const [k, v] of Object.entries(srv.env)) {
                toml += `${k} = "${v}"\n`;
            }
        }
        toml += '\n';
    }
    return toml;
}

function toOpenCodeMcp(config: Record<string, any>) {
    const servers = config.servers || {};
    const result: Record<string, any> = {};
    for (const [name, srv] of Object.entries(servers) as [string, any][]) {
        result[name] = { command: srv.command, args: srv.args || [] };
        if (srv.env) result[name].env = srv.env;
    }
    return result;
}

function patchCodexToml(existingToml: string, newMcpToml: string): string {
    // Remove existing [mcp_servers.*] blocks
    const cleaned = existingToml.replace(
        /\[mcp_servers\.[^\]]+\][\s\S]*?(?=\n\[(?!mcp_servers)|$)/g,
        '',
    ).trimEnd();
    return cleaned + '\n\n' + newMcpToml;
}

function patchJsonFile(filePath: string, patchObj: Record<string, any>) {
    let existing: Record<string, any> = {};
    try { existing = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { }
    Object.assign(existing, patchObj);
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 4) + '\n');
}

// ─── Import ───────────────────────────────────────

export function importFromClaude(): Record<string, any> | null {
    const p = join(HOME, '.mcp.json');
    try {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        const mcpServers = data.mcpServers || {};
        const servers: Record<string, any> = {};
        for (const [name, srv] of Object.entries(mcpServers) as [string, any][]) {
            servers[name] = { command: srv.command, args: srv.args || [] };
            if (srv.env) servers[name].env = srv.env;
        }
        return { servers };
    } catch {
        return null;
    }
}

// ─── Detect existing MCP configs ──────────────────

export interface McpCandidate {
    label: string;
    path: string;
    count: number;
}

export function detectMcpConfigs(): McpCandidate[] {
    const candidates: McpCandidate[] = [];
    const checks: [string, string][] = [
        ['agent-sync', MCP_PATH],
        ['Claude', join(HOME, '.mcp.json')],
        ['Codex', join(HOME, '.codex', 'config.toml')],
        ['Gemini', join(HOME, '.gemini', 'settings.json')],
        ['Copilot', join(HOME, '.copilot', 'mcp-config.json')],
        ['Antigravity', join(HOME, '.gemini', 'antigravity', 'mcp_config.json')],
        ['OpenCode', join(HOME, '.config', 'opencode', 'opencode.json')],
    ];

    for (const [label, path] of checks) {
        try {
            const raw = fs.readFileSync(path, 'utf8');
            let count = 0;
            if (path.endsWith('.toml')) {
                count = (raw.match(/\[mcp_servers\./g) || []).length;
            } else {
                const data = JSON.parse(raw);
                const servers = data.mcpServers || data.servers || data.mcp || {};
                count = Object.keys(servers).length;
            }
            if (count > 0) candidates.push({ label, path, count });
        } catch { /* skip */ }
    }
    return candidates;
}

// ─── Sync to all targets ──────────────────────────

export interface SyncResults {
    claude: boolean;
    codex: boolean;
    gemini: boolean;
    opencode: boolean;
    copilot: boolean;
    antigravity: boolean;
}

export function syncToAll(config: Record<string, any>): SyncResults {
    const results: SyncResults = {
        claude: false, codex: false, gemini: false,
        opencode: false, copilot: false, antigravity: false,
    };

    // 1. Claude Code: ~/.mcp.json
    try {
        const p = join(HOME, '.mcp.json');
        const data = toClaudeMcp(config);
        let existing: Record<string, any> = {};
        try { existing = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { }
        existing.mcpServers = data.mcpServers;
        fs.writeFileSync(p, JSON.stringify(existing, null, 4) + '\n');
        results.claude = true;
        log.ok(`Claude: ${p}`);
    } catch (e: unknown) { log.err(`Claude: ${(e as Error).message}`); }

    // 2. Codex: ~/.codex/config.toml
    try {
        const p = join(HOME, '.codex', 'config.toml');
        if (fs.existsSync(p)) {
            const existing = fs.readFileSync(p, 'utf8');
            fs.writeFileSync(p, patchCodexToml(existing, toCodexToml(config)));
            results.codex = true;
            log.ok(`Codex: ${p}`);
        } else { log.dim(`Codex: config.toml not found, skipping`); }
    } catch (e: unknown) { log.err(`Codex: ${(e as Error).message}`); }

    // 3. Gemini CLI: ~/.gemini/settings.json
    try {
        const p = join(HOME, '.gemini', 'settings.json');
        if (fs.existsSync(p)) {
            patchJsonFile(p, { mcpServers: toClaudeMcp(config).mcpServers });
            results.gemini = true;
            log.ok(`Gemini: ${p}`);
        } else { log.dim(`Gemini: settings.json not found, skipping`); }
    } catch (e: unknown) { log.err(`Gemini: ${(e as Error).message}`); }

    // 4. OpenCode: ~/.config/opencode/opencode.json
    try {
        const p = join(HOME, '.config', 'opencode', 'opencode.json');
        if (fs.existsSync(p)) {
            patchJsonFile(p, { mcp: toOpenCodeMcp(config) });
            results.opencode = true;
            log.ok(`OpenCode: ${p}`);
        } else { log.dim(`OpenCode: opencode.json not found, skipping`); }
    } catch (e: unknown) { log.err(`OpenCode: ${(e as Error).message}`); }

    // 5. Copilot: ~/.copilot/mcp-config.json
    try {
        const dir = join(HOME, '.copilot');
        const p = join(dir, 'mcp-config.json');
        fs.mkdirSync(dir, { recursive: true });
        let existing: Record<string, any> = {};
        try { existing = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { }
        existing.mcpServers = toClaudeMcp(config).mcpServers;
        fs.writeFileSync(p, JSON.stringify(existing, null, 4) + '\n');
        results.copilot = true;
        log.ok(`Copilot: ${p}`);
    } catch (e: unknown) { log.err(`Copilot: ${(e as Error).message}`); }

    // 6. Antigravity: ~/.gemini/antigravity/mcp_config.json
    try {
        const p = join(HOME, '.gemini', 'antigravity', 'mcp_config.json');
        fs.mkdirSync(dirname(p), { recursive: true });
        let existing: Record<string, any> = {};
        try { existing = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { }
        existing.mcpServers = toClaudeMcp(config).mcpServers;
        fs.writeFileSync(p, JSON.stringify(existing, null, 4) + '\n');
        results.antigravity = true;
        log.ok(`Antigravity: ${p}`);
    } catch (e: unknown) { log.err(`Antigravity: ${(e as Error).message}`); }

    return results;
}
