import test from 'node:test';
import assert from 'node:assert/strict';
import { formatRideDateTime } from './dateFormatter.js';

test('formatRideDateTime keeps Ride DD/MM/YYYY dates day-first and includes HH:MM', () => {
  assert.equal(formatRideDateTime('07/06/2026 06:15:00'), '07.06.2026 06:15');
});

test('formatRideDateTime supports dotted Hebrew display dates with two digit years', () => {
  assert.equal(formatRideDateTime('07.06.26', '06:15'), '07.06.2026 06:15');
});

test('formatRideDateTime does not let JavaScript swap day and month for ambiguous dates', () => {
  assert.equal(formatRideDateTime('06/07/2026 06:15:00'), '06.07.2026 06:15');
});

test('formatRideDateTime falls back to original text for unrecognized dates', () => {
  assert.equal(formatRideDateTime('not-a-date', '06:15'), 'not-a-date 06:15');
});
