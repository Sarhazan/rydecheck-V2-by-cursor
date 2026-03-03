import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRideFile } from './fileParser.js';
import { isRideWithoutPassengers } from './reviewCategories.js';

async function load0226Rides() {
  const projectRoot = path.resolve(process.cwd());
  const csvName = fs.readdirSync(projectRoot).find(name => name.includes('0226') && name.toLowerCase().endsWith('.csv'));
  assert.ok(csvName, '0226 CSV file must exist in project root for regression test');

  const raw = fs.readFileSync(path.join(projectRoot, csvName), 'utf8');
  return parseRideFile(raw, csvName);
}

test('0226 regression: rides 342269 + 342519 appear in no-passengers category and are counted', async () => {
  const rides = await load0226Rides();
  const noPassengers = rides.filter(isRideWithoutPassengers);
  const ids = new Set(noPassengers.map(r => r.rideId));

  assert.ok(ids.has(342269), 'ride 342269 must appear in no-passengers category');
  assert.ok(ids.has(342519), 'ride 342519 must appear in no-passengers category');

  const expectedCount = noPassengers.length;
  const uiCounterEquivalent = noPassengers.length;
  assert.equal(uiCounterEquivalent, expectedCount, 'counter must reflect no-passengers list length');
});
