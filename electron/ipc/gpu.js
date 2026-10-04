import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';

// Fields requested from nvidia-smi, in output column order.
// systeminformation's graphics() is meant to provide these, but its
// DriverStore scan throws on non-directory entries and silently gives up,
// so we call nvidia-smi ourselves.
const QUERY_FIELDS = [
  'index',
  'name',
  'utilization.gpu',
  'utilization.memory',
  'temperature.gpu',
  'memory.used',
  'memory.total',
  'power.draw',
  'power.limit',
  'fan.speed',
  'clocks.gr',
  'clocks.max.gr',
];

const EXEC_TIMEOUT_MS = 3000;
// When nvidia-smi is missing or failing, don't respawn it on every poll.
const RETRY_AFTER_FAILURE_MS = 60000;

let cachedSmiPath; // undefined = not searched yet, null = not found
let lastFailureAt = 0;
let lastFailureMessage = null;
let inFlight = null;

function isFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

// Newest nvidia-smi.exe in the driver store, skipping entries that are not
// directories or cannot be read.
function findInDriverStore(systemRoot) {
  const basePath = path.join(systemRoot, 'System32', 'DriverStore', 'FileRepository');
  let newest = null;
  let newestTime = -1;

  let entries;
  try {
    entries = fs.readdirSync(basePath, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.toLowerCase().startsWith('nv')) continue;
    const candidate = path.join(basePath, entry.name, 'nvidia-smi.exe');
    try {
      const stat = fs.statSync(candidate);
      if (stat.isFile() && stat.ctimeMs > newestTime) {
        newest = candidate;
        newestTime = stat.ctimeMs;
      }
    } catch {
      // Not present in this directory
    }
  }

  return newest;
}

export function findNvidiaSmi() {
  if (cachedSmiPath !== undefined) return cachedSmiPath;

  if (process.platform !== 'win32') {
    cachedSmiPath = 'nvidia-smi';
    return cachedSmiPath;
  }

  const systemRoot = process.env.SystemRoot || 'C:\\Windows';
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const candidates = [
    path.join(systemRoot, 'System32', 'nvidia-smi.exe'),
    path.join(programFiles, 'NVIDIA Corporation', 'NVSMI', 'nvidia-smi.exe'),
  ];

  cachedSmiPath = candidates.find(isFile) || findInDriverStore(systemRoot);
  return cachedSmiPath;
}

// nvidia-smi reports unsupported fields as "[N/A]" or "[Not Supported]".
function toNumber(raw) {
  if (raw === undefined) return null;
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : null;
}

export function parseNvidiaSmiOutput(stdout) {
  return stdout
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const cols = line.split(',').map(col => col.trim());
      const field = name => cols[QUERY_FIELDS.indexOf(name)];
      return {
        index: toNumber(field('index')),
        name: field('name') || 'NVIDIA GPU',
        utilization: toNumber(field('utilization.gpu')), // %
        memoryUtilization: toNumber(field('utilization.memory')), // % (memory controller)
        temperature: toNumber(field('temperature.gpu')), // °C
        memoryUsed: toNumber(field('memory.used')), // MiB
        memoryTotal: toNumber(field('memory.total')), // MiB
        powerDraw: toNumber(field('power.draw')), // W
        powerLimit: toNumber(field('power.limit')), // W
        fanSpeed: toNumber(field('fan.speed')), // %
        clockCore: toNumber(field('clocks.gr')), // MHz
        clockCoreMax: toNumber(field('clocks.max.gr')), // MHz
      };
    });
}

function runNvidiaSmi(smiPath) {
  return new Promise((resolve, reject) => {
    execFile(
      smiPath,
      [`--query-gpu=${QUERY_FIELDS.join(',')}`, '--format=csv,noheader,nounits'],
      { timeout: EXEC_TIMEOUT_MS, windowsHide: true },
      (error, stdout) => (error ? reject(error) : resolve(stdout))
    );
  });
}

function unavailable(reason) {
  return { available: false, reason, gpus: [] };
}

export async function getGpuMetrics() {
  if (lastFailureAt && Date.now() - lastFailureAt < RETRY_AFTER_FAILURE_MS) {
    return unavailable(lastFailureMessage);
  }

  const smiPath = findNvidiaSmi();
  if (!smiPath) {
    lastFailureAt = Date.now();
    lastFailureMessage = 'nvidia-smi not found (no NVIDIA driver installed)';
    return unavailable(lastFailureMessage);
  }

  // Share one nvidia-smi process between overlapping requests
  if (!inFlight) {
    inFlight = runNvidiaSmi(smiPath).finally(() => {
      inFlight = null;
    });
  }

  try {
    const gpus = parseNvidiaSmiOutput(await inFlight);
    if (gpus.length === 0) {
      throw new Error('nvidia-smi returned no GPUs');
    }
    lastFailureAt = 0;
    lastFailureMessage = null;
    return { available: true, reason: null, gpus };
  } catch (error) {
    lastFailureAt = Date.now();
    lastFailureMessage = error.killed ? 'nvidia-smi timed out' : error.message;
    console.error('Error fetching GPU metrics:', lastFailureMessage);
    return unavailable(lastFailureMessage);
  }
}
