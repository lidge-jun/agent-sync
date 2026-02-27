#!/usr/bin/env node
/**
 * agent-sync CLI — Interactive wizard for syncing AI agent configs
 *
 * Usage:
 *   agent-sync          Run interactive wizard (prompt → skills → MCP → sync)
 *   agent-sync mcp      MCP sync only (global)
 *   agent-sync skills   Skills sync only (project)
 *   agent-sync agents   AGENTS.md sync only (project)
 *   agent-sync all      Run all without prompts (uses detected defaults)
 */
import fs from 'node:fs';
import * as readline from 'node:readline';
import { join } from 'node:path';
import { log } from './utils/log.js';
import { ask, choose } from './utils/prompt.js';
import { ensureHome, MCP_PATH, AGENT_SYNC_HOME } from './core/config.js';
import { detectPromptFiles, generateAgentsMd } from './core/agents-md.js';
import { detectSkillSources, syncSkills, listSkills } from './core/skill-sync.js';
import { detectMcpConfigs, loadMcpConfig, saveMcpConfig, syncToAll, importFromClaude } from './core/mcp-sync.js';

const VERSION = '0.1.4';
const cwd = process.cwd();

// ─── Subcommand routing ───────────────────────────

async function main() {
    const args = process.argv.slice(2);
    const cmd = args[0];

    if (cmd === '--version' || cmd === '-v') {
        console.log(`agent-sync v${VERSION}`);
        return;
    }
    if (cmd === '--help' || cmd === '-h') {
        printHelp();
        return;
    }

    ensureHome();

    if (!cmd || cmd === 'all') {
        await wizardFull();
    } else if (cmd === 'mcp') {
        await wizardMcp();
    } else if (cmd === 'skills') {
        await wizardSkills();
    } else if (cmd === 'agents') {
        await wizardAgents();
    } else {
        log.err(`Unknown command: ${cmd}`);
        printHelp();
        process.exit(1);
    }
}

function printHelp() {
    console.log(`
agent-sync v${VERSION}
Sync MCP, skills, and AGENTS.md across all AI coding agents.

Usage:
  agent-sync              Interactive wizard (all steps)
  agent-sync mcp          MCP config sync (global → 6 CLIs)
  agent-sync skills       Skills symlink sync (project-level)
  agent-sync agents       AGENTS.md generation (project-level)
  agent-sync all          Run all with detected defaults

Options:
  -h, --help              Show this help
  -v, --version           Show version
`);
}

// ─── Full wizard ──────────────────────────────────

async function wizardFull() {
    console.log(`\n  agent-sync v${VERSION}\n`);

    // Step 1: AGENTS.md / Prompt
    log.header('Step 1/3 — AGENTS.md (Prompt File)');
    await wizardAgents();

    // Step 2: Skills
    log.header('Step 2/3 — Skills Sync');
    await wizardSkills();

    // Step 3: MCP
    log.header('Step 3/3 — MCP Config Sync (Global)');
    await wizardMcp();

    console.log('');
    log.ok('All done! Your agent configs are synced.');
}

// ─── Agents wizard ────────────────────────────────

async function wizardAgents() {
    const candidates = detectPromptFiles(cwd);

    if (candidates.length === 0) {
        log.choice(1, 'NONE', '(no prompt files detected)');
        const selection = await choose('Select prompt source', 1);

        if (selection === 1) {
            console.log('');
            log.info('Enter your prompt content below.');
            log.info('Press Ctrl+D on empty line when done, or type "SKIP" to skip.\n');
            const content = await readMultiline();
            if (content.trim() === 'SKIP' || content.trim() === '') {
                log.warn('Skipped AGENTS.md generation.');
                return;
            }
            // Confirm no conflict
            const existing = join(cwd, 'AGENTS.md');
            if (fs.existsSync(existing)) {
                const ans = await ask('  AGENTS.md already exists. Overwrite? [y/N]: ');
                if (ans.toLowerCase() !== 'y') {
                    log.warn('Skipped (not overwriting).');
                    return;
                }
            }
            generateAgentsMd(cwd, content);
        }
        return;
    }

    // Show detected candidates
    for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        log.choice(i + 1, c.label, `(${c.sizeKB}KB)`);
    }
    log.choice(candidates.length + 1, 'NONE', '(enter raw prompt manually)');

    const selection = await choose('Select prompt source', candidates.length + 1);

    if (selection <= candidates.length) {
        // Use selected file
        const chosen = candidates[selection - 1];
        const content = fs.readFileSync(chosen.path, 'utf8');
        log.info(`Using: ${chosen.label}`);
        generateAgentsMd(cwd, content);
    } else {
        // Manual input
        log.info('Enter your prompt content (Ctrl+D on empty line to finish, "SKIP" to skip):');
        const content = await readMultiline();
        if (content.trim() === 'SKIP' || content.trim() === '') {
            log.warn('Skipped AGENTS.md generation.');
            return;
        }
        generateAgentsMd(cwd, content);
    }
}

// ─── Skills wizard ────────────────────────────────

