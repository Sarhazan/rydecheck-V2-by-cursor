import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRideFile } from './fileParser.js';

test('ride parser extracts Gett order id from history as supplierOrderNumber', async () => {
  const csv = [
    '"_ID","תאריך","מס. נוסעים","נוסעים","מוצא","יעד","ספק","מחיר","היסטוריה"',
    '"367398","19/09/2026 17:03:00","1","עידו מקסימוב 39862;","תרצב 34, חולון","|נתבג - טרמינל 3|","gett","132","|pids=791,|gettorderid=106062629|gettorderstatus=Completed|"'
  ].join('\n');

  const rides = await parseRideFile(csv, 'ride.csv');

  assert.equal(rides[0].supplierOrderNumber, '106062629');
});
