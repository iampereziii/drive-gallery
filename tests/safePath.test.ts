import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { resolveWithin, PathError } from '../src/server/lib/safePath';

const root = path.resolve('/data/photos');

describe('resolveWithin (Business Rule 1 — path containment)', () => {
  it('resolves a normal nested path inside the root', () => {
    expect(resolveWithin(root, '2024/trip/img.jpg')).toBe(path.resolve(root, '2024/trip/img.jpg'));
  });

  it('treats an empty path as the root', () => {
    expect(resolveWithin(root, '')).toBe(root);
  });

  it('allows contained "../" that does not escape', () => {
    expect(resolveWithin(root, 'a/b/../c.jpg')).toBe(path.resolve(root, 'a/c.jpg'));
  });

  it.each(['..', '../secret', '../../etc/passwd', 'a/../../b'])('rejects escaping path %s', (p) => {
    expect(() => resolveWithin(root, p)).toThrow(PathError);
  });

  it('rejects Windows drive letters', () => {
    expect(() => resolveWithin(root, 'C:/Windows/system32')).toThrow(PathError);
  });

  it('coerces a leading-slash path back inside the root (cannot escape)', () => {
    // A POSIX-absolute-looking input is neutralized to a relative path under root.
    expect(resolveWithin(root, '/etc/passwd')).toBe(path.resolve(root, 'etc/passwd'));
  });
});
