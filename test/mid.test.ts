import { describe, expect, it } from 'vitest';
import { generateMid, isValidMid } from '../src/index.js';

const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

describe('generateMid', () => {
  it('maps bytes to the alphabet in order (byte % 36)', () => {
    const bytes = Uint8Array.from([0, 1, 25, 26, 35, 36, 37, 71, 72, 100, 200, 251, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    // by hand: 0 A, 1 B, 25 Z, 26 0, 35 9, 36 A, 37 B, 71 9, 72 A, 100%36=28 -> 2, 200%36=20 -> U, 251%36=35 -> 9
    expect(generateMid(() => bytes)).toBe('ABZ09AB9A2U9');
  });
  it('rejects bytes 252-255 (rejection sampling)', () => {
    const calls: number[] = [];
    const queue = [Uint8Array.from({ length: 24 }, () => 252), Uint8Array.from({ length: 24 }, (_, i) => i)];
    const out = generateMid((n) => {
      calls.push(n);
      return queue.shift()!;
    });
    expect(calls).toEqual([24, 24]);
    expect(out).toBe(A.slice(0, 12));
  });
  it('accepts 251 and rejects 252 exactly', () => {
    const first = Uint8Array.from({ length: 24 }, (_, i) => (i === 0 ? 251 : 252));
    const rest = Uint8Array.from({ length: 22 }, () => 0);
    const queue = [first, rest];
    const out = generateMid(() => queue.shift()!);
    expect(out[0]).toBe(A[251 % 36]);
    expect(out).toHaveLength(12);
  });
  it('is 12 characters of A-Z0-9 with a real random source', async () => {
    const { randomBytes } = await import('node:crypto');
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const mid = generateMid((n) => new Uint8Array(randomBytes(n)));
      expect(mid).toMatch(/^[A-Z0-9]{12}$/);
      expect(isValidMid(mid)).toBe(true);
      seen.add(mid);
    }
    expect(seen.size).toBe(50);
  });
  it('throws when the source is unusable', () => {
    expect(() => generateMid(1 as unknown as () => Uint8Array)).toThrow(TypeError);
    expect(() => generateMid(() => new Uint8Array(3))).toThrow(TypeError);
    expect(() => generateMid(() => [1, 2] as unknown as Uint8Array)).toThrow(TypeError);
    expect(() => generateMid((n) => new Uint8Array(n).fill(255))).toThrow(RangeError);
  });
});

describe('isValidMid', () => {
  it('accepts 1 to 12 characters', () => {
    expect(isValidMid('A')).toBe(true);
    expect(isValidMid('ABCDEFGHIJKL')).toBe(true);
  });
  it('rejects empty, 13 characters and non-strings', () => {
    expect(isValidMid('')).toBe(false);
    expect(isValidMid('ABCDEFGHIJKLM')).toBe(false);
    expect(isValidMid(5 as unknown as string)).toBe(false);
    expect(isValidMid(undefined as unknown as string)).toBe(false);
  });
});
