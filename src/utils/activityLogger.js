/**
 * מערכת לוגים לפעולות על נסיעות
 */

// אחסון הלוגים בזיכרון (session only)
let activityLogs = [];

/**
 * הוספת פעולה ללוג
 * @param {string} type - סוג הפעולה: 'ride_removed', 'ride_added', 'price_updated'
 * @param {number|string} rideId - מזהה הנסיעה
 * @param {Object} rideData - שדות הנסיעה (מקור, יעד, תאריך, מחיר, נוסעים)
 * @param {Object} actionDetails - פרטי הפעולה (למחירים: מחיר ישן/חדש, להוספה: ספק, supplier: שם הספק)
 */
export function logActivity(type, rideId, rideData, actionDetails = {}) {
  const logEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    rideId,
    timestamp: Date.now(),
    rideData: {
      source: rideData?.source || '',
      destination: rideData?.destination || '',
      date: rideData?.date || '',
      price: rideData?.price || 0,
      passengers: rideData?.passengers || ''
    },
    actionDetails: {
      ...actionDetails,
      supplier: actionDetails?.supplier || rideData?.supplier || ''
    }
  };
  
  activityLogs.push(logEntry);
  
  // החזרת העותק המעודכן
  return [...activityLogs];
}

/**
 * קבלת כל הפעולות
 * @returns {Array} מערך של כל הפעולות, ממוין לפי תאריך (החדש ביותר ראשון)
 */
export function getAllActivities() {
  return [...activityLogs].sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * ניקוי הלוגים
 */
export function clearActivities() {
  activityLogs = [];
}

/**
 * קבלת מספר הפעולות
 * @returns {number} מספר הפעולות
 */
export function getActivityCount() {
  return activityLogs.length;
}
