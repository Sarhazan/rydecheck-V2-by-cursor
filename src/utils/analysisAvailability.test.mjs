import test from 'node:test';
import assert from 'node:assert/strict';
import { canRunAnalysis } from './analysisAvailability.js';

test('enables analysis after a ride file was uploaded even before parsed ride rows exist', () => {
  const result = canRunAnalysis({
    isAnalyzing: false,
    files: { ride: { name: 'רייד 0626.csv' } },
    parsedData: { rides: [] },
    manuallyAddedRides: new Map()
  });

  assert.equal(result, true);
});

test('keeps analysis disabled when no ride file or rides exist', () => {
  const result = canRunAnalysis({
    isAnalyzing: false,
    files: { ride: null },
    parsedData: { rides: [] },
    manuallyAddedRides: new Map()
  });

  assert.equal(result, false);
});

test('keeps analysis disabled while analysis is already running', () => {
  const result = canRunAnalysis({
    isAnalyzing: true,
    files: { ride: { name: 'רייד 0626.csv' } },
    parsedData: { rides: [] },
    manuallyAddedRides: new Map()
  });

  assert.equal(result, false);
});
