import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRideFile } from './fileParser.js';

test('ride parser falls back to passenger trailing id when history has no pids', async () => {
  const csv = [
    '"_ID","תאריך","מס. נוסעים","תחנות נוסעים חלופיות","נוסעים","מוצא","יעד","ספק","מחיר","היסטוריה"',
    '"367740","23/09/2026 22:20:00","1","|1192from1=23825|1192to1=23168|pcount=0|","כלנית אזולאי 43589;","|נתבג - טרמינל 3|","יוסי בנאי 50 , רמלה","gett","132","|gettorderid=106349165|gettorderstatus=Completed|"'
  ].join('\n');

  const rides = await parseRideFile(csv, 'ride-0926.csv');

  assert.equal(rides.length, 1);
  assert.equal(rides[0].rideId, 367740);
  assert.deepEqual(rides[0].pids, [43589]);
  assert.equal(rides[0].passengers, 'כלנית אזולאי 43589;');
});

test('ride parser does not mix passenger trailing ids into existing history pids', async () => {
  const csv = [
    '"_ID","תאריך","מס. נוסעים","תחנות נוסעים חלופיות","נוסעים","מוצא","יעד","ספק","מחיר","היסטוריה"',
    '"350023","01/06/2026 00:20:00","1","|1486from1=26908|1486to1=23168|","רומי גריצנר 42151;","|נתבג - טרמינל 3|","עמק אילון 117, שוהם","מוניות דוד חורי בעמ","100","|pids=1486,|datesent=31/05/2026 17:59:48|"'
  ].join('\n');

  const rides = await parseRideFile(csv, 'ride.csv');

  assert.equal(rides.length, 1);
  assert.deepEqual(rides[0].pids, [1486]);
});
