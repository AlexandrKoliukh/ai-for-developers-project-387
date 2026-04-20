import { execSync } from 'child_process';
import { resolve, join } from 'path';
import { existsSync, unlinkSync } from 'fs';

const ROOT = resolve(process.cwd(), '..');
const FLAG = join(process.cwd(), '.playwright-started');

export default async function globalTeardown(): Promise<void> {
  if (!existsSync(FLAG)) {
    console.log('[teardown] Services were pre-existing — leaving them running.');
    return;
  }

  unlinkSync(FLAG);
  console.log('[teardown] Stopping Docker services…');
  execSync('docker compose stop backend frontend mock-api', {
    cwd: ROOT,
    stdio: 'inherit',
  });
  console.log('[teardown] Done.');
}
