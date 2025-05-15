#!/usr/bin/env node
/**
 * 批量生成 <母项>/<子项>.html 占位文件
 * ─────────────────────────────────────
 */

const fs   = require('fs');
const path = require('path');

/* 路径配置 --------------------------------------------------------- */
const navPath = path.resolve(__dirname, '../assets/data/admin-sidebar.json');
const outRoot = path.resolve(__dirname, '../app/admin-guide/admin-guide-item');

/* 模板 ------------------------------------------------------------- */
const template = (title) => `<!-- ${title} -->
<h1>${title}</h1>
<p>📝 在这里撰写指南内容…</p>
`;

/* slug 规则 -------------------------------------------------------- */
const slug = (s) =>
  s.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

/* 读取导航 JSON ---------------------------------------------------- */
if (!fs.existsSync(navPath)) {
  console.error(`❌ nav 文件缺失: ${navPath}`);
  process.exit(1);
}
const navJson = JSON.parse(fs.readFileSync(navPath, 'utf-8'));

/* 生成文件 -------------------------------------------------------- */
let created = 0;

function ensureFile(relDir, item) {
  const dirPath  = path.join(outRoot, relDir);
  const filePath = path.join(dirPath, `${slug(item)}.html`);
  fs.mkdirSync(dirPath, { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, template(item), 'utf-8');
    created++;
  }
}

/* 遍历导航结构 ------------------------------------------------------ */
for (const [parent, value] of Object.entries(navJson)) {
  const parentDir = slug(parent);

  if (Array.isArray(value)) {
    value.forEach((item) => ensureFile(parentDir, item));
  } else {
    // 第二层，如 Executable -> { Examples: [...], Operations: [...] }
    for (const [sub, arr] of Object.entries(value)) {
      const subDir = path.join(parentDir, slug(sub));
      arr.forEach((item) => ensureFile(subDir, item));
    }
  }
}

console.log(`✅ 创建完成，新增 ${created} 个文件。`);
