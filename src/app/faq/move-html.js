// move-html.js
import fs from 'fs/promises';
import path from 'path';

const SRC_DIR = 'faq-item';
const DEST_DIR = 'faq-html';

await fs.mkdir(DEST_DIR, { recursive: true });

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
    } else if (entry.isFile()) {
      if (path.extname(entry.name) === '.html') {
        const destName =
          path.join(
            DEST_DIR,
            entry.name
          );
        await fs.copyFile(full, destName);
        console.log('COPIED', full, '->', destName);
      } else {
        await fs.rm(full);
        console.log('DELETED', full);
      }
    }
  }
}

await walk(SRC_DIR);

async function clean(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await clean(full);
      const left = await fs.readdir(full);
      if (left.length === 0) {
        await fs.rmdir(full);
        console.log('REMOVED DIR', full);
      }
    }
  }
}
await clean(SRC_DIR);
console.log('Done!');
