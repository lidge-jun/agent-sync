/**
 * core/symlink.ts — Safe symlink creation with conflict resolution
 * Extracted from cli-jaw lib/mcp-sync.ts
 */
import fs from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import os from 'node:os';
import { AGENT_SYNC_HOME } from './config.js';

interface BackupContext {
    root: string;
    count: number;
}

export function createBackupContext(): BackupContext {
    const root = join(AGENT_SYNC_HOME, 'backups', new Date().toISOString().slice(0, 10));
    return { root, count: 0 };
}

export function resolveSymlinkTarget(linkPath: string, rawTarget: string): string {
    if (rawTarget.startsWith('/')) return rawTarget;
    return resolve(dirname(linkPath), rawTarget);
}

export interface SymlinkResult {
    status: 'ok' | 'skip' | 'error';
    action: string;
    name: string;
    linkPath: string;
    target: string;
    error?: string;
}

export function ensureSymlinkSafe(
    target: string,
    linkPath: string,
    opts: { onConflict?: string; backupContext?: BackupContext; name?: string } = {},
): SymlinkResult {
    const onConflict = opts.onConflict ?? 'backup';
    const name = opts.name ?? 'link';
    const context = opts.backupContext ?? createBackupContext();

    try {
        fs.mkdirSync(dirname(linkPath), { recursive: true });
        const stat = fs.lstatSync(linkPath, { throwIfNoEntry: false } as any);

        if (stat) {
            if (stat.isSymbolicLink()) {
                const rawTarget = fs.readlinkSync(linkPath);
                const currentTarget = resolveSymlinkTarget(linkPath, rawTarget);
                if (currentTarget === target) {
                    return { status: 'skip', action: 'already_correct', name, linkPath, target };
                }
                // Different target — update
                fs.unlinkSync(linkPath);
                createLinkWithFallback(target, linkPath);
                return { status: 'ok', action: 'replace_symlink', name, linkPath, target };
            }

            // Real directory or file — conflict
            if (onConflict === 'skip') {
                return { status: 'skip', action: 'skip_conflict', name, linkPath, target };
            }

            // Backup and replace
            movePathToBackup(linkPath, context);
            createLinkWithFallback(target, linkPath);
            return { status: 'ok', action: 'backup_and_link', name, linkPath, target };
        }

        // Nothing exists — create
        createLinkWithFallback(target, linkPath);
        return { status: 'ok', action: 'created', name, linkPath, target };
    } catch (e: unknown) {
        return { status: 'error', action: 'error', name, linkPath, target, error: (e as Error).message };
    }
}

/**
 * Try symlink → junction (Windows) → directory copy fallback.
 * WSL/macOS/Linux: symlink always works.
 * Native Windows: symlink needs Developer Mode; junction works without it;
 *                 copy is the last resort.
 */
function createLinkWithFallback(target: string, linkPath: string): void {
    // 1. Try regular symlink
    try {
        fs.symlinkSync(target, linkPath);
        return;
    } catch { /* continue to fallback */ }

    // 2. Try junction (Windows only, no admin required)
    if (process.platform === 'win32') {
        try {
            fs.symlinkSync(target, linkPath, 'junction');
            return;
        } catch { /* continue to fallback */ }
    }

    // 3. Fall back to directory copy
    copyDirRecursive(target, linkPath);
}

function movePathToBackup(pathToMove: string, context: BackupContext) {
    fs.mkdirSync(context.root, { recursive: true });
    const base = pathToMove.replace(/\//g, '__').replace(/^__/, '');
    const dest = join(context.root, `${base}_${context.count++}`);
    fs.renameSync(pathToMove, dest);
}

/**
 * Recursively copy a directory (symlink-safe, error-resilient)
 */
export function copyDirRecursive(src: string, dst: string) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = join(src, entry.name);
        const dstPath = join(dst, entry.name);
        try {
            const realStat = fs.statSync(srcPath);
            if (realStat.isDirectory()) {
                copyDirRecursive(srcPath, dstPath);
            } else {
                fs.copyFileSync(srcPath, dstPath);
            }
        } catch {
            // Skip broken symlinks or permission errors
        }
    }
}
