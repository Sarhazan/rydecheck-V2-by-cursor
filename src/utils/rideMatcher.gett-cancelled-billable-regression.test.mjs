import test from 'node:test';
import assert from 'node:assert/strict';
import { matchGettToRides } from './rideMatcher.js';

test('gett regression: cancelled Gett ride with a non-zero charge and exact Ride record must match', () => {
  const gettData = [{
    date: '2026-09-11',
    time: '05:55',
    orderNumber: 105102119,
    status: 'הנסיעה בוטלה',
    source: 'לוין אפשטיין 60 ; רחובות',
    destination: 'טרמינל 3 נתבג - טרמינל 3',
    passengers: 'מאוריסיו אייזיק',
    price: 53.53,
    rawData: { __EMPTY_3: 'הנסיעה בוטלה' }
  }];

  const rideData = [{
    rideId: 364431,
    date: '11/09/2026 05:55:00',
    source: 'לוין אפשטיין 60 , רחובות',
    destination: '|נתבג - טרמינל 3|',
    passengers: 'מאוריסיו אייזיק  43358;',
    price: 53.53,
    supplier: 'gett',
    supplierOrderNumber: '105102119',
    rawData: {
      היסטוריה: '|gettorderid=105102119|gettorderstatus=Cancelled|getttime=2026-09-11 05:55:00|gettprice=53.53 ILS|',
      אזורים: 'רחובות ;נתבג;'
    }
  }];

  const matches = matchGettToRides(gettData, rideData, null);
  const match = matches.find(result => result.supplierData?.orderNumber === 105102119);

  assert.equal(match?.status, 'matched');
  assert.equal(match?.ride?.rideId, 364431);
  assert.equal(match?.priceDifference, 0);
  assert.ok(!matches.some(result => result.status === 'missing_in_supplier' && result.ride?.rideId === 364431));
});
