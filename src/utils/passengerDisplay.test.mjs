import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPassengerDisplay } from './passengerDisplay.js';

const employeeMap = new Map([
  [43589, { employeeId: 12448, firstName: 'כלנית ', lastName: 'אזולאי ' }],
  ['43589', { employeeId: 12448, firstName: 'כלנית ', lastName: 'אזולאי ' }],
  [101, { employeeId: 101, firstName: 'ארתי', lastName: 'דניאל' }],
  [102, { employeeId: 102, firstName: 'רומי', lastName: 'גריצנר' }]
]);

test('formats passenger name with trailing passenger number once', () => {
  assert.equal(
    formatPassengerDisplay('כלנית אזולאי 43589;', employeeMap),
    'כלנית אזולאי'
  );
});

test('does not duplicate name words when trailing id has employee alias', () => {
  assert.equal(
    formatPassengerDisplay('ארתי דניאל 101;', employeeMap),
    'ארתי דניאל'
  );
});

test('formats multiple passenger name/id pairs without duplicating each name', () => {
  assert.equal(
    formatPassengerDisplay('ארתי דניאל 101; רומי גריצנר 102;', employeeMap),
    'ארתי דניאל, רומי גריצנר'
  );
});

test('formats raw pid lists through employee map', () => {
  assert.equal(formatPassengerDisplay('101,102', employeeMap), 'ארתי דניאל, רומי גריצנר');
});
