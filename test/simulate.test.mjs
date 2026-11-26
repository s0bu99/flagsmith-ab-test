import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(root, 'scripts', 'simulate.mjs');

test('simulate.mjs dry run completes with both variants and no errors', { timeout: 60000 }, async () => {
  const { code, stdout, stderr } = await new Promise((resolve) => {
    execFile(
      process.execPath,
      [script, '--visitors', '400', '--dry-run', '--concurrency', '100', '--quiet'],
      { cwd: root, env: { ...process.env, NO_COLOR: '1' }, timeout: 60000 },
      (error, stdout, stderr) => {
        resolve({ code: error ? error.code ?? 1 : 0, stdout, stderr });
      },
    );
  });

  assert.equal(code, 0, `exit code ${code}\n${stderr}`);
  assert.match(stdout, /control/);
  assert.match(stdout, /outcome/);
  assert.match(stdout, /errors 0/);
});
