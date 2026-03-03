import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRideFile } from './fileParser.js';

test('ride parser: extracts passengerCount from "מס. נוסעים" column', async () => {
  const csv = [
    '_ID,תאריך,מס. נוסעים,נוסעים,תחנות נוסעים חלופיות,מוצא,יעד,מחיר,ספק',
    '342269,08/02/2026 23:16:29,0,,"|pids=3118,|",A,B,160,מוניות דוד חורי בעמ'
  ].join('\n');

  const rides = await parseRideFile(csv, 'ride.csv');
  assert.equal(rides.length, 1);
  assert.equal(rides[0].rideId, 342269);
  assert.equal(rides[0].passengerCount, 0);
  assert.deepEqual(rides[0].pids, [3118]);
});
