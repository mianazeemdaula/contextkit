// Build script for the ContextKit MV3 extension.
//
// What it does:
//   1. Wipe dist/.
//   2. Bundle background.ts → dist/background.js (ESM, browser).
//   3. Bundle content/index.ts → dist/content.js (IIFE, browser).
//   4. Bundle popup/popup.tsx → dist/popup/popup.js (ESM, browser).
//   5. Copy popup/index.html + popup.css.
//   6. Copy manifest.json (already references the flat dist/ layout).
//   7. Copy / generate icons (16/48/128 PNG — minimal "CK" mark).
//
// Choice: plain esbuild over @crxjs/vite-plugin — see README.md.

import { build } from "esbuild";
import { rm, mkdir, copyFile, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

async function ensureDir(p) {
  await mkdir(p, { recursive: true });
}

async function bundleBackground() {
  await build({
    entryPoints: [path.join(root, "src/background.ts")],
    outfile: path.join(dist, "background.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: ["chrome120", "firefox115"],
    sourcemap: true,
    logLevel: "info",
  });
}

async function bundleContent() {
  await build({
    entryPoints: [path.join(root, "src/content/index.ts")],
    outfile: path.join(dist, "content.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["chrome120", "firefox115"],
    sourcemap: true,
    logLevel: "info",
  });
}

async function bundlePopup() {
  const popupDist = path.join(dist, "popup");
  await ensureDir(popupDist);
  await build({
    entryPoints: [path.join(root, "src/popup/popup.tsx")],
    outfile: path.join(popupDist, "popup.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: ["chrome120", "firefox115"],
    sourcemap: true,
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "info",
  });
  await copyFile(
    path.join(root, "src/popup/index.html"),
    path.join(popupDist, "index.html"),
  );
  await copyFile(
    path.join(root, "src/popup/popup.css"),
    path.join(popupDist, "popup.css"),
  );
}

async function writeManifest() {
  const raw = await readFile(path.join(root, "manifest.json"), "utf8");
  const manifest = JSON.parse(raw);
  // Rewrite paths to match the flat dist/ layout.
  manifest.background.service_worker = "background.js";
  manifest.action.default_popup = "popup/index.html";
  manifest.content_scripts[0].js = ["content.js"];
  manifest.icons = { 16: "icons/16.png", 48: "icons/48.png", 128: "icons/128.png" };
  await writeFile(
    path.join(dist, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
}

async function copyIcons() {
  const srcIcons = path.join(root, "src/icons");
  const dstIcons = path.join(dist, "icons");
  await ensureDir(dstIcons);
  for (const size of [16, 48, 128]) {
    const src = path.join(srcIcons, `${size}.png`);
    if (existsSync(src)) {
      await copyFile(src, path.join(dstIcons, `${size}.png`));
    } else {
      // Generate a 1×1 transparent PNG so Chrome doesn't choke if icons
      // weren't pre-built. Minimal "CK" branding can be added later.
      const transparent1pxPng = Buffer.from(
        "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D49444154789C6300010000000500010D0A2DB40000000049454E44AE426082",
        "hex",
      );
      await writeFile(path.join(dstIcons, `${size}.png`), transparent1pxPng);
    }
  }
}

function generateIcons() {
  // Regenerate src/icons/{16,48,128}.png from the programmatic generator so
  // dist/ always carries fresh, real (non-placeholder) icons.
  const script = path.join(__dirname, "make-icons.mjs");
  const res = spawnSync(process.execPath, [script], { stdio: "inherit" });
  if (res.status !== 0) {
    throw new Error(`make-icons.mjs exited with code ${res.status}`);
  }
}

async function main() {
  await rm(dist, { recursive: true, force: true });
  await ensureDir(dist);
  generateIcons();
  await Promise.all([bundleBackground(), bundleContent(), bundlePopup()]);
  await writeManifest();
  await copyIcons();
  console.log(`Built → ${dist}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
