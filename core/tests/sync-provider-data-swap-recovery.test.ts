import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { mkdir, readdir, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { recoverOrphanedSwap, swapDirectories, syncRunningHub } from '../scripts/lib/sync-provider-data.mjs';

function makeRoot(prefix: string) {
  return mkdtempSync(join(tmpdir(), prefix));
}

function writeDir(dir: string, files: Record<string, string>) {
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(resolve(dir, name), content, 'utf8');
  }
}

// Real fs primitives, used as the base for targeted fault-injection wrappers
// so tests exercise genuine on-disk behavior rather than a fully mocked
// filesystem.
const realFsOps = { existsSync, readdir, rename, mkdir, rm };

describe('swapDirectories (cross-root failure path, real fs + targeted fault injection)', () => {
  let rootA: string;
  let rootB: string;

  afterEach(() => {
    if (rootA) rmSync(rootA, { recursive: true, force: true });
    if (rootB) rmSync(rootB, { recursive: true, force: true });
  });

  it('rolls back BOTH pairs when the first pair already committed and the second pair fails to commit', async () => {
    rootA = makeRoot('pptask-swap-a-');
    rootB = makeRoot('pptask-swap-b-');

    const targetA = resolve(rootA, 'apiframe');
    const targetB = resolve(rootB, 'apiframe');
    writeDir(targetA, { 'models.json': 'OLD-A' });
    writeDir(targetB, { 'openapi-v2.json': 'OLD-B' });

    const stagingA = resolve(rootA, 'apiframe.staging-test-a');
    const stagingB = resolve(rootB, 'apiframe.staging-test-b');
    writeDir(stagingA, { 'models.json': 'NEW-A' });
    writeDir(stagingB, { 'openapi-v2.json': 'NEW-B' });

    const fsOps = {
      ...realFsOps,
      rename: async (src: string, dest: string) => {
        // Pair A's backup-rename and commit-rename both go through
        // untouched (so pair A is "already replaced" by the time pair B is
        // processed). Pair B's own backup-rename also succeeds, but its
        // final commit rename (staging -> target) is the injected failure.
        if (src === stagingB && dest === targetB) {
          throw new Error('simulated disk failure during pair B commit');
        }
        return rename(src, dest);
      },
    };

    await expect(
      swapDirectories(
        [
          { targetDir: targetA, stagingDir: stagingA },
          { targetDir: targetB, stagingDir: stagingB },
        ],
        fsOps,
      ),
    ).rejects.toThrow(/simulated disk failure/);

    // Both roots must be restored to their OLD real on-disk content - pair A
    // (already committed) must be rolled back, and pair B (backup moved
    // aside, commit failed) must be restored too.
    expect(existsSync(targetA)).toBe(true);
    expect(readFileSync(resolve(targetA, 'models.json'), 'utf8')).toBe('OLD-A');
    expect(existsSync(targetB)).toBe(true);
    expect(readFileSync(resolve(targetB, 'openapi-v2.json'), 'utf8')).toBe('OLD-B');

    // No dangling `.rollback-*` siblings left behind after a clean rollback.
    const siblingsA = await readdir(rootA);
    const siblingsB = await readdir(rootB);
    expect(siblingsA.filter(name => name.includes('.rollback-'))).toEqual([]);
    expect(siblingsB.filter(name => name.includes('.rollback-'))).toEqual([]);
  });
});

describe('swapDirectories post-success backup cleanup', () => {
  let root: string;

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it('warns (but still reports success) when removing the old backup after a successful swap fails', async () => {
    root = makeRoot('pptask-swap-warn-');
    const targetDir = resolve(root, 'runninghub');
    writeDir(targetDir, { 'models_registry.json': 'OLD' });
    const stagingDir = resolve(root, 'runninghub.staging-test');
    writeDir(stagingDir, { 'models_registry.json': 'NEW' });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fsOps = {
      ...realFsOps,
      rm: async (path: string, options?: Parameters<typeof rm>[1]) => {
        if (path.includes('.rollback-')) {
          throw new Error('simulated backup cleanup failure');
        }
        return rm(path, options);
      },
    };

    await expect(
      swapDirectories([{ targetDir, stagingDir }], fsOps),
    ).resolves.toBeUndefined();

    expect(readFileSync(resolve(targetDir, 'models_registry.json'), 'utf8')).toBe('NEW');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('backup'));
    warnSpy.mockRestore();
  });
});

