import test from 'node:test';
import assert from 'node:assert/strict';
import { countLoadedRideTrips } from './rideCounts.js';

test('countLoadedRideTrips returns row count for regular ride exports', () => {
  assert.equal(countLoadedRideTrips([{ rideId: 1 }, { rideId: 2 }]), 2);
});

test('countLoadedRideTrips sums tripCount for Ride passenger summary exports', () => {
  const rides = [
    { rideId: 'SUMMARY_43591', isRideSummary: true, tripCount: 3 },
    { rideId: 'SUMMARY_43382', isRideSummary: true, tripCount: 6 },
    { rideId: 'SUMMARY_42784', isRideSummary: true, tripCount: 28 }
  ];

  assert.equal(countLoadedRideTrips(rides), 37);
});
