import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRideFile } from './fileParser.js';

const rideSummaryCsv = `שם פרטי,שם משפחה,מספר נוסע,פעיל,זכאי הסעות,מחלקה,יחידה עסקית,סוג נוסע,עיר,עלות,נסיעות,הזמנה,תאריך,שעת משמרת,יום בשבוע,מסלול,סטאטוס,סוג נסיעה,סיבת חריגה,כיוון,משמרת מיוחדת,ספק,חודש,שנה,
אור,אלימלך,43591,on,on,FLOW,,,מודיעין,288.16,3,
אילנה,אברהמי,43382,on,on,FLOW,,,הרצליה,607.88,6,
20% cost,
#,Worker name,Cost,Percent,Accomulated Percent,Ratio from average,
1,אלי יוספיאן,5993.83,1.24%,1.24%,4.32,`;

test('parseRideFile accepts Ride passenger summary CSV exported per passenger', async () => {
  const rides = await parseRideFile(rideSummaryCsv, 'רייד 0626.csv');

  assert.equal(rides.length, 2);
  assert.deepEqual(rides.map(ride => ride.rideId), ['SUMMARY_43591', 'SUMMARY_43382']);
  assert.deepEqual(rides[0].pids, [43591]);
  assert.equal(rides[0].price, 288.16);
  assert.equal(rides[0].tripCount, 3);
  assert.equal(rides[0].isRideSummary, true);
});
