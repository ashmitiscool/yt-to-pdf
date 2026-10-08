const assert = require('assert');
const { calculateNextVersion } = require('../scripts/bump-version.js');

console.log('=== Running Bump-Version CLI Tests ===\n');

// Test 1: calculateNextVersion handles patch
{
  const next = calculateNextVersion('1.1.1', 'patch');
  assert.strictEqual(next, '1.1.2', 'Patch should increment last digit');
  const nextDefault = calculateNextVersion('1.1.1', '');
  assert.strictEqual(nextDefault, '1.1.2', 'Empty string should default to patch');
  console.log('✔ Test 1 Passed: Patch version calculation is correct');
}

// Test 2: calculateNextVersion handles minor
{
  const next = calculateNextVersion('1.1.1', 'minor');
  assert.strictEqual(next, '1.2.0', 'Minor should increment middle digit and reset patch');
  console.log('✔ Test 2 Passed: Minor version calculation is correct');
}

// Test 3: calculateNextVersion handles major
{
  const next = calculateNextVersion('1.1.1', 'major');
  assert.strictEqual(next, '2.0.0', 'Major should increment first digit and reset minor and patch');
  console.log('✔ Test 3 Passed: Major version calculation is correct');
}

// Test 4: calculateNextVersion handles explicit semver strings (with or without 'v')
{
  const custom1 = calculateNextVersion('1.1.1', '1.5.0');
  assert.strictEqual(custom1, '1.5.0', 'Custom semver string should be accepted');

  const custom2 = calculateNextVersion('1.1.1', 'v2.3.4');
  assert.strictEqual(custom2, '2.3.4', 'Leading v prefix should be stripped');

  console.log('✔ Test 4 Passed: Explicit SemVer string input works as expected');
}

// Test 5: calculateNextVersion rejects invalid formats
{
  assert.throws(() => {
    calculateNextVersion('1.1.1', 'invalid_string');
  }, /Invalid version format/, 'Invalid format should throw an error');

  assert.throws(() => {
    calculateNextVersion('1.1.1', '1.2');
  }, /Invalid version format/, 'Incomplete semver should throw an error');

  console.log('✔ Test 5 Passed: Invalid version inputs are rejected cleanly');
}

console.log('\n✅ All Bump-Version tests passed successfully!\n');
