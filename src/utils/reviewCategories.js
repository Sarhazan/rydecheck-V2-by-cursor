/**
 * נרמול טקסט נוסעים למצב "ריק".
 * שדות מסוימים מגיעים עם פלייסהולדרים כמו '-' או '--'.
 */
function isEmptyPassengerText(value) {
  if (value === null || value === undefined) return true;
  const normalized = String(value).trim();
  return normalized === '' || normalized === '-' || normalized === '--';
}

/**
 * נסיעה ללא נוסעים:
 * 1) אין PIDs ואין טקסט נוסעים
 * או
 * 2) קיים passengerCount מפורש = 0 וגם אין טקסט נוסעים
 *
 * הערה: בחלק מהקבצים קיימים PIDs טכניים בשדות היסטוריה/תחנות
 * גם כאשר בפועל "מס. נוסעים" הוא 0 (כמו מקרה 342269).
 */
export function isRideWithoutPassengers(ride = {}) {
  const hasPids = Array.isArray(ride.pids) && ride.pids.length > 0;
  const hasPassengersText = !isEmptyPassengerText(ride.passengers);

  const passengerCountRaw = ride.passengerCount;
  const hasExplicitPassengerCount = Number.isFinite(passengerCountRaw);
  const hasZeroPassengerCount = hasExplicitPassengerCount && passengerCountRaw === 0;

  if (hasZeroPassengerCount && !hasPassengersText) {
    return true;
  }

  return !hasPids && !hasPassengersText;
}
