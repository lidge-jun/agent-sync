/**
 * core/skill-sync.ts — Skills symlink sync (project-level)
 * Extracted from cli-jaw lib/mcp-sync.ts
 *
 * Creates symlinks so all AI agents can find skills:
 *   {cwd}/.agent/skills/   ← source directory (real files)
 *   {cwd}/.agents/skills/  → .agent/skills (symlink)
 *   {cwd}/.claude/skills/  → .agent/skills (symlink)
 */
import fs from 'node:fs';
import { join } from 'node:path';
import { ensureSymlinkSafe, createBackupContext, type SymlinkResult } from './symlink.js';
import { log } from '../utils/log.js';

// ─── Detect skill source candidates ───────────────

export interface SkillCandidate {
    label: string;
    path: string;
    count: number;
}

export function detectSkillSources(cwd: string): SkillCandidate[] {
    const candidates: SkillCandidate[] = [];

    // Common locations to check
    const checks: [string, string][] = [
        ['Project .agent/skills', join(cwd, '.agent', 'skills')],
        ['Project .agents/skills', join(cwd, '.agents', 'skills')],
        ['Project .claude/skills', join(cwd, '.claude', 'skills')],
        ['Project skills_ref/', join(cwd, 'skills_ref')],
    ];

    // Also walk one level of subdirectories for monorepo patterns
    try {
        for (const entry of fs.readdirSync(cwd, { withFileTypes: true })) {
            if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
            const sub = join(cwd, entry.name, 'skills_ref');
            if (fs.existsSync(sub)) {
                checks.push([`${entry.name}/skills_ref`, sub]);
            }
        }
    } catch { /* ignore */ }

    for (const [label, path] of checks) {
        try {
            const realPath = fs.realpathSync(path);
            const stat = fs.statSync(realPath);
            if (stat.isDirectory()) {
                const items = fs.readdirSync(realPath).filter(
                    (f) => !f.startsWith('.') && f !== 'registry.json',
                );
                const skillCount = items.filter((f) =>
                    fs.statSync(join(realPath, f)).isDirectory(),
                ).length;
                if (skillCount > 0) {
                    // Dedup by realPath
                    if (!candidates.some((c) => fs.realpathSync(c.path) === realPath)) {
                        candidates.push({ label, path, count: skillCount });
                    }
                }
            }
        } catch { /* skip broken paths */ }
    }
    return candidates;
}

// ─── Sync skills to all agent locations ───────────

export interface SkillSyncResult {
    source: string;
    links: SymlinkResult[];
}

export function syncSkills(cwd: string, sourcePath: string): SkillSyncResult {
    const backupContext = createBackupContext();
    const links: SymlinkResult[] = [];

    // Target paths within the project
    const targets: [string, string][] = [
        ['agent_skills', join(cwd, '.agent', 'skills')],
        ['agents_skills', join(cwd, '.agents', 'skills')],
        ['claude_skills', join(cwd, '.claude', 'skills')],
    ];

    // Determine canonical location (first real directory or the source itself)
    const canonicalPath = join(cwd, '.agent', 'skills');

    for (const [name, targetPath] of targets) {
        if (targetPath === sourcePath) {
            // Source IS this path — skip
            links.push({
                status: 'skip', action: 'is_source', name, linkPath: targetPath, target: sourcePath,
            });
            continue;
        }

        if (targetPath === canonicalPath && sourcePath !== canonicalPath) {
            // .agent/skills is the canonical target — symlink to source
            links.push(ensureSymlinkSafe(sourcePath, targetPath, {
                onConflict: 'backup', backupContext, name,
            }));
        } else {
            // Others → symlink to canonical
            links.push(ensureSymlinkSafe(canonicalPath, targetPath, {
                onConflict: 'backup', backupContext, name,
            }));
        }
    }

    return { source: sourcePath, links };
}

// ─── List active skills ───────────────────────────

export function listSkills(skillsDir: string): string[] {
    try {
        return fs.readdirSync(skillsDir).filter((f) => {
            if (f.startsWith('.') || f === 'registry.json') return false;
            try {
                return fs.statSync(join(skillsDir, f)).isDirectory();
            } catch { return false; }
        });
    } catch {
        return [];
    }
}
