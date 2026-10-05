import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExceptionalRides,
  createManualEmployeeFromRideAssignment,
  countExceptionalPassengers
} from './exceptionalRides.js';

test('manual department assignment preserves exceptional passenger name and flag for reports', () => {
  const ride = {
    rideId: 368245,
    passengers: 'ולדימיר פולוטרק חריג **',
    pids: [43945],
    date: '25/09/2026',
    source: '[נתבג - טרמינל 3]',
    destination: 'קקל 14, בת ים',
    price: 132
  };

  const employee = createManualEmployeeFromRideAssignment(ride, 43945, 'תפעול');

  assert.deepEqual(employee, {
    employeeId: 43945,
    firstName: 'ולדימיר',
    lastName: 'פולוטרק',
    department: 'תפעול',
    isExceptional: true,
    exceptionalLabel: 'ולדימיר פולוטרק חריג **'
  });
});

test('exceptional rides include manually assigned exceptional employees from updated employee map', () => {
  const ride = {
    rideId: 368245,
    passengers: 'ולדימיר פולוטרק חריג **',
    pids: [43945],
    date: '25/09/2026',
    source: '[נתבג - טרמינל 3]',
    destination: 'קקל 14, בת ים',
    price: 132,
    supplier: 'מוניות דוד חורי'
  };

  const employeeMap = new Map([
    [43945, createManualEmployeeFromRideAssignment(ride, 43945, 'תפעול')]
  ]);

  const exceptionalRides = buildExceptionalRides([ride], employeeMap, new Set());

  assert.equal(exceptionalRides.length, 1);
  assert.equal(exceptionalRides[0].rideId, 368245);
  assert.deepEqual(exceptionalRides[0].exceptionalPassengers, [
    {
      employeeId: 43945,
      name: 'ולדימיר פולוטרק',
      label: 'ולדימיר פולוטרק חריג **',
      department: 'תפעול'
    }
  ]);
});

test('exceptional ride rows stay row-level even when one row has multiple חריג passengers', () => {
  const ride = {
    rideId: 363473,
    passengers: 'מיה לוי 43975; לירן גפני חריג ** 43945; שונית אלשטיין חריג ** 43908;',
    pids: [111, 222, 333]
  };

  const exceptionalRides = buildExceptionalRides([ride], new Map(), new Set());

  assert.equal(exceptionalRides.length, 1, 'there is one visible ride row');
  assert.equal(countExceptionalPassengers(exceptionalRides), 2, 'the row still preserves two exceptional employee labels');
});

test('manual exceptional assignment keeps visible ride rows aligned with exceptional list', () => {
  const normalRide = {
    rideId: 1,
    passengers: 'עובד רגיל 111; עובד חריג חריג ** 222;',
    pids: [111, 222]
  };
  const manuallyAssignedRide = {
    rideId: 2,
    passengers: 'עובד נוסף חריג ** 333;',
    pids: [333]
  };

  const before = buildExceptionalRides([normalRide, manuallyAssignedRide], new Map(), new Set());
  assert.equal(countExceptionalPassengers(before), 2);

  const employeeMap = new Map([
    [333, createManualEmployeeFromRideAssignment(manuallyAssignedRide, 333, 'צק אין')]
  ]);
  const after = buildExceptionalRides([normalRide, manuallyAssignedRide], employeeMap, new Set());

  assert.equal(countExceptionalPassengers(after), 2);
  assert.equal(after.find(ride => ride.rideId === 2).exceptionalPassengers[0].department, 'צק אין');
});

test('exceptional rides are excluded after the ride is removed from review', () => {
  const ride = {
    rideId: 368245,
    passengers: 'ולדימיר פולוטרק חריג **',
    pids: [43945]
  };

  const exceptionalRides = buildExceptionalRides([ride], new Map(), new Set([368245]));

  assert.equal(exceptionalRides.length, 0);
  assert.equal(countExceptionalPassengers(exceptionalRides), 0);
});