async function wizardSkills() {
    const candidates = detectSkillSources(cwd);

    if (candidates.length === 0) {
        log.choice(1, 'NONE', '(no skill directories detected)');
        const selection = await choose('Select skill source', 1);

        if (selection === 1) {
            const defaultDir = join(cwd, '.agent', 'skills');
            fs.mkdirSync(defaultDir, { recursive: true });
            console.log('');
            log.info(`Created: ${defaultDir}`);
            log.info('Place your SKILL.md folders here and run agent-sync again.');
            return;
        }
        return;
    }

    // Show detected candidates
    for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        log.choice(i + 1, c.label, `(${c.count} skills)`);
    }
    log.choice(candidates.length + 1, 'NONE', '(create empty skill directory)');

    const selection = await choose('Select skill source', candidates.length + 1);

    if (selection <= candidates.length) {
        const chosen = candidates[selection - 1];
        log.info(`Using: ${chosen.label} (${chosen.count} skills)`);

        console.log('  Syncing...');
        const result = syncSkills(cwd, chosen.path);
        for (const link of result.links) {
            if (link.status === 'ok') {
                log.ok(`${link.name}: ${link.linkPath} → ${link.target}`);
            } else if (link.status === 'skip') {
                log.dim(`${link.name}: ${link.action}`);
            } else {
                log.err(`${link.name}: ${link.error}`);
            }
        }

        const skills = listSkills(chosen.path);
        log.info(`Active skills: ${skills.join(', ')}`);
    } else {
        const defaultDir = join(cwd, '.agent', 'skills');
        fs.mkdirSync(defaultDir, { recursive: true });
        console.log('');
        log.info(`Created: ${defaultDir}`);
        log.info('Place your SKILL.md folders here and run agent-sync again.');
    }
}

// ─── MCP wizard ───────────────────────────────────

async function wizardMcp() {
    const candidates = detectMcpConfigs();

    if (candidates.length === 0) {
        log.choice(1, 'NONE', '(no MCP configs detected)');
        const selection = await choose('Select MCP source', 1);

        if (selection === 1) {
            fs.mkdirSync(AGENT_SYNC_HOME, { recursive: true });
            const defaultConfig = {
                servers: {
                    context7: {
                        command: 'npx',
                        args: ['-y', '@upstash/context7-mcp'],
                    },
                },
            };
            saveMcpConfig(defaultConfig);
            console.log('');
            log.info(`Created: ${MCP_PATH}`);
            log.dim(JSON.stringify(defaultConfig, null, 2).split('\n').slice(0, 8).join('\n  '));
            log.info('Edit this file to add your MCP servers, then run agent-sync again.');
            return;
        }
        return;
    }

    // Show detected candidates
    for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        log.choice(i + 1, c.label, `(${c.count} servers) ${c.path}`);
    }
    log.choice(candidates.length + 1, 'NONE', '(create default MCP config)');

    const selection = await choose('Select MCP source', candidates.length + 1);

    if (selection <= candidates.length) {
        const chosen = candidates[selection - 1];
        log.info(`Using: ${chosen.label} (${chosen.count} servers)`);

        // Import to unified format if not already agent-sync config
        let config: Record<string, any>;
        if (chosen.label === 'agent-sync') {
            config = loadMcpConfig();
        } else if (chosen.label === 'Claude') {
            config = importFromClaude() ?? { servers: {} };
            saveMcpConfig(config);
            log.ok(`Imported to ${MCP_PATH}`);
        } else {
            // For other sources, import from Claude format (similar structure)
            try {
                const raw = JSON.parse(fs.readFileSync(chosen.path, 'utf8'));
                const servers: Record<string, any> = {};
                const mcpServers = raw.mcpServers || raw.mcp || {};
                for (const [name, srv] of Object.entries(mcpServers) as [string, any][]) {
                    servers[name] = { command: srv.command, args: srv.args || [] };
                    if (srv.env) servers[name].env = srv.env;
                }
                config = { servers };
                saveMcpConfig(config);
                log.ok(`Imported to ${MCP_PATH}`);
            } catch {
                log.err('Failed to parse selected config');
                return;
            }
        }

        // Sync to all
        console.log('  Syncing to all CLIs...');
        const results = syncToAll(config);
        const synced = Object.values(results).filter(Boolean).length;
        log.info(`Synced to ${synced}/6 CLIs.`);
    } else {
        fs.mkdirSync(AGENT_SYNC_HOME, { recursive: true });
        const defaultConfig = {
            servers: {
                context7: {
                    command: 'npx',
                    args: ['-y', '@upstash/context7-mcp'],
                },
            },
        };
        saveMcpConfig(defaultConfig);
        console.log('');
        log.info(`Created: ${MCP_PATH}`);
        log.info('Edit this file to add your MCP servers, then run agent-sync again.');
    }
}

// ─── Helpers ──────────────────────────────────────

function readMultiline(): Promise<string> {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        const lines: string[] = [];
        rl.on('line', (line: string) => {
            lines.push(line);
        });
        rl.on('close', () => {
            // Ctrl+D triggers 'close' on readline interface
            // but does NOT destroy process.stdin (unlike raw stdin.on('end'))
            resolve(lines.join('\n'));
        });
    });
}

// ─── Run ──────────────────────────────────────────

main().catch((e) => {
    log.err(e.message);
    process.exit(1);
});
