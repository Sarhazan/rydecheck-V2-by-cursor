import test from 'node:test';
import assert from 'node:assert/strict';
import { matchGettToRides } from './rideMatcher.js';

test('gett regression: Ride 362920 matches Gett 104143903 from airport to Netanya station', () => {
  const gettRide = {
    date: '2026-09-03',
    time: '05:05',
    orderNumber: '104143903',
    status: 'הנסיעה הסתיימה',
    source: 'טרמינל 3 נתבג - טרמינל 3',
    destination: 'תחנת רכבת נתניה',
    passengers: 'ליה  עבאדי',
    price: 269.5
  };

  const ride = {
    rideId: 362920,
    date: '03/09/2026 05:25:00',
    passengers: 'ליה  עבאדי 43829;',
    passengerCount: 1,
    pids: [12712],
    source: '|נתבג - טרמינל 3|',
    destination: 'תחנת רכבת נתניה',
    price: 269.5,
    supplier: 'gett',
    supplierOrderNumber: '104143903'
  };

  const employeeMap = new Map([
    [12712, { employeeId: 12712, firstName: 'ליה', lastName: 'עבאדי' }]
  ]);

  const matches = matchGettToRides([gettRide], [ride], employeeMap);
  const match = matches.find(result => result.supplierData?.orderNumber === '104143903');

  assert.equal(match?.status, 'matched');
  assert.equal(match?.ride?.rideId, 362920);
  assert.equal(match?.priceDifference, 0);
});
