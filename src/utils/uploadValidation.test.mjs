import test from 'node:test';
import assert from 'node:assert/strict';
import { validateParsedUpload } from './uploadValidation.js';

test('ride upload validation rejects files that parse to zero rides', () => {
  assert.throws(
    () => validateParsedUpload([], 'ride'),
    /קובץ רייד לא מכיל נסיעות תקינות/
  );
});

test('ride upload validation accepts parsed ride rows', () => {
  assert.doesNotThrow(() => validateParsedUpload([{ rideId: 123 }], 'ride'));
});

test('employees upload validation rejects empty employee map', () => {
  assert.throws(
    () => validateParsedUpload({ employees: [], employeeMap: new Map() }, 'employees'),
    /קובץ מסד עובדים לא מכיל עובדים תקינים/
  );
});
