/**
 * Comprehensive tests for symlink cycle detection and skill-sync safety.
 *
 * Covers:
 *   - wouldCreateCycle() — direct, indirect, ELOOP, deep chains
 *   - ensureSymlinkSafe() — cycle guard integration
 *   - syncSkills() — resolved path comparisons, real-world scenarios
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import { join, resolve } from 'node:path';
import os from 'node:os';
import {
    wouldCreateCycle,
    ensureSymlinkSafe,
    resolveSymlinkTarget,
    copyDirRecursive,
} from '../core/symlink.js';
import { syncSkills, detectSkillSources, listSkills } from '../core/skill-sync.js';

// ─── Test helpers ─────────────────────────────────

function tmpDir(): string {
    return fs.mkdtempSync(join(os.tmpdir(), 'agent-sync-test-'));
}

function touch(path: string, content = '') {
    fs.mkdirSync(join(path, '..').replace(/\/\.\.$/, ''), { recursive: true });
    const dir = resolve(path, '..');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path, content);
}

function makeSkillDir(base: string, name: string) {
    const skillDir = join(base, name);
    fs.mkdirSync(skillDir, { recursive: true });
    touch(join(skillDir, 'SKILL.md'), `---\nname: ${name}\n---\n# ${name}\n`);
}

function cleanDir(dir: string) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ok */ }
}

// ─── wouldCreateCycle ─────────────────────────────

describe('wouldCreateCycle', () => {
    let tmp: string;

    beforeEach(() => { tmp = tmpDir(); });
    afterEach(() => { cleanDir(tmp); });

    it('returns false for non-existing target (new symlink)', () => {
        const target = join(tmp, 'target-dir');
        const linkPath = join(tmp, 'link');
        fs.mkdirSync(target, { recursive: true });
        expect(wouldCreateCycle(target, linkPath)).toBe(false);
    });

    it('returns false for a valid non-circular symlink', () => {
        const realDir = join(tmp, 'real');
        const linkPath = join(tmp, 'link');
        fs.mkdirSync(realDir, { recursive: true });
        fs.symlinkSync(realDir, linkPath);
        // Creating link2 → realDir should not be circular
        const link2 = join(tmp, 'link2');
        expect(wouldCreateCycle(realDir, link2)).toBe(false);
    });

    it('detects direct cycle: A → B where B already → A', () => {
        // Setup: B is a symlink → A
        const a = join(tmp, 'a');
        const b = join(tmp, 'b');
        fs.mkdirSync(a, { recursive: true });
        fs.symlinkSync(a, b);

        // Creating A → B would create: A → B → A (cycle)
        expect(wouldCreateCycle(b, a)).toBe(true);
    });

    it('detects 3-node cycle: A → B → C → A', () => {
        const a = join(tmp, 'a');
        const b = join(tmp, 'b');
        const c = join(tmp, 'c');

        // Setup chain: b → c, c → a (a doesn't exist yet)
        touch(join(a, 'dummy'));  // a is a real dir
        fs.symlinkSync(join(tmp, 'c'), b);
        fs.symlinkSync(a, c);

        // Creating a → b would complete the cycle: a → b → c → a
        // But a is a real dir, so wouldCreateCycle checks if target (b) resolves back to linkPath (a)
        // b → c → a, and a === linkPath → cycle!
        expect(wouldCreateCycle(b, a)).toBe(true);
    });

    it('detects ELOOP on already-circular targets', () => {
        const a = join(tmp, 'a');
        const b = join(tmp, 'b');
        // Create circular pair: a → b, b → a
        fs.symlinkSync(b, a);
        fs.symlinkSync(a, b);

        // Any operation involving these should detect cycle
        const c = join(tmp, 'c');
        expect(wouldCreateCycle(a, c)).toBe(true);
    });

    it('returns false when target is self (idempotent)', () => {
        const realDir = join(tmp, 'real');
        fs.mkdirSync(realDir, { recursive: true });
        // linkPath doesn't exist → target points to a real dir → no cycle
        const linkPath = join(tmp, 'link');
        expect(wouldCreateCycle(realDir, linkPath)).toBe(false);
    });

    it('detects cycle when existing symlink would point back to itself', () => {
        // Create a → b where b is a real dir, then check if b → a would cycle
        // (since a → b, making b → a creates a → b → a)
        const a = join(tmp, 'selfA');
        const b = join(tmp, 'selfB');
        fs.mkdirSync(b, { recursive: true });
        fs.symlinkSync(b, a);
        // b → a would cycle: a → b → a
        expect(wouldCreateCycle(a, b)).toBe(true);
    });
});

