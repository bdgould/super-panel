import { describe, expect, it } from 'vitest';
import { parseNvidiaSmiOutput } from '../electron/ipc/gpu.js';

describe('parseNvidiaSmiOutput', () => {
  it('parses one line per GPU', () => {
    const stdout = [
      '0, NVIDIA GeForce RTX 4080, 37, 12, 54, 2048, 16376, 85.50, 320.00, 30, 2505, 3105',
      '1, NVIDIA GeForce RTX 3060, 0, 0, 41, 512, 12288, 15.00, 170.00, 0, 210, 2100',
      '',
    ].join('\r\n');

    const gpus = parseNvidiaSmiOutput(stdout);
    expect(gpus).toHaveLength(2);
    expect(gpus[0]).toEqual({
      index: 0,
      name: 'NVIDIA GeForce RTX 4080',
      utilization: 37,
      memoryUtilization: 12,
      temperature: 54,
      memoryUsed: 2048,
      memoryTotal: 16376,
      powerDraw: 85.5,
      powerLimit: 320,
      fanSpeed: 30,
      clockCore: 2505,
      clockCoreMax: 3105,
    });
    expect(gpus[1].index).toBe(1);
  });

  it('turns unsupported fields into null', () => {
    const [gpu] = parseNvidiaSmiOutput(
      '0, NVIDIA RTX A2000 Laptop GPU, 5, 1, 48, 300, 4096, [N/A], [Not Supported], [N/A], 210, 1575'
    );
    expect(gpu.powerDraw).toBeNull();
    expect(gpu.powerLimit).toBeNull();
    expect(gpu.fanSpeed).toBeNull();
    expect(gpu.clockCore).toBe(210);
  });

  it('returns no GPUs for empty output', () => {
    expect(parseNvidiaSmiOutput('\r\n')).toEqual([]);
  });
});
