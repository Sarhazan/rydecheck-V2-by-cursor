import test from 'node:test';
import assert from 'node:assert/strict';
import { matchHoriToRides } from './rideMatcher.js';

const countStatuses = (matches) => ({
  matched: matches.filter((m) => m.status === 'matched' || m.status === 'price_difference').length,
  missingInSupplier: matches.filter((m) => m.status === 'missing_in_supplier').length,
  missingInRide: matches.filter((m) => m.status === 'missing_in_ride').length
});

test('hori regression: avoid all-missing when trip code differs but visa maps to rideId', () => {
  const rides = [
    { rideId: 341343, price: 205, supplier: 'חורי', date: '2/1/26' },
    { rideId: 341339, price: 290, supplier: 'מוניות דוד חורי', date: '2/1/26' },
    { rideId: 341340, price: 220, supplier: 'חורי', date: '2/1/26' }
  ];

  const horiData = [
    // tripNumber/tripCode (168xxxx) לא תואם rideId, אבל visaNumber כן
    { tripNumber: 1683824, tripCode: 1683824, visaNumber: 341343, price: 205, date: '2/1/26' },
    { tripNumber: 1683821, tripCode: 1683821, visaNumber: 341339, price: 290, date: '2/1/26' },
    // אין התאמה ברייד -> missing_in_ride
    { tripNumber: 1683999, tripCode: 1683999, visaNumber: 999999, price: 150, date: '2/1/26' }
  ];

  const matches = matchHoriToRides(horiData, rides);
  const summary = countStatuses(matches);

  assert.deepEqual(summary, {
    matched: 2,
    missingInSupplier: 1,
    missingInRide: 1
  });

  // הגנה מרגרסיית all-missing
  assert.notEqual(summary.matched, 0);
  assert.notEqual(summary.missingInSupplier, rides.length);
  assert.notEqual(summary.missingInRide, horiData.length);
});