// ─── ensureSymlinkSafe ────────────────────────────

describe('ensureSymlinkSafe', () => {
    let tmp: string;

    beforeEach(() => { tmp = tmpDir(); });
    afterEach(() => { cleanDir(tmp); });

    it('creates a new symlink for non-existing path', () => {
        const target = join(tmp, 'target');
        const linkPath = join(tmp, 'link');
        fs.mkdirSync(target, { recursive: true });

        const result = ensureSymlinkSafe(target, linkPath, { name: 'test' });
        expect(result.status).toBe('ok');
        expect(result.action).toBe('created');
        expect(fs.readlinkSync(linkPath)).toBe(target);
    });

    it('skips when symlink already points to correct target', () => {
        const target = join(tmp, 'target');
        const linkPath = join(tmp, 'link');
        fs.mkdirSync(target, { recursive: true });
        fs.symlinkSync(target, linkPath);

        const result = ensureSymlinkSafe(target, linkPath, { name: 'test' });
        expect(result.status).toBe('skip');
        expect(result.action).toBe('already_correct');
    });

    it('replaces symlink with different target', () => {
        const target1 = join(tmp, 'target1');
        const target2 = join(tmp, 'target2');
        const linkPath = join(tmp, 'link');
        fs.mkdirSync(target1, { recursive: true });
        fs.mkdirSync(target2, { recursive: true });
        fs.symlinkSync(target1, linkPath);

        const result = ensureSymlinkSafe(target2, linkPath, { name: 'test' });
        expect(result.status).toBe('ok');
        expect(result.action).toBe('replace_symlink');
        expect(fs.readlinkSync(linkPath)).toBe(target2);
    });

    it('BLOCKS circular symlink creation (cycle_detected)', () => {
        const a = join(tmp, 'a');
        const b = join(tmp, 'b');
        fs.mkdirSync(a, { recursive: true });
        fs.symlinkSync(a, b);

        // Trying to create a → b would form cycle a → b → a
        const result = ensureSymlinkSafe(b, a, { name: 'test' });
        expect(result.status).toBe('error');
        expect(result.action).toBe('cycle_detected');
        // a should NOT be a symlink — it should remain a real directory
        expect(fs.lstatSync(a).isDirectory()).toBe(true);
    });

    it('backs up real directory and creates symlink', () => {
        const target = join(tmp, 'target');
        const linkPath = join(tmp, 'existing-dir');
        fs.mkdirSync(target, { recursive: true });
        fs.mkdirSync(linkPath, { recursive: true });
        touch(join(linkPath, 'file.txt'), 'original');

        const result = ensureSymlinkSafe(target, linkPath, {
            name: 'test', onConflict: 'backup',
        });
        expect(result.status).toBe('ok');
        expect(result.action).toBe('backup_and_link');
        expect(fs.lstatSync(linkPath).isSymbolicLink()).toBe(true);
    });

    it('skips conflict when onConflict=skip', () => {
        const target = join(tmp, 'target');
        const linkPath = join(tmp, 'existing-dir');
        fs.mkdirSync(target, { recursive: true });
        fs.mkdirSync(linkPath, { recursive: true });

        const result = ensureSymlinkSafe(target, linkPath, {
            name: 'test', onConflict: 'skip',
        });
        expect(result.status).toBe('skip');
        expect(result.action).toBe('skip_conflict');
    });
});

// ─── resolveSymlinkTarget ─────────────────────────

