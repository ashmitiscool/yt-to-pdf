const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT_DIR, 'manifest.json');
const PACKAGE_PATH = path.join(ROOT_DIR, 'package.json');
const PACKAGE_LOCK_PATH = path.join(ROOT_DIR, 'package-lock.json');
const ARCHITECTURE_PATH = path.join(ROOT_DIR, 'ARCHITECTURE.md');

function getCurrentVersion() {
  if (fs.existsSync(MANIFEST_PATH)) {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    if (manifest.version) return manifest.version;
  }
  if (fs.existsSync(PACKAGE_PATH)) {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf-8'));
    if (pkg.version) return pkg.version;
  }
  return '1.0.0';
}

function calculateNextVersion(currentVersion, input) {
  const cleanInput = (input || '').trim().replace(/^v/i, '').toLowerCase();

  const semverParts = currentVersion.split('.').map((p) => parseInt(p, 10));
  while (semverParts.length < 3) semverParts.push(0);
  const [major, minor, patch] = semverParts;

  if (cleanInput === 'patch' || cleanInput === '') {
    return `${major}.${minor}.${patch + 1}`;
  }
  if (cleanInput === 'minor') {
    return `${major}.${minor + 1}.0`;
  }
  if (cleanInput === 'major') {
    return `${major + 1}.0.0`;
  }

  const directVersionMatch = cleanInput.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (directVersionMatch) {
    return `${parseInt(directVersionMatch[1], 10)}.${parseInt(directVersionMatch[2], 10)}.${parseInt(directVersionMatch[3], 10)}`;
  }

  throw new Error(`Invalid version format: "${input}". Expected 'patch', 'minor', 'major', or a valid SemVer format like '1.2.3'.`);
}

function updateJsonFile(filePath, updateFn) {
  if (!fs.existsSync(filePath)) return false;
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);
  updateFn(data);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  return true;
}

function updateArchitectureTree(newVersion) {
  if (!fs.existsSync(ARCHITECTURE_PATH)) return false;
  let content = fs.readFileSync(ARCHITECTURE_PATH, 'utf-8');

  const zipName = `yt-to-pdf-v${newVersion}.zip`;
  if (content.includes(zipName)) {
    return true; // Already present
  }

  // Find dist tree block
  const distTreeRegex = /(├── dist\/[^\n]*\n)((?:│   [├└]── [^\n]+\n)+)/;
  const match = content.match(distTreeRegex);

  if (match) {
    let distEntries = match[2];
    // Convert any final └── into ├── in the existing list
    distEntries = distEntries.replace(/│   └── /g, '│   ├── ');
    // Append the new version with └──
    distEntries += `│   └── ${zipName}\n`;
    content = content.replace(match[0], `${match[1]}${distEntries}`);
    fs.writeFileSync(ARCHITECTURE_PATH, content, 'utf-8');
    return true;
  }

  return false;
}

function bumpVersion(versionInput, options = {}) {
  const currentVersion = getCurrentVersion();
  const nextVersion = calculateNextVersion(currentVersion, versionInput);

  console.log(`\n🚀 Bumping version: ${currentVersion} ➔ ${nextVersion}\n`);

  // 1. Update manifest.json
  const manifestUpdated = updateJsonFile(MANIFEST_PATH, (data) => {
    data.version = nextVersion;
  });
  if (manifestUpdated) console.log(`  ✔ Updated manifest.json -> ${nextVersion}`);

  // 2. Update package.json
  const packageUpdated = updateJsonFile(PACKAGE_PATH, (data) => {
    data.version = nextVersion;
    if (data.name === 'yt-to-ppt') data.name = 'yt-to-pdf';
  });
  if (packageUpdated) console.log(`  ✔ Updated package.json -> ${nextVersion}`);

  // 3. Update package-lock.json
  const lockUpdated = updateJsonFile(PACKAGE_LOCK_PATH, (data) => {
    data.version = nextVersion;
    if (data.name === 'yt-to-ppt') data.name = 'yt-to-pdf';
    if (data.packages && data.packages['']) {
      data.packages[''].version = nextVersion;
      if (data.packages[''].name === 'yt-to-ppt') data.packages[''].name = 'yt-to-pdf';
    }
  });
  if (lockUpdated) console.log(`  ✔ Updated package-lock.json -> ${nextVersion}`);

  // 4. Update ARCHITECTURE.md
  const archUpdated = updateArchitectureTree(nextVersion);
  if (archUpdated) console.log(`  ✔ Updated ARCHITECTURE.md dist tree -> ${nextVersion}`);

  // 5. Package if requested
  if (options.package) {
    console.log('\n📦 Running package build...');
    try {
      execSync('node scripts/package.js', { cwd: ROOT_DIR, stdio: 'inherit' });
    } catch (err) {
      console.error('❌ Package build failed:', err.message);
    }
  }

  console.log(`\n✨ Version successfully bumped to v${nextVersion}!\n`);
  return nextVersion;
}

async function promptInteractive() {
  const currentVersion = getCurrentVersion();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  console.log(`\n========================================`);
  console.log(`       YT to PDF Version Bump CLI       `);
  console.log(`========================================`);
  console.log(`Current version: \x1b[36m${currentVersion}\x1b[0m\n`);

  const nextPatch = calculateNextVersion(currentVersion, 'patch');
  const nextMinor = calculateNextVersion(currentVersion, 'minor');
  const nextMajor = calculateNextVersion(currentVersion, 'major');

  console.log(`Options:`);
  console.log(`  [1] patch   -> ${nextPatch} (default)`);
  console.log(`  [2] minor   -> ${nextMinor}`);
  console.log(`  [3] major   -> ${nextMajor}`);
  console.log(`  [4] Custom  -> e.g. 1.2.5\n`);

  const answer = await question(`Enter choice [1/2/3/4 or version] (default: patch): `);
  let chosenVersion = answer.trim();
  if (chosenVersion === '1' || chosenVersion === '') chosenVersion = 'patch';
  else if (chosenVersion === '2') chosenVersion = 'minor';
  else if (chosenVersion === '3') chosenVersion = 'major';

  const shouldPackageAnswer = await question(`Build production ZIP package now? [Y/n]: `);
  const shouldPackage = shouldPackageAnswer.trim().toLowerCase() !== 'n';

  rl.close();

  bumpVersion(chosenVersion, { package: shouldPackage });
}

function main() {
  const args = process.argv.slice(2);
  const shouldNotPackage = args.includes('--no-package');
  const positionalArgs = args.filter((arg) => !arg.startsWith('--'));

  if (positionalArgs.length > 0) {
    const versionInput = positionalArgs[0];
    bumpVersion(versionInput, { package: !shouldNotPackage });
  } else {
    promptInteractive().catch((err) => {
      console.error('❌ Error during version bump:', err.message);
      process.exit(1);
    });
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  getCurrentVersion,
  calculateNextVersion,
  bumpVersion,
  updateArchitectureTree
};
