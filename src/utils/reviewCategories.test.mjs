import test from 'node:test';
import assert from 'node:assert/strict';
import { isRideWithoutPassengers } from './reviewCategories.js';

test('no-passengers regression: explicit passengerCount=0 must win even if pids exist (rides 342269 + 342519-like)', () => {
  const rides = [
    {
      rideId: 342269,
      passengers: '',
      passengerCount: 0,
      pids: [3118]
    },
    {
      rideId: 342519,
      passengers: '',
      passengerCount: 0,
      pids: [3468]
    }
  ];

  rides.forEach(ride => {
    assert.equal(isRideWithoutPassengers(ride), true, `ride ${ride.rideId} should be no-passengers`);
  });
});

test('no-passengers: ride with real passengers should not be classified as no-passengers', () => {
  const ride = {
    rideId: 999,
    passengers: 'ישראל ישראלי',
    passengerCount: 1,
    pids: [1234]
  };

  assert.equal(isRideWithoutPassengers(ride), false);
});

test('no-passengers: empty pids and empty passengers remains classified as no-passengers', () => {
  const ride = {
    rideId: 1000,
    passengers: '-',
    passengerCount: null,
    pids: []
  };

  assert.equal(isRideWithoutPassengers(ride), true);
});