describe('resolveSymlinkTarget', () => {
    it('returns absolute target as-is', () => {
        expect(resolveSymlinkTarget('/foo/link', '/bar/target')).toBe('/bar/target');
    });

    it('resolves relative target from link directory', () => {
        const result = resolveSymlinkTarget('/foo/bar/link', '../baz');
        expect(result).toBe(resolve('/foo/bar', '../baz'));
    });
});

// ─── syncSkills ───────────────────────────────────

describe('syncSkills', () => {
    let tmp: string;

    beforeEach(() => { tmp = tmpDir(); });
    afterEach(() => { cleanDir(tmp); });

    it('creates symlinks from .agents/skills source to .agent and .claude', () => {
        const source = join(tmp, '.agents', 'skills');
        makeSkillDir(source, 'test-skill');

        const result = syncSkills(tmp, source);
        expect(result.source).toBe(source);

        // .agents/skills is source → skipped
        const agentsLink = result.links.find(l => l.name === 'agents_skills');
        expect(agentsLink?.status).toBe('skip');
        expect(agentsLink?.action).toBe('is_source');

        // .agent/skills should be created
        const agentLink = result.links.find(l => l.name === 'agent_skills');
        expect(agentLink?.status).toBe('ok');

        // .claude/skills should be created
        const claudeLink = result.links.find(l => l.name === 'claude_skills');
        expect(claudeLink?.status).toBe('ok');
    });

    it('detects same resolved path and skips (symlink-to-source)', () => {
        // .agents/skills is real dir, .agent/skills → .agents/skills
        const source = join(tmp, '.agents', 'skills');
        makeSkillDir(source, 'my-skill');
        const agentSkills = join(tmp, '.agent', 'skills');
        fs.mkdirSync(join(tmp, '.agent'), { recursive: true });
        fs.symlinkSync(source, agentSkills);

        const result = syncSkills(tmp, source);

        // .agent/skills resolves to .agents/skills (same as source) → skip
        const agentLink = result.links.find(l => l.name === 'agent_skills');
        expect(agentLink?.status).toBe('skip');
        expect(agentLink?.action).toBe('is_source');
    });

    it('PREVENTS circular symlink in the incident scenario', () => {
        // Reproduce the exact scenario that caused the incident:
        // 1. .agents/skills = real dir (29 skills)
        // 2. .agent/skills = symlink → ../.agents/skills (set up long ago)
        // 3. User selects .agents/skills as source
        // Expected: NO circular symlink created
        const source = join(tmp, '.agents', 'skills');
        makeSkillDir(source, 'api-proxy');
        makeSkillDir(source, 'browser');
        makeSkillDir(source, 'ccs');

        // Pre-existing reverse symlink
        const agentSkills = join(tmp, '.agent', 'skills');
        fs.mkdirSync(join(tmp, '.agent'), { recursive: true });
        fs.symlinkSync(join('..', '.agents', 'skills'), agentSkills);

        const result = syncSkills(tmp, source);

        // .agents/skills is source → skip
        const agentsResult = result.links.find(l => l.name === 'agents_skills');
        expect(agentsResult?.status).toBe('skip');

        // .agent/skills already points to source → skip (resolved paths match)
        const agentResult = result.links.find(l => l.name === 'agent_skills');
        expect(agentResult?.status).toBe('skip');
        expect(agentResult?.action).toBe('is_source');

        // .agents/skills should STILL be a real directory, NOT a symlink
        expect(fs.lstatSync(source).isDirectory()).toBe(true);
        expect(fs.lstatSync(source).isSymbolicLink()).toBe(false);

        // Skills should still be accessible
        const skills = listSkills(source);
        expect(skills).toContain('api-proxy');
        expect(skills).toContain('browser');
        expect(skills).toContain('ccs');
    });

    it('blocks ensureSymlinkSafe from creating cycle in edge case', () => {
        // Edge case: .agent/skills is source, .agents/skills = symlink → .agent/skills
        // Then syncSkills tries .agents/skills → canonical (.agent/skills)
        // This should be caught by cycle detection
        const source = join(tmp, '.agent', 'skills');
        makeSkillDir(source, 'test-skill');

        // .agents/skills already points to .agent/skills
        fs.mkdirSync(join(tmp, '.agents'), { recursive: true });
        fs.symlinkSync(source, join(tmp, '.agents', 'skills'));

        const result = syncSkills(tmp, source);

        // No link should have created a cycle
        for (const link of result.links) {
            if (link.status === 'error') {
                expect(link.action).toBe('cycle_detected');
            }
        }

        // Source should still be intact
        expect(fs.lstatSync(source).isDirectory()).toBe(true);
        const skills = listSkills(source);
        expect(skills).toContain('test-skill');
    });
});

