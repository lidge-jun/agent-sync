# 260227 — Circular Symlink Bug: Root Cause & Fix Plan

## Incident Summary

`agent-sync skills` destroyed all 29 skills in `/Users/jun/Developer/new/.agents/skills/` by replacing the real directory with a **circular symlink**:

```
.agents/skills → .agent/skills → ../.agents/skills → ∞ loop
```

Git data was intact — recovered via `rm .agents/skills && git checkout HEAD -- .agents/skills/`.

---

## Root Cause Analysis

### The Bug: `skill-sync.ts` L87-108

```typescript
// L87: Hardcoded canonical path — ALWAYS .agent/skills
const canonicalPath = join(cwd, '.agent', 'skills');

for (const [name, targetPath] of targets) {
    if (targetPath === sourcePath) {
        // skip — source IS this path
        continue;
    }

    if (targetPath === canonicalPath && sourcePath !== canonicalPath) {
        // L100: .agent/skills → sourcePath
        links.push(ensureSymlinkSafe(sourcePath, targetPath, ...));
    } else {
        // L105: everything else → canonicalPath (.agent/skills)
        links.push(ensureSymlinkSafe(canonicalPath, targetPath, ...));
    }
}
```

### What Happened (step by step)

1. Pre-existing state on disk:
   - `.agents/skills/` = **real directory** (29 skills, git-tracked)
   - `.agent/skills` = **symlink → `../.agents/skills`** (set up long ago)

2. User ran `agent-sync` → selected `.agents/skills` as source (detected 29 skills)

3. `syncSkills(cwd, ".../new/.agents/skills")` executed:

   | target           | comparison                                                        | action                                             | result                                                       |
   | ---------------- | ----------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------ |
   | `.agent/skills`  | `targetPath === canonicalPath && source !== canonical` → **true** | `ensureSymlinkSafe(.agents/skills, .agent/skills)` | ⚠️ Old symlink replaced, now `.agent/skills → .agents/skills` |
   | `.agents/skills` | `targetPath === sourcePath` → **true**                            | **skip**                                           | ✅ No change                                                  |
   | `.claude/skills` | else branch                                                       | `ensureSymlinkSafe(.agent/skills, .claude/skills)` | ✅ OK                                                         |

   **Wait — step for `.agents/skills` says SKIP?** So how was it destroyed?

4. The REAL disaster: `ensureSymlinkSafe` at step for `.agent/skills`:
   - `.agent/skills` was a symlink → `../.agents/skills`
   - `readlinkSync` returns `../.agents/skills`
   - `resolveSymlinkTarget` resolves to `/Users/jun/Developer/new/.agents/skills`
   - **New target is ALSO `/Users/jun/Developer/new/.agents/skills`** → same!
   - `currentTarget === target` → **skip** (should be harmless)

5. **But wait** — if `.agent/skills` was NOT a symlink (was deleted/missing at some point), then:
   - L100 would **create** `.agent/skills → .agents/skills`
   - **This itself is fine!** No circular reference yet.

6. The danger scenario: If at a LATER run, `.agent/skills → .agents/skills` exists, and user selects `.agent/skills` as source:
   - `.agents/skills` target → `canonicalPath` = `.agent/skills`
   - `ensureSymlinkSafe(.agent/skills, .agents/skills)` → **BACKS UP real directory and creates symlink!**
   - Now `.agents/skills → .agent/skills → .agents/skills → ∞`

### Summary of Bugs

| #      | Bug                                                                    | Location                         | Severity   |
| ------ | ---------------------------------------------------------------------- | -------------------------------- | ---------- |
| **B1** | No circular symlink detection                                          | `symlink.ts` `ensureSymlinkSafe` | 🔴 Critical |
| **B2** | `canonicalPath` hardcoded without checking if it's itself a symlink    | `skill-sync.ts` L87              | 🔴 Critical |
| **B3** | Source path not resolved to `realpathSync` before comparison           | `skill-sync.ts` L90              | 🟡 Medium   |
| **B4** | `targetPath === sourcePath` uses string comparison, not resolved paths | `skill-sync.ts` L90              | 🟡 Medium   |
| **B5** | No dry-run mode — destructive operations happen immediately            | `cli.ts`                         | 🟡 Medium   |
| **B6** | Backup is silent — user doesn't know real dir was moved                | `symlink.ts` L66-68              | 🟡 Medium   |

---

## Fix Plan

### Phase 1: Immediate Safety (P0)

#### Fix B1 + B2: Add circular reference detection

**File: `src/core/symlink.ts`**

> [!IMPORTANT]
> Import change required: L6 must add `basename`:
> `import { join, dirname, resolve, basename } from 'node:path';`

