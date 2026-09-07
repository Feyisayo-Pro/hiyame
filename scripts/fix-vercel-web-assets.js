#!/usr/bin/env node
// Vercel CLI hardcodes "node_modules" in its default ignore list (see
// https://vercel.com/docs/builds/build-features#ignored-files-and-folders) — it is
// NOT overridable via .vercelignore. Expo's static web export nests vendored icon
// fonts and its own internal PNGs under dist/assets/node_modules/..., so every one
// of those files silently 404s once deployed, even though the local export is fine.
//
// This renames that folder to dist/assets/vendor and rewrites every reference to
// the old path inside the exported bundles so nothing breaks. Run after every
// `expo export -p web` (wired into `npm run web:build`).
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const OLD_SEGMENT = 'assets/node_modules';
const NEW_SEGMENT = 'assets/vendor';
const oldDir = path.join(DIST, 'assets', 'node_modules');
const newDir = path.join(DIST, 'assets', 'vendor');

if (!fs.existsSync(oldDir)) {
  console.log('[fix-vercel-web-assets] Nothing to do — no dist/assets/node_modules found.');
  process.exit(0);
}

fs.renameSync(oldDir, newDir);
console.log(`[fix-vercel-web-assets] Renamed ${oldDir} -> ${newDir}`);

const TEXT_EXTENSIONS = new Set(['.js', '.html', '.json', '.css', '.map']);
let filesPatched = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!TEXT_EXTENSIONS.has(path.extname(entry.name))) continue;
    const contents = fs.readFileSync(full, 'utf8');
    if (!contents.includes(OLD_SEGMENT)) continue;
    fs.writeFileSync(full, contents.split(OLD_SEGMENT).join(NEW_SEGMENT));
    filesPatched++;
  }
}

walk(DIST);
console.log(`[fix-vercel-web-assets] Patched ${OLD_SEGMENT} -> ${NEW_SEGMENT} references in ${filesPatched} file(s).`);
