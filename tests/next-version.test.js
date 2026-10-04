import { describe, expect, it } from 'vitest';
import { nextVersion } from '../scripts/next-version.mjs';

describe('nextVersion', () => {
  it('uses package.json when nothing has been released', () => {
    expect(nextVersion(null, '1.0.0')).toBe('1.0.0');
  });

  it('bumps the patch of the latest tag', () => {
    expect(nextVersion('v1.0.0', '1.0.0')).toBe('1.0.1');
    expect(nextVersion('v1.4.9', '1.0.0')).toBe('1.4.10');
  });

  it('uses package.json when it is ahead of the latest tag', () => {
    expect(nextVersion('v1.4.9', '1.5.0')).toBe('1.5.0');
    expect(nextVersion('v1.4.9', '2.0.0')).toBe('2.0.0');
  });

  it('compares numerically, not as strings', () => {
    expect(nextVersion('v1.10.0', '1.9.0')).toBe('1.10.1');
  });

  it('rejects versions it cannot order', () => {
    expect(() => nextVersion('v1.0.0', '1.1.0-beta.1')).toThrow('Not a plain x.y.z version');
  });
});
