import { execFileSync } from 'node:child_process';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
const gitOptions = { encoding: 'utf8', cwd: fileURLToPath(new URL('../..', import.meta.url)) };

let revision = 'unknown';
try {
  revision = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], gitOptions).trim();
  const changes = execFileSync('git', ['status', '--porcelain', '--', 'apps/web', 'packages', 'package-lock.json'], gitOptions).trim();
  if (changes) revision += '-dirty';
} catch { /* Source archives may not contain .git. */ }
export default defineConfig({ define: { 'import.meta.env.VITE_BUILD_ID': JSON.stringify(`${revision}@${new Date().toISOString()}`) } });
