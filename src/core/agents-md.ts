/**
 * core/agents-md.ts — AGENTS.md generation (project-level)
 *
 * Auto-detects prompt template files from project.
 * Writes AGENTS.md to project root for Codex/Copilot/OpenCode discovery.
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

    // Only check files directly in project root (no subdirectory scanning)
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
    return candidates;
}

// ─── Generate AGENTS.md ───────────────────────────

export interface AgentsMdResult {
    targets: string[];
    size: number;
}

export function generateAgentsMd(cwd: string, content: string): AgentsMdResult {
    const targets = [
        join(cwd, 'AGENTS.md'),
    ];

    for (const target of targets) {
        fs.mkdirSync(join(target, '..'), { recursive: true });
        fs.writeFileSync(target, content);
        log.ok(`Written: ${target}`);
    }

    return { targets, size: content.length };
}
