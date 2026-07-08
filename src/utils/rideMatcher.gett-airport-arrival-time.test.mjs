import test from 'node:test';
import assert from 'node:assert/strict';
import { matchGettToRides } from './rideMatcher.js';

test('gett regression: matches airport ride when Gett time is arrival and Ride time is pickup', () => {
  const gettData = [{
    date: '2026-06-01',
    time: '20:36',
    orderNumber: '94163885',
    source: 'תחנת רכבת סבידור מרכז',
    destination: 'נתבג טרמינל 3',
    passengers: 'עילי וסרמן',
    price: 123.24
  }];

  const rides = [{
    rideId: 350120,
    date: '01/06/2026 20:15:00',
    source: 'תחנת רכבת סבידור מרכז',
    destination: '|נתבג - טרמינל 3|',
    passengers: 'עילי וסרמן 43602;',
    pids: [],
    supplier: 'gett',
    price: 123.24
  }];

  const matches = matchGettToRides(gettData, rides, new Map());
  const gettMatch = matches.find(match => match.supplierData?.orderNumber === '94163885');

  assert.equal(gettMatch?.status, 'matched');
  assert.equal(gettMatch?.ride?.rideId, 350120);
});