describe('recoverOrphanedSwap (startup/pre-sync self-healing)', () => {
  let root: string;

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it('restores the old snapshot when the target is missing but a rollback orphan sibling exists', async () => {
    root = makeRoot('pptask-recover-single-');
    const targetDir = resolve(root, 'runninghub');
    const orphanBackup = resolve(root, 'runninghub.rollback-9999-1111111111111-abcdef');
    writeDir(orphanBackup, { 'models_registry.json': 'OLD-SNAPSHOT' });

    const result = await recoverOrphanedSwap(targetDir);

    expect(result.recovered).toBe(true);
    expect(existsSync(targetDir)).toBe(true);
    expect(readFileSync(resolve(targetDir, 'models_registry.json'), 'utf8')).toBe('OLD-SNAPSHOT');
    expect(existsSync(orphanBackup)).toBe(false);
  });

  it('picks the most recent rollback orphan when multiple exist and removes the extras', async () => {
    root = makeRoot('pptask-recover-multi-');
    const targetDir = resolve(root, 'runninghub');
    const older = resolve(root, 'runninghub.rollback-1-1000000000000-aaaaaa');
    const newer = resolve(root, 'runninghub.rollback-2-2000000000000-bbbbbb');
    writeDir(older, { 'models_registry.json': 'OLD' });
    writeDir(newer, { 'models_registry.json': 'NEWER' });

    const result = await recoverOrphanedSwap(targetDir);

    expect(result.recovered).toBe(true);
    expect(readFileSync(resolve(targetDir, 'models_registry.json'), 'utf8')).toBe('NEWER');
    expect(existsSync(older)).toBe(false);
    expect(existsSync(newer)).toBe(false);
  });

  it('cleans up a stale staging orphan left by a hard-killed process without fabricating a target', async () => {
    root = makeRoot('pptask-recover-staging-');
    const targetDir = resolve(root, 'runninghub');
    const staleStaging = resolve(root, 'runninghub.staging-1234-1111-abcdef');
    writeDir(staleStaging, { 'models_registry.json': 'PARTIAL' });

    const result = await recoverOrphanedSwap(targetDir);

    expect(result.recovered).toBe(false);
    expect(existsSync(targetDir)).toBe(false);
    expect(existsSync(staleStaging)).toBe(false);
  });

  it('when the target already exists, only sweeps orphans and never overwrites live data', async () => {
    root = makeRoot('pptask-recover-live-');
    const targetDir = resolve(root, 'runninghub');
    writeDir(targetDir, { 'models_registry.json': 'LIVE-GOOD-DATA' });
    const orphanBackup = resolve(root, 'runninghub.rollback-1-1000-aaaaaa');
    writeDir(orphanBackup, { 'models_registry.json': 'SHOULD-NOT-BE-RESTORED' });

    const result = await recoverOrphanedSwap(targetDir);

    expect(result.recovered).toBe(false);
    expect(readFileSync(resolve(targetDir, 'models_registry.json'), 'utf8')).toBe('LIVE-GOOD-DATA');
    expect(existsSync(orphanBackup)).toBe(false);
  });

  it('does not touch a sibling directory whose name merely shares a prefix (strict path matching)', async () => {
    root = makeRoot('pptask-recover-strict-');
    const targetDir = resolve(root, 'apiframe');
    // "apiframe-legacy" must NOT be treated as an orphan sibling of "apiframe".
    const unrelatedSibling = resolve(root, 'apiframe-legacy.rollback-1-1000-aaaaaa');
    writeDir(unrelatedSibling, { 'models.json': 'UNRELATED' });
    // Likewise a completely unrelated directory must survive untouched.
    const unrelatedDir = resolve(root, 'other-provider');
    writeDir(unrelatedDir, { 'models.json': 'OTHER' });

    const result = await recoverOrphanedSwap(targetDir);

    expect(result.recovered).toBe(false);
    expect(existsSync(targetDir)).toBe(false);
    expect(existsSync(unrelatedSibling)).toBe(true);
    expect(existsSync(unrelatedDir)).toBe(true);
  });
});

describe('hard-kill window: recovery + a subsequently failing sync still preserve old data', () => {
  let catalogDataRoot: string;

  afterEach(() => {
    if (catalogDataRoot) rmSync(catalogDataRoot, { recursive: true, force: true });
  });

  it('recovers the old RunningHub snapshot from an interrupted swap even when the next network sync then fails', async () => {
    catalogDataRoot = makeRoot('pptask-hardkill-');
    const targetDir = resolve(catalogDataRoot, 'runninghub');

    // Simulate the exact state a hard-kill (SIGKILL) would leave behind: the
    // backup-rename of a prior swap succeeded (old snapshot now sitting in
    // `.rollback-*`) but the process died before the commit-rename, so the
    // target itself is missing. A half-written `.staging-*` from the killed
    // attempt is also left behind.
    const orphanBackup = resolve(catalogDataRoot, 'runninghub.rollback-1-1000-aaaaaa');
    writeDir(orphanBackup, { 'models_registry.json': 'LAST-KNOWN-GOOD' });
    const staleStaging = resolve(catalogDataRoot, 'runninghub.staging-1-1000-bbbbbb');
    writeDir(staleStaging, { 'models_registry.json': 'INCOMPLETE' });

    const failingFetch = vi.fn(async () => new Response('boom', { status: 500 }));
    const result = await syncRunningHub({
      catalogDataRoot,
      fetchImpl: failingFetch,
      sourceUrl: 'https://example.test/registry.json',
      now: () => new Date(),
    });

    expect(result.status).toBe('failed');
    // Even though *this* sync attempt failed, the last-known-good snapshot
    // must have been recovered from the orphaned backup rather than left
    // missing.
    expect(existsSync(targetDir)).toBe(true);
    expect(readFileSync(resolve(targetDir, 'models_registry.json'), 'utf8')).toBe('LAST-KNOWN-GOOD');
    expect(existsSync(orphanBackup)).toBe(false);
    expect(existsSync(staleStaging)).toBe(false);
  });
});
