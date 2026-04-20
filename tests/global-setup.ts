import { execSync } from 'child_process';
import { join, resolve } from 'path';
import { existsSync, writeFileSync } from 'fs';

// Playwright runs globalSetup with cwd = directory of playwright.config.ts (tests/).
// Project root is one level up.
const ROOT = resolve(process.cwd(), '..');
export const FLAG = join(process.cwd(), '.playwright-started');

const BACKEND_URL = 'http://localhost:8000/event-types';
const FRONTEND_URL = 'http://localhost:5173';

async function isUp(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2_000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res.status < 500;
  } catch {
    return false;
  }
}

async function waitFor(url: string, label: string, timeoutMs = 90_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  process.stdout.write(`[setup] Waiting for ${label}...`);
  while (Date.now() < deadline) {
    if (await isUp(url)) {
      process.stdout.write(' ready\n');
      return;
    }
    await new Promise((r) => setTimeout(r, 1_500));
    process.stdout.write('.');
  }
  process.stdout.write('\n');
  throw new Error(`[setup] Timed out waiting for ${label} (${url})`);
}

export default async function globalSetup(): Promise<void> {
  const backendUp = await isUp(BACKEND_URL);
  const frontendUp = await isUp(FRONTEND_URL);

  if (backendUp && frontendUp) {
    console.log('[setup] Services already running — reusing.');
    return;
  }

  console.log('[setup] Starting Docker services (docker compose up -d backend frontend)…');
  execSync('docker compose up -d backend frontend', {
    cwd: ROOT,
    stdio: 'inherit',
  });

  // Mark that we started them so teardown stops them afterwards
  writeFileSync(FLAG, '1');

  await waitFor(BACKEND_URL, 'backend');
  await waitFor(FRONTEND_URL, 'frontend');
  console.log('[setup] All services ready.');
}
