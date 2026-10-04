import test from 'node:test';
import assert from 'node:assert/strict';
import { matchGettToRides } from './rideMatcher.js';

const ride367398 = {
  rideId: 367398,
  date: '19/09/2026 17:03:00',
  passengers: 'עידו מקסימוב 39862;',
  passengerCount: 1,
  pids: [791],
  source: 'תרצב 34, חולון',
  destination: '|נתבג - טרמינל 3|',
  price: 132,
  supplier: 'gett'
};

test('gett regression: cancelled fee row does not claim the ride before the completed order row', () => {
  const gettData = [
    {
      date: '2026-09-19',
      time: '17:30',
      orderNumber: '105884030',
      status: 'הנסיעה בוטלה',
      source: 'תרצ``ו 34 חולון תרצב 34; חולון',
      destination: 'טרמינל 3 נתבג - טרמינל 3',
      passengers: 'עידו מקסימוב',
      price: 29.99
    },
    {
      date: '2026-09-19',
      time: '17:01',
      orderNumber: '106062629',
      status: 'הנסיעה הסתיימה',
      source: 'תרצ``ו 34 חולון תרצב 34; חולון',
      destination: 'טרמינל 3 נתבג - טרמינל 3',
      passengers: 'עידו מקסימוב',
      price: 132
    }
  ];

  const matches = matchGettToRides(gettData, [ride367398], new Map());
  const cancelledMatch = matches.find(match => match.supplierData?.orderNumber === '105884030');
  const completedMatch = matches.find(match => match.supplierData?.orderNumber === '106062629');

  assert.equal(cancelledMatch?.status, 'missing_in_ride');
  assert.equal(cancelledMatch?.ride, null);
  assert.equal(completedMatch?.status, 'matched');
  assert.equal(completedMatch?.ride?.rideId, 367398);
});
