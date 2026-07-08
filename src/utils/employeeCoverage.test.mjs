import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEmployeeCoverage, validateEmployeeCoverage } from './employeeCoverage.js';

const makeRides = () => [
  { rideId: 1, pids: [1486, 923, 4824] },
  { rideId: 2, pids: [2874, 1261] },
  { rideId: 3, pids: [760, 789] }
];

test('employee coverage detects a matching employee database', () => {
  const employeeMap = new Map([
    [1486, { department: 'MAAS' }],
    [923, { department: 'צק אין' }],
    [4824, { department: 'FLOW' }],
    [2874, { department: 'נעזרים' }],
    [1261, { department: 'טרקלינים' }],
    [760, { department: 'צק אין' }]
  ]);

  const coverage = validateEmployeeCoverage(makeRides(), employeeMap, { minPassengerRefs: 1, minMatchRate: 0.5 });

  assert.equal(coverage.totalPassengerRefs, 7);
  assert.equal(coverage.matchedPassengerRefs, 6);
  assert.equal(coverage.unmatchedPassengerRefs, 1);
  assert.equal(coverage.matchRate, 6 / 7);
});

test('employee coverage rejects a wrong employee database before department breakdown', () => {
  const wrongEmployeeMap = new Map([
    [1111, { department: 'פקחי רחבה' }],
    [2222, { department: 'OCC' }]
  ]);

  assert.throws(
    () => validateEmployeeCoverage(makeRides(), wrongEmployeeMap, { minPassengerRefs: 1, minMatchRate: 0.5 }),
    /קובץ מסד העובדים לא נראה תואם לקובץ הרייד.*0 מתוך 7/
  );
});

test('employee coverage ignores empty ride data so upload order stays flexible', () => {
  const coverage = validateEmployeeCoverage([], new Map(), { minPassengerRefs: 1, minMatchRate: 0.5 });

  assert.equal(coverage.totalPassengerRefs, 0);
  assert.equal(coverage.matchRate, 1);
});
