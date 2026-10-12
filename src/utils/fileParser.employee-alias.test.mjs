import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEmployeesFile } from './fileParser.js';

test('employees parser indexes employees by passenger number alias', async () => {
  const csv = [
    '"_ID","שם פרטי","שם משפחה","מחלקה","מספר נוסע","אימייל (שם משתמש)"',
    '"12448","כלנית","אזולאי","FLOW","43589","43589"'
  ].join('\n');

  const { employees, employeeMap } = await parseEmployeesFile(csv);

  assert.equal(employees.length, 1);
  assert.equal(employeeMap.get(12448).department, 'FLOW');
  assert.equal(employeeMap.get(43589).employeeId, 12448);
  assert.equal(employeeMap.get('43589').department, 'FLOW');
});
