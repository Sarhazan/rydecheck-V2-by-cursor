import test from 'node:test';
import assert from 'node:assert/strict';
import { matchGettToRides } from './rideMatcher.js';

const employeeMap = new Map([
  [13908, { employeeId: 13908, firstName: 'רונה', lastName: 'מועלם' }]
]);

test('gett airport direction: from airport matches by final destination address', () => {
  const gettRide = {
    date: '2026-09-03',
    time: '00:15',
    orderNumber: '104146155',
    status: 'הנסיעה הסתיימה',
    source: 'טרמינל 1 נתב"ג, Airport/Termin 1, Israel',
    destination: 'משה לוי 19, רמלה',
    passengers: 'שרונה** בר נוי,רונה  מועלם',
    price: 379.81
  };

  const ride = {
    rideId: 362915,
    date: '03/09/2026 00:15:00',
    passengers: 'שרונה** בר נוי 42477; רונה  מועלם  44108;',
    passengerCount: 2,
    pids: [3243, 13908],
    source: '|נתבג - טרמינל 3|',
    destination: 'משה לוי 19, רמלה',
    price: 314.89,
    supplier: 'gett'
  };

  const matches = matchGettToRides([gettRide], [ride], employeeMap);
  const match = matches.find(result => result.supplierData?.orderNumber === '104146155');

  assert.equal(match?.status, 'matched');
  assert.equal(match?.ride?.rideId, 362915);
});

test('gett airport direction: from airport does not match by airport terminal or unrelated intermediate area', () => {
  const gettRide = {
    date: '2026-09-03',
    time: '00:15',
    orderNumber: '104146155',
    status: 'הנסיעה הסתיימה',
    source: 'טרמינל 1 נתב"ג, Airport/Termin 1, Israel',
    destination: 'משה לוי 19, רמלה',
    passengers: 'שרונה** בר נוי,רונה  מועלם',
    price: 379.81
  };

  const ride = {
    rideId: 362915,
    date: '03/09/2026 00:15:00',
    passengers: 'שרונה** בר נוי 42477; רונה  מועלם  44108;',
    passengerCount: 2,
    pids: [3243, 13908],
    source: '|נתבג - טרמינל 3|',
    destination: 'אברהם דוד ליכטמן 3, ירושלים',
    price: 314.89,
    supplier: 'gett',
    rawData: {
      אזורים: 'נתבג;רמלה;ירושלים ;'
    }
  };

  const matches = matchGettToRides([gettRide], [ride], employeeMap);
  const match = matches.find(result => result.supplierData?.orderNumber === '104146155');

  assert.equal(match?.status, 'missing_in_ride');
  assert.equal(match?.ride, null);
});

test('gett airport direction: to airport matches by first pickup/source address', () => {
  const gettRide = {
    date: '2026-09-03',
    time: '00:15',
    orderNumber: '104146156',
    status: 'הנסיעה הסתיימה',
    source: 'משה לוי 19, רמלה',
    destination: 'טרמינל 3 נתב"ג, Israel',
    passengers: 'שרונה** בר נוי,רונה  מועלם',
    price: 379.81
  };

  const ride = {
    rideId: 362916,
    date: '03/09/2026 00:35:00',
    passengers: 'שרונה** בר נוי 42477; רונה  מועלם  44108;',
    passengerCount: 2,
    pids: [3243, 13908],
    source: 'משה לוי 19, רמלה',
    destination: '|נתבג - טרמינל 1|',
    price: 314.89,
    supplier: 'gett'
  };

  const matches = matchGettToRides([gettRide], [ride], employeeMap);
  const match = matches.find(result => result.supplierData?.orderNumber === '104146156');

  assert.equal(match?.status, 'matched');
  assert.equal(match?.ride?.rideId, 362916);
});
