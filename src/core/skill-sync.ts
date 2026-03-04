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
import { join, resolve } from 'node:path';
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

// ─── Resolve paths safely (ELOOP-aware) ──────────

function safeRealPath(p: string): string {
    try {
        return fs.realpathSync(p);
    } catch {
        // ELOOP (circular) or ENOENT (missing) — fall back to string resolution
        return resolve(p);
    }
}

/**
 * Returns true if `p` (possibly a symlink) resolves to the SAME real directory
 * as `realSource`. Uses lstat to avoid ELOOP when p itself is a circular link.
 */
function isSameRealDir(p: string, realSource: string): boolean {
    const stat = fs.lstatSync(p, { throwIfNoEntry: false } as any);
    if (!stat) return false;
    if (!stat.isSymbolicLink()) {
        // Real entry — compare inodes instead of paths to handle hardlinks/bind-mounts
        try {
            const statReal = fs.statSync(realSource);
            return stat.ino === statReal.ino && stat.dev === statReal.dev;
        } catch { return false; }
    }
    // It's a symlink — follow it safely
    try {
        const resolved = fs.realpathSync(p);
        return resolved === realSource;
    } catch (e: unknown) {
        // ELOOP means it's already circular — definitely NOT the same real dir
        if ((e as NodeJS.ErrnoException).code === 'ELOOP') return false;
        return false;
    }
}

export function syncSkills(cwd: string, sourcePath: string): SkillSyncResult {
    const backupContext = createBackupContext();
    const links: SymlinkResult[] = [];

    // Resolve source to real path.
    // NOTE: safeRealPath falls back to resolve() on ELOOP, so we must NOT rely
    // solely on string comparison for is_source detection — use isSameRealDir.
    const resolvedSource = safeRealPath(sourcePath);

    // Target paths within the project
    const targets: [string, string][] = [
        ['agent_skills', join(cwd, '.agent', 'skills')],
        ['agents_skills', join(cwd, '.agents', 'skills')],
        ['claude_skills', join(cwd, '.claude', 'skills')],
    ];

    // Determine canonical location (.agent/skills is the stable reference)
    const canonicalPath = join(cwd, '.agent', 'skills');
    const resolvedCanonical = safeRealPath(canonicalPath);

    for (const [name, targetPath] of targets) {
        // Use isSameRealDir to detect source even through ELOOP or inode equality
        if (isSameRealDir(targetPath, resolvedSource)) {
            // Target IS the real source directory — never overwrite it
            links.push({
                status: 'skip', action: 'is_source', name, linkPath: targetPath, target: sourcePath,
            });
            continue;
        }

        const resolvedTarget = safeRealPath(targetPath);

        if (resolvedTarget === resolvedCanonical && resolvedSource !== resolvedCanonical) {
            // .agent/skills-style path: symlink → source
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
