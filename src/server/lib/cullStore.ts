import fs from 'node:fs';
import path from 'node:path';
import { isCullTag, type CullManifest, type CullSummary, type CullTag } from '../../types';

/**
 * Holds the owner's culling tags in memory and persists them to CULL_FILE.
 *
 * - The file lives outside PHOTOS_ROOT (enforced in config) — the drive is never written.
 * - Writes are atomic (temp file + rename) and serialized, so overlapping taps from
 *   one or more phones can't interleave or leave a half-written file.
 * - A corrupt manifest stops startup instead of being silently replaced: tags are
 *   the owner's work, and losing them quietly is worse than a loud error.
 */
export class CullStore {
  private items: CullManifest['items'] = {};
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly file: string,
    private readonly root: string,
  ) {
    this.load();
  }

  private load(): void {
    let raw: string;
    try {
      raw = fs.readFileSync(this.file, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return; // first run — no tags yet
      throw err;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`CULL_FILE is not valid JSON: ${this.file}. Fix or move it aside, then restart.`);
    }
    const items = (parsed as { items?: unknown } | null)?.items;
    if (typeof items !== 'object' || items === null) {
      throw new Error(`CULL_FILE has no "items" object: ${this.file}. Fix or move it aside, then restart.`);
    }
    for (const [rel, entry] of Object.entries(items as Record<string, unknown>)) {
      const tag = (entry as { tag?: unknown } | null)?.tag;
      const taggedAt = (entry as { taggedAt?: unknown } | null)?.taggedAt;
      if (isCullTag(tag)) {
        this.items[rel] = { tag, taggedAt: typeof taggedAt === 'string' ? taggedAt : '' };
      }
    }
  }

  /** Drive-wide totals per tag. */
  summary(): CullSummary {
    const out: CullSummary = { like: 0, maybe: 0, no: 0 };
    for (const { tag } of Object.values(this.items)) out[tag] += 1;
    return out;
  }

  /** Relative paths currently carrying `tag`. */
  pathsWith(tag: CullTag): string[] {
    return Object.keys(this.items).filter((rel) => this.items[rel].tag === tag);
  }

  /** Tag for a posix relative path, if any. */
  get(rel: string): CullTag | undefined {
    return this.items[rel]?.tag;
  }

  /**
   * Set (or clear, with null) the tag for a posix relative path and persist.
   * Memory is only updated once the write succeeds, so a failed write leaves
   * the store and the file in agreement.
   */
  set(rel: string, tag: CullTag | null): Promise<void> {
    const run = async () => {
      const next = { ...this.items };
      if (tag === null) delete next[rel];
      else next[rel] = { tag, taggedAt: new Date().toISOString() };
      await this.write(next);
      this.items = next;
    };
    const result = this.queue.then(run);
    this.queue = result.catch(() => undefined); // keep the chain alive after a failure
    return result;
  }

  private async write(items: CullManifest['items']): Promise<void> {
    const manifest: CullManifest = { version: 1, root: this.root, items };
    await fs.promises.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await fs.promises.writeFile(tmp, JSON.stringify(manifest, null, 2), 'utf8');
    await fs.promises.rename(tmp, this.file);
  }
}
