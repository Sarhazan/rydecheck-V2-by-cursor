/**
 * קבועים הקשורים לרכיב גט
 * כל הקבועים במקום אחד לנוחות תחזוקה ועדכון
 */

/**
 * שמות הספק גט בקובץ הרייד
 * @type {string[]}
 */
export const GETT_SUPPLIER_NAMES = ['gett', 'גט', 'GETT'];

/**
 * מיפוי עמודות __EMPTY בקובץ Excel של גט
 * @type {Object<string, number>}
 */
export const GETT_EMPTY_COLUMN_MAPPING = {
  DATE_TIME: 0,      // __EMPTY: תאריך ושעה
  ORDER_DATE: 1,     // __EMPTY_1: תאריך הזמנה
  ORDER_NUMBER: 2,   // __EMPTY_2: מספר הזמנה
  SOURCE: 5,         // __EMPTY_5: מקור
  DESTINATION: 6,    // __EMPTY_6: יעד
  PRICE: 9,          // __EMPTY_9: מחיר
  PASSENGERS: 10     // __EMPTY_10: נוסעים
};

/**
 * שמות עמודות אפשריים בקובץ גט
 * @type {Object<string, string[]>}
 */
export const GETT_COLUMN_NAMES = {
  DATE: ['תאריך', 'date', 'Date', 'תאריך נסיעה'],
  TIME: ['שעה', 'time', 'Time', 'זמן'],
  SOURCE: ['מקור', 'מאת', 'from', 'From', 'מקום התחלה'],
  DESTINATION: ['יעד', 'אל', 'to', 'To', 'מקום סיום'],
  PASSENGERS: ['נוסעים', 'passengers', 'Passengers', 'נוסע'],
  PRICE: ['מחיר', 'price', 'Price', 'סכום', 'amount', 'מחיר כולל', 'סך הכל', 'מחיר סופי', 'סה"כ', 'מחיר לתשלום']
};

/**
 * סובלנות זמן להתאמה (בדקות)
 * הפרש זמן מקסימלי בין נסיעת גט לנסיעת רייד כדי שיחשבו תואמות
 * @type {number}
 */
export const GETT_TIME_TOLERANCE_MINUTES = 10;

/**
 * טווח חיפוש תאריכים (בימים)
 * מספר הימים לפני ואחרי תאריך הנסיעה לחיפוש נסיעות מועמדות
 * @type {number}
 */
export const GETT_DATE_SEARCH_RANGE_DAYS = 1; // יום אחד לפני ואחרי

/**
 * הפרש זמן מקסימלי לחיפוש (בדקות)
 * הפרש זמן מקסימלי לחיפוש נסיעות מועמדות (לפני בדיקה מדויקת)
 * @type {number}
 */
export const GETT_MAX_SEARCH_TIME_DIFF_MINUTES = 30;

/**
 * הפרש זמן מינימלי להתאמה מושלמת (בדקות)
 * אם הפרש הזמן קטן מזה, נפסיק לחפש התאמות נוספות
 * @type {number}
 */
export const GETT_PERFECT_MATCH_TIME_DIFF_MINUTES = 2;

