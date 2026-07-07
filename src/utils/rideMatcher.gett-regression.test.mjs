import test from 'node:test';
import assert from 'node:assert/strict';
import { matchGettToRides } from './rideMatcher.js';

test('gett regression: prefers exact pickup/passenger ride over nearby ride with same street words', () => {
  const gettData = [{
    date: '2026-06-08',
    time: '06:10',
    orderNumber: '94798626',
    source: 'דרך מנחם בגין 12; תל אביב',
    destination: 'טרמינל 3 נתבג - טרמינל 3',
    passengers: 'גלילי ** שקרון',
    price: 123.24
  }];

  const rides = [
    // הסדר כאן משחזר את סדר קובץ רייד בפועל: הנסיעה הנכונה מופיעה לפני נסיעה קרובה אחרת.
    {
      rideId: 350831,
      date: '08/06/2026 06:10:00',
      source: 'דרך מנחם בגין 12, תל אביב',
      destination: '|נתבג - טרמינל 3|',
      passengers: 'גלילי ** שקרון 90015;',
      pids: [],
      supplier: 'gett',
      price: 123.24
    },
    {
      rideId: 350828,
      date: '08/06/2026 06:10:00',
      source: 'מנחם בגין 1 ,יהוד',
      destination: '|נתבג - טרמינל 3|',
      passengers: 'אילונה זיו 90012;',
      pids: [],
      supplier: 'מוניות דוד חורי בעמ',
      price: 100
    }
  ];

  const matches = matchGettToRides(gettData, rides, new Map());
  const gettMatch = matches.find(match => match.supplierData?.orderNumber === '94798626');

  assert.equal(gettMatch?.status, 'matched');
  assert.equal(gettMatch?.ride?.rideId, 350831);
});
