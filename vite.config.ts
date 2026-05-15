// @ts-expect-error Node types are intentionally not installed for this small Vite config.
import fs from "node:fs";
// @ts-expect-error Node types are intentionally not installed for this small Vite config.
import path from "node:path";
// @ts-expect-error Node types are intentionally not installed for this small Vite config.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { transformSync } from 'esbuild';

declare const process: { argv: string[] };

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function neutralizeDeferredCssForBuild(command: string): Plugin {
  return {
    name: "maiatesta-neutralize-deferred-css-for-build",
    transformIndexHtml: {
      order: "pre",
      handler(html: string) {
        if (command !== "build") {
          return html;
        }

        return html.replaceAll("/src/deferred.css", "data:text/css,");
      },
    },
  };
}

function htmlPerformanceAssets(isSsrBuild: boolean, command: string): Plugin {
  const deferredCssFileName = "assets/deferred.css";

  return {
    name: "maiatesta-html-performance-assets",
    transformIndexHtml: {
      order: "post",
      handler(html: string) {
        const criticalCssPath = path.join(rootDir, "src", "critical.css");
        const criticalCss = fs.readFileSync(criticalCssPath, "utf8");
        const deferredCssHref = `/${deferredCssFileName}`;

        return html
          .replace("<!--critical-css-->", criticalCss)
          .replaceAll("data:text/css,", deferredCssHref);
      },
    },
    generateBundle() {
      if (isSsrBuild) {
        return;
      }

      const deferredCssPath = path.join(rootDir, "src", "deferred.css");
      const rawCss = fs.readFileSync(deferredCssPath, "utf8");
      const { code: minifiedCss } = transformSync(rawCss, { loader: 'css', minify: true });
      this.emitFile({
        type: "asset",
        fileName: deferredCssFileName,
        source: minifiedCss,
      });
    },
  };
}

export default defineConfig(({ command }) => {
  const isSsrBuild = process.argv.includes('--ssr');

  return {
    plugins: [
      neutralizeDeferredCssForBuild(command),
      react(),
      htmlPerformanceAssets(isSsrBuild, command),
    ],
    build: {
      target: 'es2020' as const,
      minify: 'esbuild' as const,
      cssCodeSplit: true,
      cssMinify: true,
      sourcemap: false,
      reportCompressedSize: false,
      assetsInlineLimit: 1024,
      modulePreload: {
        polyfill: false,
        resolveDependencies: () => [],
      },
      rollupOptions: {
        output: isSsrBuild
          ? undefined
          : {
              manualChunks(id) {
                if (!id.includes('node_modules')) {
                  return undefined;
                }

                if (id.includes('/react-dom/')) {
                  return 'vendor-react-dom';
                }

                if (id.includes('/react/')) {
                  return 'vendor-react';
                }

                return 'vendor';
              },
            },
      },
    },
  };
});
