import { describe, it, expect } from 'vitest';
import { thumbBox, thumbUrlFor } from '../src/client/lib/thumbSize';

describe('thumbBox — strip thumbnail sizes', () => {
  it('gives a ~320px judging column at L on a 1440px laptop, keeping ~78% for the photo', () => {
    const box = thumbBox('L', true, 1440);
    const column = box.w + 16;
    expect(column).toBe(320);
    expect((1440 - column) / 1440).toBeGreaterThan(0.75);
    expect(box.h).toBe(Math.round((box.w * 3) / 4)); // 4:3 box, whole photo fitted inside
  });

  it('caps the L column at 30% of the window on a sideways phone', () => {
    expect(thumbBox('L', true, 812).w + 16).toBeLessThanOrEqual(Math.ceil(812 * 0.3));
  });

  it('keeps an upright phone row short enough that the photo gets over half the height', () => {
    const row = thumbBox('L', false, 375).h + 16;
    const topBar = 56;
    const tagBar = 68;
    expect((812 - topBar - tagBar - row) / 812).toBeGreaterThan(0.5);
  });

  it('S stays the original small square', () => {
    expect(thumbBox('S', false, 375)).toEqual({ w: 56, h: 56 });
  });
});

describe('thumbUrlFor — sharp enough without flooding the cache', () => {
  const base = '/api/thumb?path=a%2Fb.jpg';

  it('reuses the grid thumbnail when 400px is enough', () => {
    expect(thumbUrlFor(base, 56, 3)).toBe(base);
    expect(thumbUrlFor(base, 200, 2)).toBe(base);
  });

  it('snaps larger needs to a fixed width covering box × devicePixelRatio', () => {
    expect(thumbUrlFor(base, 304, 2)).toBe(`${base}&w=640`);
    expect(thumbUrlFor(base, 304, 2.5)).toBe(`${base}&w=800`);
  });

  it('never asks for more than the route cap of 1200px', () => {
    expect(thumbUrlFor(base, 304, 3)).toBe(`${base}&w=1200`);
    expect(thumbUrlFor(base, 900, 3)).toBe(`${base}&w=1200`);
  });
});
