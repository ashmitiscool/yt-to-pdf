const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const MANIFEST_PATH = path.join(ROOT_DIR, 'manifest.json');

const INCLUDED_PATHS = [
  'manifest.json',
  'icons',
  'lib',
  'src'
];

function addFileOrDirToZip(zip, relativePath) {
  const fullPath = path.join(ROOT_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File or directory does not exist: ${fullPath}`);
  }

  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    const entries = fs.readdirSync(fullPath);
    for (const entry of entries) {
      const childRelativePath = path.join(relativePath, entry);
      addFileOrDirToZip(zip, childRelativePath);
    }
  } else {
    const fileContent = fs.readFileSync(fullPath);
    // Ensure POSIX style path separators in ZIP archive
    const zipPath = relativePath.replace(/\\/g, '/');
    zip.file(zipPath, fileContent);
  }
}

async function buildPackage() {
  console.log('📦 Starting extension packaging...');

  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`manifest.json not found at: ${MANIFEST_PATH}`);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  const version = manifest.version || '1.0.0';
  const name = manifest.name ? manifest.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'extension';

  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  const zip = new JSZip();

  for (const item of INCLUDED_PATHS) {
    console.log(`  + Adding: ${item}`);
    addFileOrDirToZip(zip, item);
  }

  const zipFilename = `${name}-v${version}.zip`;
  const distZipPath = path.join(DIST_DIR, zipFilename);
  const rootZipPath = path.join(ROOT_DIR, `${name}.zip`);

  console.log(`\n⏳ Generating ZIP archive...`);
  const content = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  fs.writeFileSync(distZipPath, content);
  fs.writeFileSync(rootZipPath, content);

  const stats = fs.statSync(distZipPath);
  const sizeKb = (stats.size / 1024).toFixed(2);

  console.log(`\n✅ Packaging successful!`);
  console.log(`   - Output 1: ${distZipPath} (${sizeKb} KB)`);
  console.log(`   - Output 2: ${rootZipPath} (${sizeKb} KB)`);
  console.log(`\n📋 Included files:`);
  Object.keys(zip.files).forEach((filePath) => {
    console.log(`     ✓ ${filePath}`);
  });
}

buildPackage().catch((err) => {
  console.error('❌ Packaging failed:', err);
  process.exit(1);
});
