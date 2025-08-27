const fs = require('fs');
const path = require('path');

// Generate version info
const now = new Date();
const version = "1.0.1"; // You can read this from package.json if needed
const build = now.toISOString().replace(/[-:T]/g, '').split('.')[0]; // YYYYMMDDHHMMSS format
const deployTime = now.toISOString();

const versionInfo = {
  version: version,
  deployTime: deployTime,
  build: build,
  description: "Auto-generated version file for cache invalidation"
};

// Write to assets/data/version.json
const versionPath = path.join(__dirname, '..', 'src', 'assets', 'data', 'version.json');

// Ensure directory exists
const dir = path.dirname(versionPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Write version file
fs.writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2));

console.log('✅ Version file generated:', versionInfo);
console.log('📁 Written to:', versionPath);