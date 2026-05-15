import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = path.join(root, 'dist', 'assets');
const maxMainBundleBytes = 50 * 1024;

const entries = await fs.readdir(assetsDir);
const mainBundles = entries.filter((fileName) => /^index-[\w-]+\.js$/.test(fileName));

if (mainBundles.length === 0) {
  throw new Error('No main index-*.js bundle found in dist/assets. Run npm run build first.');
}

let hasFailure = false;

for (const fileName of mainBundles) {
  const filePath = path.join(assetsDir, fileName);
  const { size } = await fs.stat(filePath);
  const kib = (size / 1024).toFixed(1);

  if (size > maxMainBundleBytes) {
    hasFailure = true;
    console.error(
      `Bundle size regression: ${fileName} is ${kib} KiB, above the 50.0 KiB limit.`,
    );
  } else {
    console.log(`Bundle OK: ${fileName} is ${kib} KiB.`);
  }
}

if (hasFailure) {
  process.exit(1);
}