```typescript
// NEW: Add after resolveSymlinkTarget()
export function wouldCreateCycle(target: string, linkPath: string): boolean {
    try {
        // Try resolving — ELOOP means already circular
        let realTarget: string;
        try {
            realTarget = fs.realpathSync(target);
        } catch (e: unknown) {
            if ((e as NodeJS.ErrnoException).code === 'ELOOP') return true;
            // Target doesn't exist yet — resolve string path
            realTarget = resolve(target);
        }

        let realLinkParent: string;
        try {
            realLinkParent = fs.realpathSync(dirname(linkPath));
        } catch {
            realLinkParent = resolve(dirname(linkPath));
        }
        const resolvedLinkPath = join(realLinkParent, basename(linkPath));

        // If target resolves to same as linkPath, it's a direct cycle
        if (realTarget === resolvedLinkPath) return true;

        // Walk the symlink chain from target, check if it leads back to linkPath
        let current = target;
        const visited = new Set<string>();
        const MAX_DEPTH = 40; // SYMLOOP_MAX on most systems
        let depth = 0;
        while (depth++ < MAX_DEPTH) {
            const stat = fs.lstatSync(current, { throwIfNoEntry: false } as any);
            if (!stat || !stat.isSymbolicLink()) break;
            current = resolveSymlinkTarget(current, fs.readlinkSync(current));
            if (visited.has(current)) return true; // cycle detected
            if (current === resolvedLinkPath) return true;
            visited.add(current);
        }
        if (depth >= MAX_DEPTH) return true; // too deep = likely cycle
        return false;
    } catch {
        return false; // genuinely unknown error, proceed cautiously
    }
}
```

Then in `ensureSymlinkSafe()`, add guard **before ALL 3 `createLinkWithFallback` calls** (L56, L67, L72).
Best placement: immediately after L44 (`fs.mkdirSync`), before any branching:

```typescript
// L44: fs.mkdirSync(dirname(linkPath), { recursive: true });

// ── NEW: cycle guard (covers all 3 creation paths) ──
if (wouldCreateCycle(target, linkPath)) {
    return { status: 'error', action: 'cycle_detected', name, linkPath, target,
             error: `Circular symlink: ${linkPath} → ${target} would create a loop` };
}

const stat = fs.lstatSync(linkPath, { throwIfNoEntry: false } as any);
// ... rest of existing logic
```

#### Fix B3 + B4: Resolve paths before comparison (complete patch)

**File: `src/core/skill-sync.ts`**

> [!IMPORTANT]
> Add `resolve` to import on L11: `import { join, resolve } from 'node:path';`
> Add `safeRealPath` helper function (not exported — internal only).

```typescript
// NEW helper — add before syncSkills()
function safeRealPath(p: string): string {
    try {
        return fs.realpathSync(p);
    } catch (e: unknown) {
        // ELOOP or ENOENT — fall back to string resolution
        return resolve(p);
    }
}

export function syncSkills(cwd: string, sourcePath: string): SkillSyncResult {
    const backupContext = createBackupContext();
    const links: SymlinkResult[] = [];

    // Resolve source to real path to avoid symlink confusion
    const resolvedSource = safeRealPath(sourcePath);

    const targets: [string, string][] = [
        ['agent_skills', join(cwd, '.agent', 'skills')],
        ['agents_skills', join(cwd, '.agents', 'skills')],
        ['claude_skills', join(cwd, '.claude', 'skills')],
    ];

    const canonicalPath = join(cwd, '.agent', 'skills');
    const resolvedCanonical = safeRealPath(canonicalPath);

    for (const [name, targetPath] of targets) {
        const resolvedTarget = safeRealPath(targetPath);

        // Compare RESOLVED paths, not string paths
        if (resolvedTarget === resolvedSource) {
            links.push({
                status: 'skip', action: 'is_source', name, linkPath: targetPath, target: sourcePath,
            });
            continue;
        }

        if (resolvedTarget === resolvedCanonical && resolvedSource !== resolvedCanonical) {
            // .agent/skills is canonical — symlink to source
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
```

### Phase 2: Safety Net (P1)

#### Fix B5: Add `--dry-run` flag

- Parse `--dry-run` / `-n` flag in `cli.ts`
- Pass through to `syncSkills()` and `ensureSymlinkSafe()`
- Print what WOULD happen without making changes

#### Fix B6: Warn before backing up real directories

- In `ensureSymlinkSafe()`, before `movePathToBackup()`, log a warning:
  ```
  ⚠️  Backing up real directory: .agents/skills/ → ~/.agent-sync/backups/...
  ```
- In interactive mode, prompt for confirmation

### Phase 3: Tests (P2)

Create `src/__tests__/symlink.test.ts`:

| Test Case                                 | Description      |
| ----------------------------------------- | ---------------- |
| `creates symlink for non-existing target` | Basic happy path |
| `skips when symlink already correct`      | Idempotent check |
| `replaces symlink with different target`  | Update scenario  |
| `detects circular symlink A→B→A`          | **The bug**      |
| `detects circular symlink A→B→C→A`        | 3-node cycle     |
| `resolves real paths before comparison`   | B3/B4 fix        |
| `backs up real dir when replacing`        | Backup flow      |
| `dry-run mode does not modify filesystem` | P1 safety        |

---

## Verification

```bash
# After implementing fixes:
cd /Users/jun/Developer/new/700_projects/agent-sync

# 1. Build
npm run build

# 2. Unit tests
npm test

# 3. Manual smoke test (in a temp directory)
mkdir /tmp/agent-sync-test && cd /tmp/agent-sync-test
mkdir -p .agents/skills/test-skill
echo "fake" > .agents/skills/test-skill/SKILL.md
ln -s ../.agents/skills .agent/skills  # pre-existing reverse symlink

# Run agent-sync — should NOT create circular symlink
npx tsx /Users/jun/Developer/new/700_projects/agent-sync/src/cli.ts skills

# Verify: .agents/skills should still be a real directory
ls -la .agents/skills  # should NOT be a symlink
ls -la .agent/skills   # should be a symlink → ../.agents/skills
```
