import { describe, expect, it } from 'vitest';
import { clamp, formatBytes, formatSpeed } from '../src/utils/constants.js';

describe('formatBytes', () => {
  it.each([
    [0, '0 Bytes'],
    [512, '512 Bytes'],
    [1024, '1 KB'],
    [1536, '1.5 KB'],
    [5 * 1024 ** 3, '5 GB'],
  ])('formats %d as %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});

describe('formatSpeed', () => {
  it('appends per second', () => {
    expect(formatSpeed(2.5 * 1024 ** 2)).toBe('2.5 MB/s');
  });
});

describe('clamp', () => {
  it('keeps values within range', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});
