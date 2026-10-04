import test from 'node:test';
import assert from 'node:assert/strict';
import { matchGettToRides } from './rideMatcher.js';

test('gett regression: exact Gett order id with shared passenger matches even when shared-trip stops differ', () => {
  const ride = {
    rideId: 362915,
    date: '03/09/2026 00:15:00',
    passengers: 'שרונה** בר נוי 42477; רונה  מועלם  44108;',
    passengerCount: 2,
    pids: [3243, 13908],
    source: '|נתבג - טרמינל 3|',
    destination: 'אברהם דוד ליכטמן 3 , ירושלים',
    price: 314.89,
    supplier: 'gett',
    supplierOrderNumber: '104146155',
    rawData: {
      אזורים: 'נתבג;מודיעין;ירושלים ;'
    }
  };

  const gettRide = {
    date: '2026-09-03',
    time: '00:15',
    orderNumber: '104146155',
    status: 'הנסיעה הסתיימה',
    source: 'טרמינל 1 נתב"ג, Airport/Termin 1, Israel',
    destination: 'עמק זבולון 1, מודיעין',
    passengers: 'שרונה** בר נוי,רונה  מועלם',
    price: 379.81
  };

  const employeeMap = new Map([
    [13908, { employeeId: 13908, firstName: 'רונה', lastName: 'מועלם' }]
  ]);

  const matches = matchGettToRides([gettRide], [ride], employeeMap);
  const match = matches.find(result => result.supplierData?.orderNumber === '104146155');

  assert.equal(match?.status, 'matched');
  assert.equal(match?.ride?.rideId, 362915);
  assert.equal(match?.priceDifference, Math.abs(314.89 - 379.81));
});
