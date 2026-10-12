import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDepartmentBreakdown } from './departmentCalculator.js';

test('department breakdown applies whole-ride assignment to manual string ride ids without pids', () => {
  const manualRide = {
    rideId: 'MANUAL_gett_104610996',
    date: '2026-09-07',
    source: 'טרמינל 3',
    destination: 'Ha-Akhim Suleiman St, Rishon LeZion, Israel',
    price: 245.5,
    passengers: '',
    pids: []
  };

  const assignments = new Map([
    ['MANUAL_gett_104610996', 'FLOW']
  ]);

  const result = calculateDepartmentBreakdown([manualRide], new Map(), assignments);

  assert.equal(result.breakdown[0].departments.length, 1);
  assert.equal(result.breakdown[0].departments[0].department, 'FLOW');
  assert.equal(result.breakdown[0].departments[0].price, 245.5);
  assert.deepEqual(result.totals.map(t => t.department), ['FLOW']);
});
