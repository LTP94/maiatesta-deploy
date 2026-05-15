import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientIndexPath = path.join(root, 'dist', 'index.html');
const serverEntryPath = path.join(root, 'dist', 'server', 'entry-server.js');

const template = await fs.readFile(clientIndexPath, 'utf8');
const { render } = await import(`file://${serverEntryPath}`);
const appHtml = await render();

if (!template.includes('<!--app-html-->')) {
  throw new Error('Missing <!--app-html--> placeholder in dist/index.html');
}

await fs.writeFile(
  clientIndexPath,
  template
    .replace('<!--app-html-->', appHtml),
);
