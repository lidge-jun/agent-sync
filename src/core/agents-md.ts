/**
 * core/agents-md.ts — AGENTS.md generation (project-level)
 *
 * Auto-detects prompt template files from project.
 * Writes prompt content to all supported agent formats:
 *   - AGENTS.md          (Codex / OpenCode)
 *   - CLAUDE.md          (Claude Code)
 *   - .github/copilot-instructions.md  (Copilot)
 *   - .agents/rules/agent-sync.md      (Antigravity)
 */
import fs from 'node:fs';
import { join, basename } from 'node:path';
import { log } from '../utils/log.js';

// ─── Detect prompt template candidates ────────────

export interface PromptCandidate {
    label: string;
    path: string;
    sizeKB: number;
}

export function detectPromptFiles(cwd: string): PromptCandidate[] {
    const candidates: PromptCandidate[] = [];

    // Check known prompt files in project root
    const patterns = [
        'AGENTS.md',
        'CLAUDE.md',
        'COPILOT.md',
        'INSTRUCTIONS.md',
        'PROMPT.md',
        'CODEX.md',
        '.github/copilot-instructions.md',
    ];

    for (const pattern of patterns) {
        const fullPath = join(cwd, pattern);
        try {
            const stat = fs.statSync(fullPath);
            if (stat.isFile() && stat.size > 0) {
                candidates.push({
                    label: pattern,
                    path: fullPath,
                    sizeKB: Math.round(stat.size / 1024),
                });
            }
        } catch { /* skip */ }
    }

    // Check Antigravity rules directory
    const rulesDir = join(cwd, '.agents', 'rules');
    try {
        const files = fs.readdirSync(rulesDir);
        for (const f of files) {
            if (f.endsWith('.md')) {
                const fullPath = join(rulesDir, f);
                const stat = fs.statSync(fullPath);
                if (stat.isFile() && stat.size > 0) {
                    candidates.push({
                        label: `.agents/rules/${f}`,
                        path: fullPath,
                        sizeKB: Math.round(stat.size / 1024),
                    });
                }
            }
        }
    } catch { /* skip */ }

    return candidates;
}

// ─── Generate AGENTS.md ───────────────────────────

export interface AgentsMdResult {
    targets: string[];
    size: number;
}

export function generateAgentsMd(cwd: string, content: string): AgentsMdResult {
    const targets = [
        join(cwd, 'AGENTS.md'),                              // Codex / OpenCode
        join(cwd, 'CLAUDE.md'),                               // Claude Code
        join(cwd, '.github', 'copilot-instructions.md'),      // Copilot
        join(cwd, '.agents', 'rules', 'agent-sync.md'),       // Antigravity
    ];

    for (const target of targets) {
        fs.mkdirSync(join(target, '..'), { recursive: true });
        fs.writeFileSync(target, content);
        log.ok(`Written: ${target}`);
    }

    return { targets, size: content.length };
}