// ─── detectSkillSources ──────────────────────────

describe('detectSkillSources', () => {
    let tmp: string;

    beforeEach(() => { tmp = tmpDir(); });
    afterEach(() => { cleanDir(tmp); });

    it('detects skills in .agents/skills', () => {
        const skillDir = join(tmp, '.agents', 'skills');
        makeSkillDir(skillDir, 'test-skill');

        const candidates = detectSkillSources(tmp);
        expect(candidates.length).toBeGreaterThanOrEqual(1);
        const match = candidates.find(c => c.label.includes('.agents'));
        expect(match).toBeDefined();
        expect(match!.count).toBe(1);
    });

    it('deduplicates symlinked directories', () => {
        const real = join(tmp, '.agents', 'skills');
        makeSkillDir(real, 'test-skill');

        // .agent/skills → .agents/skills
        fs.mkdirSync(join(tmp, '.agent'), { recursive: true });
        fs.symlinkSync(real, join(tmp, '.agent', 'skills'));

        const candidates = detectSkillSources(tmp);
        // Should only detect once, not twice
        expect(candidates.length).toBe(1);
    });
});

// ─── listSkills ───────────────────────────────────

describe('listSkills', () => {
    let tmp: string;

    beforeEach(() => { tmp = tmpDir(); });
    afterEach(() => { cleanDir(tmp); });

    it('lists skill directories', () => {
        makeSkillDir(tmp, 'alpha');
        makeSkillDir(tmp, 'beta');
        touch(join(tmp, 'not-a-skill.txt'), 'file');

        const skills = listSkills(tmp);
        expect(skills).toEqual(['alpha', 'beta']);
    });

    it('returns empty for non-existent directory', () => {
        expect(listSkills('/nonexistent-12345')).toEqual([]);
    });

    it('ignores dotfiles and registry.json', () => {
        makeSkillDir(tmp, 'real-skill');
        fs.mkdirSync(join(tmp, '.hidden'), { recursive: true });
        touch(join(tmp, 'registry.json'), '{}');

        const skills = listSkills(tmp);
        expect(skills).toEqual(['real-skill']);
    });
});

// ─── copyDirRecursive ─────────────────────────────

describe('copyDirRecursive', () => {
    let tmp: string;

    beforeEach(() => { tmp = tmpDir(); });
    afterEach(() => { cleanDir(tmp); });

    it('copies directory structure and files', () => {
        const src = join(tmp, 'src');
        const dst = join(tmp, 'dst');
        makeSkillDir(src, 'skill-a');
        touch(join(src, 'README.md'), '# Hello');

        copyDirRecursive(src, dst);

        expect(fs.existsSync(join(dst, 'skill-a', 'SKILL.md'))).toBe(true);
        expect(fs.readFileSync(join(dst, 'README.md'), 'utf8')).toBe('# Hello');
    });

    it('skips broken symlinks without throwing', () => {
        const src = join(tmp, 'src');
        const dst = join(tmp, 'dst');
        fs.mkdirSync(src, { recursive: true });
        touch(join(src, 'file.txt'), 'ok');
        fs.symlinkSync('/nonexistent-path-12345', join(src, 'broken-link'));

        // Should not throw
        expect(() => copyDirRecursive(src, dst)).not.toThrow();
        expect(fs.readFileSync(join(dst, 'file.txt'), 'utf8')).toBe('ok');
    });
});
