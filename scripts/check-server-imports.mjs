// Guards against the exact bug that broke the Meta callbacks in production:
// an extensionless relative import (`from '../server/foo'`) type-checks fine
// under tsconfig.json's bundler-style resolution (Vite bundles everything,
// so it never fails there) but crashes at runtime under Node's real ESM
// resolution, which Vercel's Function runtime uses — Node does not do
// extension search for relative specifiers.
//
// Uses the TypeScript compiler API to walk real import/export declarations
// (including multi-line and `export ... from` forms) rather than a
// line-oriented regex, which would be fragile against those.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scanDirs = ['api', 'server'];

async function collectTsFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return collectTsFiles(entryPath);
      return entry.isFile() && entry.name.endsWith('.ts') ? [entryPath] : [];
    }),
  );
  return files.flat();
}

function isRelativeSpecifier(specifier) {
  return specifier.startsWith('./') || specifier.startsWith('../');
}

function hasFileExtension(specifier) {
  return /\.[a-zA-Z0-9]+$/.test(specifier);
}

function findBadSpecifiers(filePath, sourceText) {
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.ES2022, true);
  const bad = [];

  function visit(node) {
    let specifierNode;

    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifierNode = node.moduleSpecifier;
    }

    if (specifierNode) {
      const specifier = specifierNode.text;
      if (isRelativeSpecifier(specifier) && !hasFileExtension(specifier)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(specifierNode.getStart(sourceFile));
        bad.push({ specifier, line: line + 1 });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return bad;
}

let hasFailure = false;

for (const dir of scanDirs) {
  const absoluteDir = path.join(root, dir);
  let files;
  try {
    files = await collectTsFiles(absoluteDir);
  } catch {
    continue; // directory doesn't exist yet, nothing to check
  }

  for (const filePath of files) {
    const sourceText = await fs.readFile(filePath, 'utf8');
    const bad = findBadSpecifiers(filePath, sourceText);
    const relativePath = path.relative(root, filePath);

    for (const { specifier, line } of bad) {
      hasFailure = true;
      console.error(
        `${relativePath}:${line}: relative import "${specifier}" is missing a file extension ` +
          `(Node ESM will fail to resolve this at runtime — use "${specifier}.js").`,
      );
    }
  }
}

if (hasFailure) {
  process.exit(1);
}

console.log('check:server-imports OK: every relative import in api/ and server/ has an explicit extension.');
