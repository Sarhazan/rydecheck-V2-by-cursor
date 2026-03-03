import test from 'node:test';
import assert from 'node:assert/strict';
import { isSummaryRow, parseHoriTripNumber } from './fileParser.js';

test('hori regression: empty cell must not mark regular ride row as summary', () => {
  const row = {
    'מספר ויזה': '342515',
    'קוד נסיעה': '1687155',
    'תאריך': '2/10/26',
    'מחלקה': '',
    'תאור': 'פיזור: נתבג - טרמינל 3 - ,הרצליה,',
    'סה"כ ללקוח-לפני מע"מ': '160'
  };

  assert.equal(isSummaryRow(row), false);
});

test('hori regression: should detect real summary row', () => {
  const summaryRow = {
    'מספר ויזה': '',
    'קוד נסיעה': '',
    'תאור': 'סה"כ נסיעות',
    'סה"כ ללקוח-לפני מע"מ': '213893'
  };

  assert.equal(isSummaryRow(summaryRow), true);
});

test('hori regression: keep 3 formerly dropped rides and drop only summary', () => {
  const fixtures = [
    { 'מספר ויזה': '342515', 'קוד נסיעה': '1687155', 'מחלקה': '', 'תאור': 'פיזור: נתבג - טרמינל 3 - ,הרצליה,', 'סה"כ ללקוח-לפני מע"מ': '160' },
    { 'מספר ויזה': '342525', 'קוד נסיעה': '1687160', 'מחלקה': '', 'תאור': 'פיזור: נתבג - טרמינל 3 - ,פתח תקווה,', 'סה"כ ללקוח-לפני מע"מ': '150' },
    { 'מספר ויזה': '342483', 'קוד נסיעה': '1687167', 'מחלקה': '', 'תאור': 'איסוף: גבעתיים, - נתבג - טרמינל 3', 'סה"כ ללקוח-לפני מע"מ': '120' },
    { 'מספר ויזה': '', 'קוד נסיעה': '', 'תאור': '', 'סה"כ ללקוח-לפני מע"מ': '213893' }
  ];

  const analyzed = fixtures.filter((row) => {
    const tripNumber = parseHoriTripNumber(row);
    const invalidTripNumber = tripNumber === null || Number.isNaN(tripNumber) || tripNumber === 0;
    if (invalidTripNumber) return false;
    if (isSummaryRow(row)) return false;
    return true;
  });

  assert.equal(analyzed.length, 3);
  assert.deepEqual(analyzed.map(r => parseHoriTripNumber(r)), [1687155, 1687160, 1687167]);
  const amount = analyzed.reduce((sum, r) => sum + Number(r['סה"כ ללקוח-לפני מע"מ'] || 0), 0);
  assert.equal(amount, 430);
});
