const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'images') continue;
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, fileList);
    } else if (file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.html')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = getFiles(ROOT_DIR);
console.log(`[CWS Compliance Audit] Scanning ${files.length} project files...`);

let issuesFound = 0;

for (const f of files) {
  const rel = path.relative(ROOT_DIR, f);
  if (rel === path.join('scripts', 'audit_compliance.js')) continue;

  const content = fs.readFileSync(f, 'utf8');

  // Strip block comments and line comments for code analysis
  const strippedCode = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '');

  // Check 1: Prohibited remote script tags or dynamic script element creation
  const scriptCreations = strippedCode.match(/createElement\s*\(\s*['"]script['"]/gi) || [];
  if (scriptCreations.length > 0) {
    console.error(`❌ [Blue Argon] Remote script creation detected in ${rel}: ${scriptCreations.length} occurrence(s)`);
    issuesFound++;
  }

  // Check 2: External CDNs
  const cdnMatches = strippedCode.match(/https?:\/\/(cdnjs|unpkg|cdn\.jsdelivr|ajax\.googleapis)[^\s"\'`<>]*/gi) || [];
  if (cdnMatches.length > 0) {
    console.error(`❌ [Blue Argon] External CDN URL detected in ${rel}:`, cdnMatches);
    issuesFound++;
  }

  // Check 3: External script URL references in executable code
  const jsUrls = (strippedCode.match(/https?:\/\/[^\s"\'`<>]+\.js/gi) || []).filter(u => !u.includes('schema.org') && !u.includes('w3.org'));
  if (jsUrls.length > 0) {
    console.error(`❌ [Blue Argon] External JavaScript URL found in executable code in ${rel}:`, jsUrls);
    issuesFound++;
  }
}

// Check manifest permissions
const manifestPath = path.join(ROOT_DIR, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const permissions = manifest.permissions || [];
  const prohibitedUnused = ['downloads', 'scripting', 'tabs', 'activeTab'];
  for (const p of prohibitedUnused) {
    if (permissions.includes(p)) {
      console.error(`❌ [Purple Potassium] Unused/redundant permission '${p}' found in manifest.json!`);
      issuesFound++;
    }
  }
}

if (issuesFound === 0) {
  console.log('✅ [CWS Compliance Audit] All checks passed! Zero violations detected.');
  process.exit(0);
} else {
  console.error(`\n❌ [CWS Compliance Audit] Found ${issuesFound} compliance issues. Please rectify before publishing.`);
  process.exit(1);
}
